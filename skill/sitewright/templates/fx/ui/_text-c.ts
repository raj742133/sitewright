'use client';
import { useEffect, useRef, type RefObject } from 'react';
import { clampDpr, readPalette, watchLive, watchPalette, type Palette } from './_t2';

export { useReducedMotion, useCoarsePointer, rgba, mix, watchLive, readPalette, watchPalette, type Palette, type RGB } from './_t2';

/* Shared helpers for the text-c batch: a pointer "probe" loop for DOM text effects, a Canvas2D loop with DPR/visibility/palette handling, and a seeded RNG. */

/** Small deterministic random generator (no Math.random in render paths). Returns values in [0, 1). */
export function seeded(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => { const k = clamp(t, 0, 1); return k * k * (3 - 2 * k); };

/** A static time (seconds) used for the still frame under reduced motion. */
export const STILL_T = 3.2;

/**
 * Runs `apply(x, y, level, t)` every frame with a smoothed probe position in element-local pixels.
 * The probe follows the pointer (level 0.6, or 1 while pressed) and sweeps by itself when no pointer is over the element (touch / idle).
 * Under reduced motion it calls `apply` once with a fixed probe, and again on resize.
 */
export function useProbeLoop(
  ref: RefObject<HTMLElement | null>,
  apply: (x: number, y: number, level: number, t: number) => void,
  opt: { reduced: boolean; onLayout?: () => void },
) {
  const ap = useRef(apply);
  const lay = useRef(opt.onLayout);
  useEffect(() => { ap.current = apply; lay.current = opt.onLayout; });
  const { reduced } = opt;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const s = { x: 0, y: 0, sx: 0, sy: 0, inside: false, down: false, lvl: 0, raf: 0, live: true, t0: performance.now(), init: false };
    const frame = (now: number) => {
      s.raf = 0;
      const t = (now - s.t0) / 1000;
      const w = el.clientWidth, h = el.clientHeight;
      const tx = s.inside ? s.x : w * (0.5 + 0.38 * Math.sin(t * 0.8));
      const ty = s.inside ? s.y : h * (0.5 + 0.14 * Math.sin(t * 1.3 + 1));
      const tl = s.inside ? (s.down ? 1 : 0.6) : 0.72;
      if (!s.init) { s.sx = tx; s.sy = ty; s.init = true; }
      s.sx += (tx - s.sx) * 0.2; s.sy += (ty - s.sy) * 0.2; s.lvl += (tl - s.lvl) * 0.1;
      ap.current(s.sx, s.sy, s.lvl, t);
      if (s.live) s.raf = requestAnimationFrame(frame);
    };
    const still = () => { lay.current?.(); ap.current(el.clientWidth * 0.4, el.clientHeight * 0.5, 0.85, STILL_T); };
    const start = () => { if (reduced) still(); else if (!s.raf && s.live) s.raf = requestAnimationFrame(frame); };
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); s.x = e.clientX - r.left; s.y = e.clientY - r.top; s.inside = true; };
    const leave = () => { s.inside = false; s.down = false; };
    const down = (e: PointerEvent) => { move(e); s.down = true; };
    const up = () => { s.down = false; };
    if (!reduced) {
      el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave); el.addEventListener('pointercancel', leave);
      el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up);
    }
    const ro = new ResizeObserver(() => { lay.current?.(); if (reduced) still(); });
    ro.observe(el);
    const offLive = watchLive(el, (v) => { s.live = v; if (v) start(); });
    let dead = false;
    if (document.fonts?.ready) document.fonts.ready.then(() => { if (!dead) { lay.current?.(); if (reduced) still(); } });
    start();
    return () => {
      dead = true; ro.disconnect(); offLive();
      if (s.raf) cancelAnimationFrame(s.raf);
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); el.removeEventListener('pointercancel', leave);
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointerup', up);
    };
  }, [ref, reduced]);
}

export interface Frame {
  ctx: CanvasRenderingContext2D;
  w: number; h: number;
  /** Seconds since the loop started (STILL_T for the still frame). */
  t: number;
  /** Seconds since the previous frame (0 for still / redraw). */
  dt: number;
  dpr: number;
  pal: Palette;
  /** CSS font-family of the canvas element. */
  family: string;
  still: boolean;
}

/** One Canvas2D rAF loop: DPR capped at 2, resize-aware, paused off-screen / hidden tab, palette follows the theme. Reduced motion paints a still frame. */
export function useCanvasLoop(canvasRef: RefObject<HTMLCanvasElement | null>, draw: (f: Frame) => void, reduced: boolean): { redraw: () => void } {
  const drawRef = useRef(draw);
  const apiRef = useRef<() => void>(() => undefined);
  useEffect(() => { drawRef.current = draw; });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const box = canvas.parentElement ?? canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = { w: 0, h: 0, dpr: 1, pal: readPalette(canvas), family: 'sans-serif', raf: 0, live: true, last: 0, t0: performance.now() };
    const size = () => {
      s.w = Math.max(1, box.clientWidth); s.h = Math.max(1, box.clientHeight); s.dpr = clampDpr();
      canvas.width = Math.round(s.w * s.dpr); canvas.height = Math.round(s.h * s.dpr);
    };
    const paint = (t: number, dt: number, still: boolean) => {
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, s.w, s.h);
      drawRef.current({ ctx, w: s.w, h: s.h, t, dt, dpr: s.dpr, pal: s.pal, family: s.family, still });
    };
    const frame = (now: number) => {
      s.raf = 0;
      const dt = s.last ? Math.min(0.05, (now - s.last) / 1000) : 0.016;
      s.last = now;
      paint((now - s.t0) / 1000, dt, false);
      if (s.live) s.raf = requestAnimationFrame(frame);
    };
    const start = () => { if (reduced) paint(STILL_T, 0, true); else if (!s.raf && s.live) { s.last = 0; s.raf = requestAnimationFrame(frame); } };
    apiRef.current = () => { if (reduced || !s.raf) paint(reduced ? STILL_T : (performance.now() - s.t0) / 1000, 0, reduced); };
    size();
    const ro = new ResizeObserver(() => { size(); if (reduced || !s.raf) paint(reduced ? STILL_T : (performance.now() - s.t0) / 1000, 0, reduced); });
    ro.observe(box);
    const offPal = watchPalette(canvas, (p) => { s.pal = p; s.family = getComputedStyle(canvas).fontFamily || 'sans-serif'; if (reduced) paint(STILL_T, 0, true); });
    const offLive = watchLive(canvas, (v) => { s.live = v; if (v) start(); });
    let dead = false;
    if (document.fonts?.ready) document.fonts.ready.then(() => { if (!dead) { s.family = getComputedStyle(canvas).fontFamily || s.family; if (reduced) paint(STILL_T, 0, true); } });
    start();
    return () => { dead = true; ro.disconnect(); offPal(); offLive(); if (s.raf) cancelAnimationFrame(s.raf); apiRef.current = () => undefined; };
  }, [canvasRef, reduced]);
  const redraw = useRef(() => apiRef.current()).current;
  return { redraw };
}
