'use client';
import { useCallback, useEffect, useRef } from 'react';
import { readPalette, rgba, mix, type Palette, type RGB } from './_t2';

/* Shared Canvas 2D driver for the motion-gl package: one rAF loop, DPR cap, resize, off-screen / hidden-tab pause,
   theme palette, window pointer relative to the wrapper, a single still frame under reduced motion. */

export type { Palette, RGB };
export { rgba, mix };

export interface Ptr { x: number; y: number; inside: boolean; down: boolean; moved: boolean; taps: { x: number; y: number }[] }
export interface Frame {
  ctx: CanvasRenderingContext2D;
  /** CSS pixel size of the wrapper (the canvas may extend `pad` px beyond it; 0,0 is the wrapper's top-left) */
  w: number; h: number; dpr: number;
  /** seconds since start (a fixed value for the still frame), and seconds since the previous frame */
  t: number; dt: number;
  pal: Palette; ptr: Ptr; reduced: boolean; coarse: boolean;
  /** true on the first frame after mount or resize */
  fresh: boolean;
}
export interface Canvas2DOpts {
  /** pixels the canvas extends past the wrapper on every side (default 0) */ pad?: number;
  /** max frames per second (default 60) */ fps?: number;
  /** track the pointer (default true) */ pointer?: boolean;
}
export const STILL_T = 3.7;

/** Draw callback runs every frame while on screen; with reduced motion it runs once (and on resize / theme change / `redraw()`). */
export function useCanvas2D(draw: (f: Frame) => void, opts: Canvas2DOpts = {}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const optRef = useRef(opts);
  optRef.current = opts;
  const redrawRef = useRef<() => void>(() => {});
  const redraw = useCallback(() => redrawRef.current(), []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pad = optRef.current.pad ?? 0;
    const gap = 1000 / (optRef.current.fps ?? 60) - 3;
    const mqR = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqC = window.matchMedia('(pointer: coarse)');
    const ptr: Ptr = { x: 0, y: 0, inside: false, down: false, moved: false, taps: [] };
    const f: Frame = { ctx, w: 1, h: 1, dpr: 1, t: 0, dt: 0, pal: readPalette(wrap), ptr, reduced: mqR.matches, coarse: mqC.matches, fresh: true };
    let raf = 0, still = 0, last = 0, t0 = 0, onScreen = true, dead = false;

    const frame = (t: number, dt: number) => {
      f.t = t; f.dt = dt;
      ctx.setTransform(f.dpr, 0, 0, f.dpr, pad * f.dpr, pad * f.dpr);
      ctx.clearRect(-pad, -pad, f.w + pad * 2, f.h + pad * 2);
      try { drawRef.current(f); } catch { /* a draw error must not kill the page */ }
      f.fresh = false;
      ptr.moved = false;
      ptr.taps.length = 0;
    };
    const want = () => !f.reduced && onScreen && !document.hidden && !dead;
    const loop = (now: number) => {
      raf = 0;
      if (!want()) return;
      if (now - last >= gap) {
        const dt = Math.min(0.05, (now - (last || now)) / 1000);
        last = now;
        frame((now - t0) / 1000 + STILL_T, dt);
      }
      raf = requestAnimationFrame(loop);
    };
    const sync = () => {
      if (want()) { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
      else { if (raf) cancelAnimationFrame(raf); raf = 0; if (f.reduced) paintStill(); }
    };
    function paintStill() {
      if (still || dead) return;
      still = requestAnimationFrame(() => {
        still = 0;
        if (dead) return;
        if (f.reduced) frame(STILL_T, 0);
        else if (!raf) frame((performance.now() - t0) / 1000 + STILL_T, 0);
      });
    }
    redrawRef.current = paintStill;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      f.w = Math.max(1, r.width); f.h = Math.max(1, r.height);
      f.dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.round((f.w + pad * 2) * f.dpr), ph = Math.round((f.h + pad * 2) * f.dpr);
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      f.fresh = true;
      paintStill();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((es) => { onScreen = es.some((e) => e.isIntersecting); sync(); });
    io?.observe(wrap);
    const onVis = () => sync();
    document.addEventListener('visibilitychange', onVis);
    const onTheme = () => { f.pal = readPalette(wrap); paintStill(); };
    const mo = new MutationObserver(() => { onTheme(); window.setTimeout(() => { if (!dead) onTheme(); }, 150); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    const onMq = () => { f.reduced = mqR.matches; f.coarse = mqC.matches; f.pal = readPalette(wrap); sync(); paintStill(); };
    mqR.addEventListener('change', onMq); mqC.addEventListener('change', onMq);

    const place = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
      ptr.inside = ptr.x >= 0 && ptr.y >= 0 && ptr.x <= r.width && ptr.y <= r.height;
    };
    const onMove = (e: PointerEvent) => { if (f.reduced) return; place(e); ptr.moved = true; };
    const onDown = (e: PointerEvent) => {
      if (f.reduced) return;
      place(e);
      if (ptr.inside) { ptr.down = true; ptr.taps.push({ x: ptr.x, y: ptr.y }); if (ptr.taps.length > 6) ptr.taps.shift(); }
    };
    const onUp = () => { ptr.down = false; };
    const onLeave = () => { ptr.inside = false; };
    if (optRef.current.pointer !== false) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerdown', onDown, { passive: true });
      window.addEventListener('pointerup', onUp, { passive: true });
      window.addEventListener('pointercancel', onUp, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }
    t0 = performance.now();
    resize();
    sync();
    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      if (still) cancelAnimationFrame(still);
      redrawRef.current = () => {};
      ro.disconnect(); io?.disconnect(); mo.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      mqR.removeEventListener('change', onMq); mqC.removeEventListener('change', onMq);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return { wrapRef, canvasRef, redraw };
}

/* ---------- deterministic noise (no Math.random) ---------- */
function h1(n: number) { let x = (n | 0) * 374761393 + 668265263; x = (x ^ (x >>> 13)) * 1274126177; return ((x ^ (x >>> 16)) >>> 0) / 4294967295; }
/** Smooth 1D value noise in -1..1. */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return (h1(i + seed * 7919) * (1 - u) + h1(i + 1 + seed * 7919) * u) * 2 - 1;
}
/** Smooth 2D value noise in -1..1. */
export function noise2(x: number, y: number, seed = 0): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const k = seed * 7919;
  const a = h1(ix + iy * 57 + k), b = h1(ix + 1 + iy * 57 + k), c = h1(ix + (iy + 1) * 57 + k), d = h1(ix + 1 + (iy + 1) * 57 + k);
  return (a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy) * 2 - 1;
}
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Deterministic pseudo-random 0..1 from an integer. */
export const rnd = (n: number) => h1(n);
