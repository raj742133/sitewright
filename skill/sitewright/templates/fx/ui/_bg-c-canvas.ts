'use client';
import { useEffect, useRef } from 'react';
import { readPalette, watchLive, type Palette } from './_t2';

/* Shared Canvas2D runtime for the bg-c backgrounds: DPR-capped sizing, theme palette, one rAF loop that pauses
   off-screen / in a hidden tab, a still frame under prefers-reduced-motion, and pointer input read from the parent. */

export interface BgPointer { x: number; y: number; inside: boolean; down: boolean; taps: { x: number; y: number }[] }
export interface Frame {
  ctx: CanvasRenderingContext2D;
  /** CSS pixel size */ w: number; h: number; dpr: number;
  /** seconds since start (starts at a fixed offset so the still frame is deterministic) */ t: number;
  /** seconds since the previous frame (0 for a repaint) */ dt: number;
  pal: Palette; dark: boolean; ptr: BgPointer; reduced: boolean; coarse: boolean;
}
export interface Painter { draw(f: Frame): void; resize?(f: Frame): void }
export interface CanvasOpts { fps?: number; dpr?: number; pointer?: boolean; warm?: number }

/** Deterministic PRNG (mulberry32): same seed, same sequence, so SSR and still frames never differ. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const STILL_T = 3.2;

function isDark(p: Palette) { return (0.2126 * p.surface[0] + 0.7152 * p.surface[1] + 0.0722 * p.surface[2]) / 255 < 0.45; }

/**
 * Attach `wrapRef` to the positioned wrapper and `canvasRef` to its canvas. `setup` runs once after the first
 * measurement and returns the painter; the canvas is cleared before every `draw`.
 */
export function useCanvas2D(setup: (f: Frame) => Painter, opts: CanvasOpts = {}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;
  const optRef = useRef(opts);
  optRef.current = opts;

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!wrap || !canvas || !ctx) return;
    const o = optRef.current;
    const mqR = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqC = window.matchMedia('(pointer: coarse)');
    const pal = readPalette(wrap);
    const f: Frame = {
      ctx, w: 1, h: 1, dpr: 1, t: STILL_T, dt: 0, pal, dark: isDark(pal),
      ptr: { x: 0, y: 0, inside: false, down: false, taps: [] }, reduced: mqR.matches, coarse: mqC.matches,
    };
    let painter: Painter | null = null;
    let raf = 0, last = 0, live = true, dead = false;
    const gap = 1000 / (o.fps ?? 60) - 3;

    const measure = () => {
      const r = wrap.getBoundingClientRect();
      f.w = Math.max(1, r.width); f.h = Math.max(1, r.height);
      f.dpr = Math.min(window.devicePixelRatio || 1, o.dpr ?? 2);
      const pw = Math.round(f.w * f.dpr), ph = Math.round(f.h * f.dpr);
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    };
    const paint = (dt: number) => {
      if (!painter || dead) return;
      f.dt = dt; f.t += dt;
      ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
      ctx.clearRect(0, 0, f.w, f.h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      painter.draw(f);
      f.ptr.taps.length = 0;
    };
    const loop = (now: number) => {
      raf = 0;
      if (!running()) return;
      if (now - last >= gap) { paint(Math.min(0.06, (now - (last || now)) / 1000)); last = now; }
      raf = requestAnimationFrame(loop);
    };
    const running = () => live && !f.reduced && !document.hidden && !dead;
    const sync = () => {
      if (running()) { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    const still = () => {
      /* reduced motion: run the simulation forward a little, then hold that frame */
      const n = o.warm ?? 90;
      for (let i = 0; i < n; i++) paint(1 / 30);
    };

    measure();
    painter = setupRef.current(f);
    if (f.reduced) still(); else paint(0);
    sync();

    const ro = new ResizeObserver(() => { measure(); painter?.resize?.(f); paint(0); });
    ro.observe(wrap);
    const offLive = watchLive(wrap, (v) => { live = v; sync(); });
    const onVis = () => sync();
    document.addEventListener('visibilitychange', onVis);
    const recolor = () => { f.pal = readPalette(wrap); f.dark = isDark(f.pal); paint(0); };
    const mo = new MutationObserver(() => { recolor(); window.setTimeout(() => { if (!dead) recolor(); }, 150); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    const mqD = window.matchMedia('(prefers-color-scheme: dark)');
    const onMq = () => {
      const was = f.reduced;
      f.reduced = mqR.matches; f.coarse = mqC.matches;
      if (f.reduced && !was) still();
      sync(); recolor();
    };
    mqR.addEventListener('change', onMq); mqC.addEventListener('change', onMq); mqD.addEventListener('change', recolor);

    const host: HTMLElement = wrap.parentElement ?? wrap;
    const rel = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      if (f.reduced || e.pointerType === 'touch') return;
      const p = rel(e);
      f.ptr.x = p.x; f.ptr.y = p.y; f.ptr.inside = true;
    };
    const onDown = (e: PointerEvent) => {
      if (f.reduced) return;
      const p = rel(e);
      f.ptr.down = true;
      if (e.pointerType !== 'touch') { f.ptr.x = p.x; f.ptr.y = p.y; f.ptr.inside = true; }
      f.ptr.taps.push(p);
      if (f.ptr.taps.length > 4) f.ptr.taps.shift();
    };
    const onUp = () => { f.ptr.down = false; };
    const onLeave = () => { f.ptr.inside = false; f.ptr.down = false; };
    if (o.pointer !== false) {
      host.addEventListener('pointermove', onMove, { passive: true });
      host.addEventListener('pointerdown', onDown, { passive: true });
      host.addEventListener('pointerup', onUp, { passive: true });
      host.addEventListener('pointercancel', onUp, { passive: true });
      host.addEventListener('pointerleave', onLeave);
    }

    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect(); mo.disconnect(); offLive();
      document.removeEventListener('visibilitychange', onVis);
      mqR.removeEventListener('change', onMq); mqC.removeEventListener('change', onMq); mqD.removeEventListener('change', recolor);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onUp);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return { wrapRef, canvasRef };
}
