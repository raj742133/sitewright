'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { readPalette, type Palette } from './_t2';

/* Shared Canvas2D loop for the bg-b backgrounds: DPR cap, pixel budget, pause off-screen / hidden tab,
   theme palette, smoothed pointer (listened on the parent, with an idle wander for touch), reduced-motion still frame. */

export const STILL_T = 6.5;

export interface Frame {
  ctx: CanvasRenderingContext2D;
  /** CSS pixel size */ w: number; h: number; dpr: number;
  /** seconds (a fixed value for the still frame) and delta */ t: number; dt: number;
  pal: Palette;
  /** smoothed pointer 0..1, y down; wanders on its own when the pointer is away or the device is touch */ px: number; py: number;
  /** 0..1, eased: 1 while a mouse pointer is over the parent */ hover: number;
  /** pointer speed in 0..1 units per second, eased */ speed: number;
  reduced: boolean; coarse: boolean;
}
export interface CanvasBgOpts {
  /** React to the pointer (listened on the parent element). Default true. */ pointer?: boolean;
  /** frame cap, default 60 */ fps?: number;
  /** max DPR, default 2 */ dpr?: number;
  /** backing-store pixel budget, default 2.4M */ maxPixels?: number;
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rgba = (c: [number, number, number], a: number) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
export const mixc = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** Relative luminance 0..1 */
export const lum = (c: [number, number, number]) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
/** Deterministic PRNG (mulberry32): never Math.random during render/SSR. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * `draw` runs every frame (or once, with reduced motion) with a fresh Frame; it should paint the whole canvas.
 * `setup` (optional) runs when the size changes. Returns refs for the wrapper div and the canvas, and `status`
 * ('init' | 'on' | 'off'; 'off' means no 2D context: the CSS fallback stays visible).
 */
export function useCanvasBg(draw: (f: Frame) => void, opts: CanvasBgOpts = {}, setup?: (w: number, h: number) => void) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'init' | 'on' | 'off'>('init');
  const drawRef = useRef(draw); drawRef.current = draw;
  const setupRef = useRef(setup); setupRef.current = setup;
  const optsRef = useRef(opts); optsRef.current = opts;

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const o = optsRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) { setStatus('off'); return; }
    const mqR = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqC = window.matchMedia('(pointer: coarse)');
    const mqD = window.matchMedia('(prefers-color-scheme: dark)');
    const f: Frame = { ctx, w: 1, h: 1, dpr: 1, t: STILL_T, dt: 0, pal: readPalette(wrap), px: 0.5, py: 0.5, hover: 0, speed: 0, reduced: mqR.matches, coarse: mqC.matches };
    const tgt = { x: 0.5, y: 0.5, on: false, lx: 0.5, ly: 0.5, v: 0 };
    let raf = 0, still = 0, last = 0, t0 = performance.now(), onScreen = true, dead = false, shown = false;
    const minGap = 1000 / (o.fps ?? 60) - 3;

    const wander = (t: number) => ({ x: 0.5 + Math.sin(t * 0.37) * 0.28 + Math.sin(t * 0.91 + 1) * 0.08, y: 0.5 + Math.cos(t * 0.29 + 0.6) * 0.24 + Math.sin(t * 0.63) * 0.07 });
    const paint = (t: number, dt: number) => {
      if (dead) return;
      const live = !f.reduced;
      const usePtr = o.pointer !== false && tgt.on && !f.coarse && live;
      const w = usePtr ? { x: tgt.x, y: tgt.y } : wander(t);
      const k = live ? 1 - Math.exp(-dt * (usePtr ? 9 : 2.2)) : 1;
      if (dt === 0 && !live) { f.px = w.x; f.py = w.y; } else { f.px += (w.x - f.px) * k; f.py += (w.y - f.py) * k; }
      f.hover += ((usePtr ? 1 : 0) - f.hover) * (live ? 1 - Math.exp(-dt * 5) : 0);
      f.speed += (clamp(tgt.v, 0, 3) - f.speed) * (live ? 1 - Math.exp(-dt * 6) : 0);
      tgt.v *= Math.exp(-dt * 4);
      f.t = t; f.dt = dt;
      ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
      try { drawRef.current(f); } catch { /* a draw bug must not take the page down */ }
      if (!shown) { shown = true; setStatus('on'); }
    };
    const want = () => !f.reduced && onScreen && !document.hidden && !dead;
    const loop = (now: number) => {
      raf = 0;
      if (!want()) return;
      if (now - last >= minGap) {
        const dt = Math.min(0.08, (now - (last || now)) / 1000);
        last = now;
        paint((now - t0) / 1000 + STILL_T, dt);
      }
      raf = requestAnimationFrame(loop);
    };
    const redraw = () => {
      if (still || dead) return;
      still = requestAnimationFrame(() => { still = 0; if (f.reduced) paint(STILL_T, 0); else if (!raf) paint((performance.now() - t0) / 1000 + STILL_T, 0.016); });
    };
    const sync = () => {
      if (want()) { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
      else { if (raf) cancelAnimationFrame(raf); raf = 0; if (f.reduced) redraw(); }
    };
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const w = Math.max(1, r.width), h = Math.max(1, r.height);
      let dpr = Math.min(window.devicePixelRatio || 1, o.dpr ?? 2);
      const budget = o.maxPixels ?? 2.4e6;
      if (w * h * dpr * dpr > budget) dpr = Math.sqrt(budget / (w * h));
      f.w = w; f.h = h; f.dpr = dpr;
      const pw = Math.max(1, Math.round(w * dpr)), ph = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      setupRef.current?.(w, h);
      redraw();
    };
    const onTheme = () => { f.pal = readPalette(wrap); redraw(); window.setTimeout(() => { if (!dead) { f.pal = readPalette(wrap); redraw(); } }, 160); };
    const onMq = () => { f.reduced = mqR.matches; f.coarse = mqC.matches; f.pal = readPalette(wrap); sync(); redraw(); };
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    mqR.addEventListener('change', onMq); mqC.addEventListener('change', onMq); mqD.addEventListener('change', onTheme);
    const ro = new ResizeObserver(resize); ro.observe(wrap);
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((es) => { onScreen = es.some((e) => e.isIntersecting); sync(); });
    io?.observe(wrap);
    const onVis = () => sync();
    document.addEventListener('visibilitychange', onVis);

    const host = wrap.parentElement;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = wrap.getBoundingClientRect();
      const x = clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1), y = clamp((e.clientY - r.top) / Math.max(1, r.height), 0, 1);
      tgt.v = Math.max(tgt.v, Math.hypot(x - tgt.lx, y - tgt.ly) * 30);
      tgt.lx = x; tgt.ly = y; tgt.x = x; tgt.y = y; tgt.on = true;
    };
    const onLeave = () => { tgt.on = false; };
    if (o.pointer !== false && host) { host.addEventListener('pointermove', onMove, { passive: true }); host.addEventListener('pointerleave', onLeave); }

    resize();
    sync();
    redraw();
    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      if (still) cancelAnimationFrame(still);
      mo.disconnect(); ro.disconnect(); io?.disconnect();
      mqR.removeEventListener('change', onMq); mqC.removeEventListener('change', onMq); mqD.removeEventListener('change', onTheme);
      document.removeEventListener('visibilitychange', onVis);
      host?.removeEventListener('pointermove', onMove); host?.removeEventListener('pointerleave', onLeave);
    };
  }, []);
  return { wrapRef, canvasRef, status };
}

/** Shared demo frame: the background fills it, a solid-enough panel carries text at >= 4.5:1. */
export function DemoShell({ bg, title, sub, children, align = 'center' }: { bg: ReactNode; title: string; sub?: string; children?: ReactNode; align?: 'center' | 'start' }) {
  const wrap: CSSProperties = { position: 'relative', width: '100%', height: '100%', minHeight: 170, overflow: 'hidden', borderRadius: 'var(--radius, 12px)', background: 'var(--surface, #fff)', display: 'grid', placeItems: align === 'center' ? 'center' : 'end start', padding: 12, boxSizing: 'border-box' };
  const panel: CSSProperties = { position: 'relative', maxWidth: 'min(86%, 360px)', padding: '10px 14px', borderRadius: 'calc(var(--radius, 12px) * .8)', background: 'color-mix(in srgb, var(--surface, #fff) 88%, transparent)', border: '1px solid var(--line, rgba(128,128,128,.3))', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: 'var(--ink, #111)', fontFamily: 'var(--font-body, system-ui)', textAlign: align === 'center' ? 'center' : 'left', pointerEvents: 'none' };
  return (
    <div style={wrap}>
      {bg}
      <div style={panel}>
        <div style={{ font: '700 15px/1.25 var(--font-body, system-ui)', letterSpacing: '-.01em' }}>{title}</div>
        {sub ? <div style={{ font: '400 12px/1.4 var(--font-body, system-ui)', marginTop: 2, color: 'var(--ink, #111)', opacity: 0.86 }}>{sub}</div> : null}
        {children}
      </div>
    </div>
  );
}
