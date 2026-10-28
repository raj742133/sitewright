'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { readPalette, useReducedMotion, type Palette, type RGB } from './_t2';

/* Shared kit for the bg-a backgrounds: a Canvas2D host (DPR cap, resize, theme palette, parent-level pointer,
   off-screen / hidden-tab pause, reduced-motion still frame, cleanup) plus a demo frame and small colour helpers. */

export type { Palette, RGB };

export interface Ptr {
  /** CSS px relative to the background, valid when `inside` */ x: number; y: number;
  /** px per second, smoothed */ vx: number; vy: number;
  inside: boolean; down: boolean;
}
export interface Env2D {
  ctx: CanvasRenderingContext2D;
  /** CSS pixel size */ w: number; h: number; dpr: number;
  pal: Palette; dark: boolean; reduced: boolean; ptr: Ptr;
}
export interface Sketch {
  /** Draw one frame. `t` is seconds (a fixed time under reduced motion, where dt is 0). */
  frame(t: number, dt: number, e: Env2D): void;
  resize?(e: Env2D): void;
  dispose?(): void;
}
export interface Bg2DOpts {
  /** Max device pixel ratio (default 1.5). */ dpr?: number;
  /** Frame cap (default 60). */ fps?: number;
  /** Listen for the pointer on the parent element (default false). */ pointer?: boolean;
  /** Time shown for the still frame under reduced motion. */ stillT?: number;
}

export const STILL_T = 6.5;
export const rgba = (c: RGB, a: number) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
export const mixc = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const lum = (c: RGB) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
/** Deterministic PRNG (mulberry32) so first render and static frames never use Math.random. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** The darker and the lighter of surface and ink, so "deep" and "bright" tones hold in both themes. */
export function toneSet(p: Palette): { deep: RGB; pale: RGB } {
  return lum(p.surface) < lum(p.ink) ? { deep: p.surface, pale: p.ink } : { deep: p.ink, pale: p.surface };
}

/**
 * Canvas2D background host. `make` runs once per canvas (and again when reduced-motion flips) and returns the sketch.
 * Attach `wrapRef` to the positioned wrapper and `canvasRef` to the canvas; `ready` is false when 2D is unavailable.
 */
export function useBg2D(make: (e: Env2D) => Sketch, opts: Bg2DOpts = {}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState<'init' | 'on' | 'off'>('init');
  const reduced = useReducedMotion();
  const makeRef = useRef(make);
  makeRef.current = make;
  const optRef = useRef(opts);
  optRef.current = opts;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const o = optRef.current;
    let ctx: CanvasRenderingContext2D | null = null;
    try { ctx = canvas.getContext('2d'); } catch { ctx = null; }
    if (!ctx) { setReady('off'); return; }
    const pal0 = readPalette(wrap);
    const env: Env2D = {
      ctx, w: 1, h: 1, dpr: 1, pal: pal0, dark: lum(pal0.surface) < 0.45, reduced,
      ptr: { x: 0, y: 0, vx: 0, vy: 0, inside: false, down: false },
    };
    let sketch: Sketch | null = null;
    let raf = 0, still = 0, last = 0, t0 = 0, onScreen = true, dead = false, shown = false;
    const minGap = 1000 / (o.fps ?? 60) - 3;

    const draw = (t: number, dt: number) => {
      if (!sketch || dead) return;
      try {
        env.ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0);
        sketch.frame(t, dt, env);
        if (!shown) { shown = true; setReady('on'); }
      } catch {
        stop();
        sketch = null;
        setReady('off');
      }
    };
    const paintStill = () => {
      if (still || dead) return;
      still = requestAnimationFrame(() => { still = 0; if (!raf) draw(env.reduced ? (o.stillT ?? STILL_T) : (performance.now() - t0) / 1000 + 1, 0); });
    };
    const want = () => !env.reduced && onScreen && !document.hidden && !!sketch && !dead;
    const loop = (now: number) => {
      raf = 0;
      if (!want()) return;
      if (now - last >= minGap) {
        const dt = Math.min(0.05, (now - (last || now)) / 1000);
        last = now;
        const p = env.ptr;
        const k = Math.min(1, dt * 10);
        p.vx *= 1 - k; p.vy *= 1 - k;
        draw((now - t0) / 1000 + 1, dt);
      }
      raf = requestAnimationFrame(loop);
    };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const sync = () => { if (want()) { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } } else { stop(); paintStill(); } };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      env.w = Math.max(1, r.width); env.h = Math.max(1, r.height);
      let dpr = Math.min(window.devicePixelRatio || 1, o.dpr ?? 1.5);
      if (env.w * env.h * dpr * dpr > 2.4e6) dpr = Math.sqrt(2.4e6 / (env.w * env.h));
      env.dpr = dpr;
      const pw = Math.max(1, Math.round(env.w * dpr)), ph = Math.max(1, Math.round(env.h * dpr));
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      env.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      try { sketch?.resize?.(env); } catch { /* ignore */ }
      if (!raf) paintStill();
    };

    try { sketch = makeRef.current(env); } catch { setReady('off'); return; }
    t0 = performance.now();
    resize();
    sync();

    const onTheme = () => { env.pal = readPalette(wrap); env.dark = lum(env.pal.surface) < 0.45; if (!raf) paintStill(); };
    const mo = new MutationObserver(() => { onTheme(); window.setTimeout(() => { if (!dead) onTheme(); }, 150); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    const mqD = window.matchMedia('(prefers-color-scheme: dark)');
    mqD.addEventListener('change', onTheme);
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((es) => { onScreen = es.some((e) => e.isIntersecting); sync(); });
    io?.observe(wrap);
    const onVis = () => sync();
    document.addEventListener('visibilitychange', onVis);

    const host: HTMLElement = wrap.parentElement ?? wrap;
    const place = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top, p = env.ptr;
      if (p.inside) { p.vx += (x - p.x) * 8; p.vy += (y - p.y) * 8; }
      p.x = x; p.y = y; p.inside = true;
    };
    const onMove = (e: PointerEvent) => { if (!env.reduced) place(e); };
    const onDown = (e: PointerEvent) => { if (!env.reduced) { place(e); env.ptr.down = true; } };
    const onUp = () => { env.ptr.down = false; };
    const onLeave = () => { env.ptr.inside = false; env.ptr.down = false; };
    if (o.pointer) {
      host.addEventListener('pointermove', onMove, { passive: true });
      host.addEventListener('pointerdown', onDown, { passive: true });
      host.addEventListener('pointerup', onUp);
      host.addEventListener('pointercancel', onLeave);
      host.addEventListener('pointerleave', onLeave);
    }
    return () => {
      dead = true;
      stop();
      if (still) cancelAnimationFrame(still);
      mo.disconnect(); ro.disconnect(); io?.disconnect();
      mqD.removeEventListener('change', onTheme);
      document.removeEventListener('visibilitychange', onVis);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onLeave);
      host.removeEventListener('pointerleave', onLeave);
      try { sketch?.dispose?.(); } catch { /* ignore */ }
      sketch = null;
    };
  }, [reduced]);

  return { wrapRef, canvasRef, ready };
}

/** Demo frame: the background fills it, a small heading card sits on top (solid surface for guaranteed contrast). */
export function BgDemo({ children, title, note }: { children: ReactNode; title: string; note?: string }) {
  const frame: CSSProperties = { position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)', background: 'var(--surface, #fff)' };
  const card: CSSProperties = {
    position: 'relative', display: 'grid', placeItems: 'center', height: '100%', minHeight: 150, padding: 16, boxSizing: 'border-box',
  };
  const box: CSSProperties = {
    maxWidth: '86%', padding: '10px 16px', textAlign: 'center', borderRadius: 'var(--radius, 12px)',
    background: 'color-mix(in srgb, var(--surface, #fff) 92%, transparent)', color: 'var(--ink, #111)',
    border: '1px solid var(--line, rgba(0,0,0,.12))', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
  };
  return (
    <div style={frame}>
      {children}
      <div style={card}>
        <div style={box}>
          <div style={{ font: '700 16px/1.25 var(--font-body, system-ui)' }}>{title}</div>
          {note ? <div style={{ font: '400 12px/1.4 var(--font-body, system-ui)', color: 'var(--ink, #111)', opacity: 0.85, marginTop: 2 }}>{note}</div> : null}
        </div>
      </div>
    </div>
  );
}
