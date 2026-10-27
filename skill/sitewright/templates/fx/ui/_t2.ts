'use client';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';

/* Shared helpers for the t2 3D batch: media hooks, visibility watcher, theme palette, a damped rotation driver, mat4 maths and tiny GL helpers. */

export function useMedia(query: string): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const f = () => setM(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [query]);
  return m;
}
export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');
export const useCoarsePointer = () => useMedia('(pointer: coarse)');

/** Calls cb(true) while the element is on screen and the tab is visible, cb(false) otherwise. */
export function watchLive(el: Element, cb: (live: boolean) => void): () => void {
  let inView = true;
  let vis = !document.hidden;
  const emit = () => cb(inView && vis);
  const io = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver((es) => { const e = es[es.length - 1]; inView = e ? e.isIntersecting : true; emit(); })
    : null;
  io?.observe(el);
  const onVis = () => { vis = !document.hidden; emit(); };
  document.addEventListener('visibilitychange', onVis);
  emit();
  return () => { io?.disconnect(); document.removeEventListener('visibilitychange', onVis); };
}

export type RGB = [number, number, number];
export interface Palette { primary: RGB; signal: RGB; ink: RGB; surface: RGB; raised: RGB; muted: RGB }
const FALLBACK: Palette = { primary: [37, 99, 235], signal: [245, 158, 11], ink: [24, 24, 27], surface: [250, 250, 250], raised: [255, 255, 255], muted: [113, 113, 122] };
export const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const norm = (c: RGB): RGB => [c[0] / 255, c[1] / 255, c[2] / 255];

let probe: CanvasRenderingContext2D | null = null;
function parseColor(css: string, fb: RGB): RGB {
  if (!css) return fb;
  try {
    if (!probe) { const c = document.createElement('canvas'); c.width = c.height = 1; probe = c.getContext('2d', { willReadFrequently: true }); }
    if (!probe) return fb;
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#010203';
    probe.fillStyle = css;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0] ?? fb[0], d[1] ?? fb[1], d[2] ?? fb[2]];
  } catch { return fb; }
}
export function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el);
  const out = { ...FALLBACK };
  (Object.keys(FALLBACK) as (keyof Palette)[]).forEach((k) => { out[k] = parseColor(cs.getPropertyValue('--' + k).trim(), FALLBACK[k]); });
  return out;
}
/** Reads host colour tokens now and whenever the theme attribute changes. Returns an unsubscribe. */
export function watchPalette(el: Element, cb: (p: Palette) => void): () => void {
  cb(readPalette(el));
  const mo = new MutationObserver(() => cb(readPalette(el)));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  return () => mo.disconnect();
}

export const clampDpr = () => Math.min(2, window.devicePixelRatio || 1);

/** Drives two eased numbers (x, y) toward a target; runs rAF only while moving (or swaying). */
export function useDamped(
  ref: RefObject<HTMLElement | null>,
  apply: (x: number, y: number) => void,
  opts: { sway?: boolean; instant?: boolean } = {},
) {
  const applyRef = useRef(apply);
  const optRef = useRef(opts);
  useEffect(() => { applyRef.current = apply; optRef.current = opts; });
  const api = useMemo(() => {
    const s = { tx: 0, ty: 0, x: 0, y: 0, raf: 0, live: true };
    const step = (t: number) => {
      s.raf = 0;
      const o = optRef.current;
      const sway = o.sway && !o.instant;
      const gx = s.tx + (sway ? Math.sin(t / 1400) * 7 : 0);
      const gy = s.ty + (sway ? Math.cos(t / 1900) * 6 : 0);
      const k = o.instant ? 1 : 0.14;
      s.x += (gx - s.x) * k;
      s.y += (gy - s.y) * k;
      const settled = Math.abs(gx - s.x) < 0.02 && Math.abs(gy - s.y) < 0.02;
      if (settled) { s.x = gx; s.y = gy; }
      applyRef.current(s.x, s.y);
      if (s.live && (!settled || sway)) s.raf = requestAnimationFrame(step);
    };
    const kick = () => { if (!s.raf && s.live) s.raf = requestAnimationFrame(step); };
    return {
      set: (x: number, y: number) => { s.tx = x; s.ty = y; kick(); },
      get: () => ({ x: s.tx, y: s.ty }),
      kick,
      setLive: (v: boolean) => { s.live = v; if (v) kick(); },
      stop: () => { if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0; },
    };
  }, []);
  useEffect(() => {
    const el = ref.current;
    const off = el ? watchLive(el, api.setLive) : undefined;
    return () => { off?.(); api.stop(); };
  }, [ref, api]);
  useEffect(() => { api.kick(); }, [api, opts.sway, opts.instant]);
  return api;
}

/* ---------- mat4 (column-major, like GL expects) ---------- */
export type Mat4 = Float32Array;
export const ident = (): Mat4 => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
export function mul(a: Mat4, b: Mat4): Mat4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += (a[k * 4 + r] ?? 0) * (b[c * 4 + k] ?? 0);
    o[c * 4 + r] = s;
  }
  return o;
}
export function perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovy / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = (2 * far * near) / (near - far);
  return m;
}
export function translate(x: number, y: number, z: number): Mat4 { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m; }
export function rotX(a: number): Mat4 { const m = ident(); const c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
export function rotY(a: number): Mat4 { const m = ident(); const c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }

/* ---------- tiny GL helpers ---------- */
export type GL = WebGLRenderingContext;
export function getGL(canvas: HTMLCanvasElement): GL | null {
  try {
    const opts = { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' as const };
    return (canvas.getContext('webgl2', opts) || canvas.getContext('webgl', opts)) as GL | null;
  } catch { return null; }
}
export function buildProgram(gl: GL, vsSrc: string, fsSrc: string): WebGLProgram | null {
  const mk = (type: number, src: string) => {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { gl.deleteShader(sh); return null; }
    return sh;
  };
  const vs = mk(gl.VERTEX_SHADER, vsSrc);
  const fs = mk(gl.FRAGMENT_SHADER, fsSrc);
  const p = gl.createProgram();
  if (!vs || !fs || !p) return null;
  gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { gl.deleteProgram(p); return null; }
  return p;
}
