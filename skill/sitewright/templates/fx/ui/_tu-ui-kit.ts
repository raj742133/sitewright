'use client';
import { useCallback, useEffect, useRef } from 'react';
import { readPalette, type Palette } from './_t2';

/* Shared by the tu-ui batch: a Canvas 2D loop hook (DPR cap, resize, theme palette, pointer, visibility pause, reduced-motion single frame) and tiny maths helpers. */

export interface CanvasEnv {
  ctx: CanvasRenderingContext2D;
  /** CSS pixel size */ w: number; h: number; dpr: number;
  /** seconds since mount (+ a fixed offset so the static frame is a pleasant pose) and frame delta */ t: number; dt: number;
  pal: Palette; reduced: boolean; coarse: boolean;
  /** pointer relative to the canvas, 0..1 (y down); only updated for fine pointers */ ptr: { x: number; y: number; inside: boolean };
}
export interface Canvas2DOpts {
  /** keep a rAF loop running (default true); false = paint on resize / theme change / every render only */ animate?: boolean;
  /** time used for the single reduced-motion frame */ staticT?: number;
  /** max device pixel ratio (default 2) */ dpr?: number;
  /** clear the canvas before each frame (default true) */ clear?: boolean;
}

export function useCanvas2D(draw: (env: CanvasEnv) => void, opts: Canvas2DOpts = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  const optRef = useRef(opts);
  drawRef.current = draw;
  optRef.current = opts;
  const inv = useRef<() => void>(() => {});
  const invalidate = useCallback(() => inv.current(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const mqR = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqC = window.matchMedia('(pointer: coarse)');
    const env: CanvasEnv = { ctx, w: 1, h: 1, dpr: 1, t: 0, dt: 0, pal: readPalette(canvas), reduced: mqR.matches, coarse: mqC.matches, ptr: { x: 0.5, y: 0.5, inside: false } };
    let raf = 0, still = 0, last = 0, onScreen = true, dead = false;
    const t0 = performance.now();
    const off = () => optRef.current.staticT ?? 3;

    const paint = (t: number, dt: number) => {
      if (dead || env.w < 1) return;
      env.t = t; env.dt = dt;
      ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0);
      if (optRef.current.clear !== false) ctx.clearRect(0, 0, env.w, env.h);
      try { drawRef.current(env); } catch { /* a bad frame must not kill the page */ }
    };
    const animating = () => optRef.current.animate !== false && !env.reduced;
    const want = () => animating() && onScreen && !document.hidden && !dead;
    const loop = (now: number) => {
      raf = 0;
      if (!want()) return;
      const dt = Math.min(0.1, (now - (last || now)) / 1000);
      last = now;
      paint((now - t0) / 1000 + off(), dt);
      raf = requestAnimationFrame(loop);
    };
    const sync = () => {
      if (want()) { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
      else { if (raf) cancelAnimationFrame(raf); raf = 0; invalidate2(); }
    };
    function invalidate2() {
      if (raf || still || dead) return;
      still = requestAnimationFrame(() => { still = 0; paint(env.reduced ? off() : (performance.now() - t0) / 1000 + off(), 0); });
    }
    inv.current = invalidate2;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, r.width), h = Math.max(1, r.height);
      const dpr = Math.min(window.devicePixelRatio || 1, optRef.current.dpr ?? 2);
      env.w = w; env.h = h; env.dpr = dpr;
      const pw = Math.max(1, Math.round(w * dpr)), ph = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      invalidate2();
    };
    const onTheme = () => { env.pal = readPalette(canvas); invalidate2(); window.setTimeout(() => { if (!dead) { env.pal = readPalette(canvas); invalidate2(); } }, 150); };
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    const onMq = () => { env.reduced = mqR.matches; env.coarse = mqC.matches; env.pal = readPalette(canvas); sync(); };
    mqR.addEventListener('change', onMq); mqC.addEventListener('change', onMq);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((es) => { onScreen = es.some((e) => e.isIntersecting); sync(); });
    io?.observe(canvas);
    const onVis = () => sync();
    document.addEventListener('visibilitychange', onVis);
    const onMove = (e: PointerEvent) => {
      if (env.coarse || e.pointerType === 'touch') return;
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / Math.max(1, r.width), y = (e.clientY - r.top) / Math.max(1, r.height);
      env.ptr.x = x; env.ptr.y = y; env.ptr.inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      if (env.reduced && env.ptr.inside) invalidate2();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    resize();
    sync();

    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      if (still) cancelAnimationFrame(still);
      inv.current = () => {};
      mo.disconnect(); ro.disconnect(); io?.disconnect();
      mqR.removeEventListener('change', onMq); mqC.removeEventListener('change', onMq);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
    };
  }, [invalidate]);

  /* repaint after every render so prop changes show up while the loop is stopped (reduced motion / off-screen) */
  useEffect(() => { inv.current(); });
  return { canvasRef, invalidate };
}

/** Small deterministic PRNG (mulberry32): same seed, same sequence, so first paint and the static frame never differ between runs. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** Ease `cur` toward `target`; snaps when dt is 0 (reduced-motion static frame) */
export const damp = (cur: number, target: number, dt: number, rate = 8) => (dt <= 0 ? target : cur + (target - cur) * Math.min(1, dt * rate));
