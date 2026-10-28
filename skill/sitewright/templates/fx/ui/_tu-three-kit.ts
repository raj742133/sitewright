import { useEffect, useRef, useState } from 'react';
import { readPalette, type Palette, type RGB } from './_t1';

/* Shared kit for the tu-three scenes: a Canvas2D pseudo-3D loop (DPR cap, pixel budget, fps cap, pause off-screen/hidden,
   reduced motion = one still frame, theme-aware palette, damped pointer with an idle sway for touch) plus colour and noise helpers. */

export type { Palette, RGB };
export interface Env {
  /** CSS pixel size, device pixel ratio actually used */ w: number; h: number; dpr: number;
  /** scene time in seconds (fixed when reduced), frame delta */ t: number; dt: number;
  pal: Palette; dark: boolean;
  /** damped pointer, -1..1 (y down); sways gently on touch screens, 0 when reduced */ px: number; py: number;
  reduced: boolean; coarse: boolean;
  /** bumps whenever size, theme or the scene key changes: rebuild cached layers when it differs from yours */ rev: number;
}
export interface SceneOpts {
  /** max frames per second (default 30) */ fps?: number;
  /** max device pixel ratio (default 2) */ dpr?: number;
  /** resolution factor on top of the DPR (default 1) */ res?: number;
  /** backing-store pixel budget (default 1.4M) */ maxPixels?: number;
  /** time of the still frame / start of the clock */ t0?: number;
  /** track the pointer (default true) */ pointer?: boolean;
  /** changing this resets the scene state */ key?: string;
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** smooth 1-D value noise, deterministic */
export function noise1(x: number, seed = 0) {
  const h = (n: number) => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}
export const fbm1 = (x: number, seed = 0) => noise1(x, seed) * 0.55 + noise1(x * 2.1 + 7, seed + 1) * 0.3 + noise1(x * 4.3 + 3, seed + 2) * 0.15;

/* colours: 0..1 rgb triples in, CSS strings out */
export const mixc = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const lum = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
export const css = (c: RGB, a = 1) => `rgba(${Math.round(clamp(c[0], 0, 1) * 255)},${Math.round(clamp(c[1], 0, 1) * 255)},${Math.round(clamp(c[2], 0, 1) * 255)},${a})`;
export const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
export const WHITE: RGB = [1, 1, 1];
export const BLACK: RGB = [0.02, 0.025, 0.04];
/** HSL (h in degrees) to rgb, for natural hues that are not brand colours */
export function hsl(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

export function glowSprite(col: RGB): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const c = cv.getContext('2d');
  if (c) { const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, css(col, 1)); g.addColorStop(0.25, css(col, 0.45)); g.addColorStop(1, css(col, 0)); c.fillStyle = g; c.fillRect(0, 0, 32, 32); }
  return cv;
}
/** Paints into a cached offscreen layer (CSS pixel units). */
export function layer(w: number, h: number, dpr: number, paint: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  if (c) { c.scale(dpr, dpr); paint(c); }
  return cv;
}

/**
 * Canvas2D scene loop. `make` builds per-scene state (called again when `opts.key` changes), `draw` paints one frame in CSS pixels.
 * Attach `wrapRef` to the (positioned, sized) wrapper and `canvasRef` to a canvas inside it.
 */
export function useScene<S>(
  make: (env: Env, ctx: CanvasRenderingContext2D) => S,
  draw: (ctx: CanvasRenderingContext2D, env: Env, s: S) => void,
  opts: SceneOpts = {},
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const mk = useRef(make); mk.current = make;
  const dr = useRef(draw); dr.current = draw;
  const op = useRef(opts); op.current = opts;
  const reset = useRef<() => void>(() => {});
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    const wrap = wrapRef.current, cv = canvasRef.current;
    const ctx = cv?.getContext('2d') ?? null;
    if (!wrap || !cv || !ctx) return;
    const mqR = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqC = window.matchMedia('(pointer: coarse)');
    const T0 = op.current.t0 ?? 8;
    const env: Env = { w: 1, h: 1, dpr: 1, t: T0, dt: 0, pal: readPalette(wrap), dark: false, px: 0, py: 0, reduced: mqR.matches, coarse: mqC.matches, rev: 1 };
    const tgt = { x: 0, y: 0 };
    let st: S | null = null, raf = 0, still = 0, last = 0, onScreen = true, dead = false;
    const darkOf = () => { env.dark = lum(env.pal.surface) < 0.5; };
    darkOf();

    const build = () => { try { st = mk.current(env, ctx); } catch { st = null; } };
    const paint = () => {
      if (!st || dead) return;
      ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      dr.current(ctx, env, st);
      if (!ready0) { ready0 = true; setReady(true); }
    };
    let ready0 = false;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const w = Math.max(1, r.width), h = Math.max(1, r.height), o = op.current;
      let dpr = Math.min(window.devicePixelRatio || 1, o.dpr ?? 2) * (o.res ?? 1);
      const budget = o.maxPixels ?? 1.4e6;
      if (w * h * dpr * dpr > budget) dpr = Math.sqrt(budget / (w * h));
      env.w = w; env.h = h; env.dpr = dpr;
      cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
      env.rev++; build(); redraw();
    };
    const want = () => !env.reduced && onScreen && !document.hidden && !dead && !!st;
    const gap = 1000 / (op.current.fps ?? 30) - 3;
    const frame = (now: number) => {
      raf = 0;
      if (!want()) return;
      if (now - last >= gap) {
        const dt = Math.min(0.1, (now - (last || now)) / 1000);
        last = now; env.dt = dt; env.t += dt;
        const o = op.current;
        if (o.pointer === false || env.coarse) { tgt.x = Math.sin(env.t * 0.33) * 0.55; tgt.y = Math.cos(env.t * 0.21) * 0.25; }
        const k = 1 - Math.exp(-dt * 4);
        env.px += (tgt.x - env.px) * k; env.py += (tgt.y - env.py) * k;
        paint();
      }
      raf = requestAnimationFrame(frame);
    };
    function redraw() {
      if (raf || still || dead) return;
      still = requestAnimationFrame(() => { still = 0; if (env.reduced) { env.t = T0; env.dt = 0; env.px = 0; env.py = 0; } else env.dt = 0; paint(); });
    }
    const sync = () => {
      if (want()) { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
      else { if (raf) cancelAnimationFrame(raf); raf = 0; redraw(); }
    };
    reset.current = () => { env.rev++; build(); redraw(); };
    kick.current = redraw;

    const onTheme = () => { env.pal = readPalette(wrap); darkOf(); env.rev++; build(); redraw(); };
    let themeTimer = 0;
    const mo = new MutationObserver(() => { onTheme(); window.clearTimeout(themeTimer); themeTimer = window.setTimeout(onTheme, 160); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    const mqD = window.matchMedia('(prefers-color-scheme: dark)');
    const onMq = () => { env.reduced = mqR.matches; env.coarse = mqC.matches; onTheme(); sync(); };
    mqR.addEventListener('change', onMq); mqC.addEventListener('change', onMq); mqD.addEventListener('change', onTheme);
    const ro = new ResizeObserver(resize); ro.observe(wrap);
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((es) => { onScreen = es.some((e) => e.isIntersecting); sync(); });
    io?.observe(wrap);
    const onVis = () => sync();
    document.addEventListener('visibilitychange', onVis);
    const onMove = (e: PointerEvent) => {
      if (env.coarse || env.reduced || e.pointerType === 'touch' || op.current.pointer === false) return;
      const r = wrap.getBoundingClientRect();
      tgt.x = clamp(((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1, -1.2, 1.2);
      tgt.y = clamp(((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1, -1.2, 1.2);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    resize(); sync();
    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      if (still) cancelAnimationFrame(still);
      window.clearTimeout(themeTimer);
      mo.disconnect(); ro.disconnect(); io?.disconnect();
      mqR.removeEventListener('change', onMq); mqC.removeEventListener('change', onMq); mqD.removeEventListener('change', onTheme);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      st = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const key = opts.key;
  useEffect(() => { reset.current(); }, [key]);
  return { wrapRef, canvasRef, ready, redraw: () => kick.current() };
}
