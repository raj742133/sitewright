'use client';
import { useEffect, useId, useState, type CSSProperties, type RefObject } from 'react';

/** Reactive matchMedia (false on the server and first render). */
export function useMedia(query: string): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const m = window.matchMedia(query);
    const sync = () => setOn(m.matches);
    sync();
    m.addEventListener('change', sync);
    return () => m.removeEventListener('change', sync);
  }, [query]);
  return on;
}
export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');
export const useCoarsePointer = () => useMedia('(pointer: coarse)');

interface PointerVarOpts { enabled?: boolean; keys?: boolean }
/**
 * Writes the pointer position into CSS variables on the element, rAF-throttled:
 * --d5-nx / --d5-ny (-1..1), --d5-px / --d5-py (px) and data-on="1" while active.
 * Mouse/pen only; with `keys` the arrow keys nudge the same variables while focused.
 */
export function usePointerVars(ref: RefObject<HTMLElement | null>, { enabled = true, keys = false }: PointerVarOpts = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let raf = 0, nx = 0, ny = 0;
    const put = (x: number, y: number, w: number, h: number) => {
      el.style.setProperty('--d5-px', `${x.toFixed(1)}px`); el.style.setProperty('--d5-py', `${y.toFixed(1)}px`);
      el.style.setProperty('--d5-nx', nx.toFixed(3)); el.style.setProperty('--d5-ny', ny.toFixed(3));
      void w; void h;
    };
    let last: PointerEvent | null = null;
    const apply = () => {
      raf = 0;
      if (!last) return;
      const r = el.getBoundingClientRect();
      const x = last.clientX - r.left, y = last.clientY - r.top;
      nx = Math.max(-1, Math.min(1, (x / r.width) * 2 - 1)); ny = Math.max(-1, Math.min(1, (y / r.height) * 2 - 1));
      put(x, y, r.width, r.height);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      last = e; el.dataset.on = '1';
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const reset = () => {
      last = null; cancelAnimationFrame(raf); raf = 0; nx = 0; ny = 0;
      el.dataset.on = '0';
      el.style.setProperty('--d5-nx', '0'); el.style.setProperty('--d5-ny', '0');
    };
    const key = (e: KeyboardEvent) => {
      if (!keys || e.target !== el) return;
      const d = e.key === 'ArrowLeft' ? [-0.35, 0] : e.key === 'ArrowRight' ? [0.35, 0] : e.key === 'ArrowUp' ? [0, -0.35] : e.key === 'ArrowDown' ? [0, 0.35] : null;
      if (!d) return;
      e.preventDefault();
      nx = Math.max(-1, Math.min(1, nx + (d[0] ?? 0))); ny = Math.max(-1, Math.min(1, ny + (d[1] ?? 0)));
      const r = el.getBoundingClientRect();
      el.dataset.on = '1';
      put(((nx + 1) / 2) * r.width, ((ny + 1) / 2) * r.height, r.width, r.height);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', reset);
    el.addEventListener('blur', reset);
    el.addEventListener('keydown', key);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', reset);
      el.removeEventListener('blur', reset); el.removeEventListener('keydown', key);
    };
  }, [ref, enabled, keys]);
}

/* ---------- little landscape illustration, built from separate layers ---------- */
export interface Palette { top: string; bottom: string; sun: string; far: string; near: string; pine: string; mist: string; stars?: boolean }
export type PaletteName = 'day' | 'night' | 'dusk' | 'mint' | 'rose';
export const PALETTES: Record<PaletteName, Palette> = {
  day: { top: '#6fbdf2', bottom: '#fde6bd', sun: '#ffb13d', far: '#8fb1c9', near: '#5f9a7a', pine: '#2f6b52', mist: '#ffffff' },
  night: { top: '#0d1230', bottom: '#3b2f6e', sun: '#eef0ff', far: '#3d4c7e', near: '#27346a', pine: '#121a3d', mist: '#8c9ee6', stars: true },
  dusk: { top: '#392a6b', bottom: '#f68c68', sun: '#ffd49c', far: '#7d5192', near: '#4f3573', pine: '#27193f', mist: '#ffb49d' },
  mint: { top: '#a8ecd8', bottom: '#f0fcd6', sun: '#fff09e', far: '#7acdb3', near: '#43a488', pine: '#1d6a5a', mist: '#ffffff' },
  rose: { top: '#ffbdd2', bottom: '#fff0d8', sun: '#ff94b0', far: '#e697b2', near: '#c0658a', pine: '#7b2f56', mist: '#ffffff' },
};
interface ArtProps { p: Palette; style?: CSSProperties; className?: string }
const svgProps = { viewBox: '0 0 160 100', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': true, focusable: false } as const;
const fill: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' };
const STARS: Array<[number, number, number]> = [[12, 10, 0.8], [34, 22, 0.6], [58, 8, 0.9], [80, 20, 0.6], [96, 9, 0.7], [140, 14, 0.9], [150, 30, 0.6], [24, 36, 0.6], [70, 34, 0.5]];

export function SkyArt({ p, style, className }: ArtProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg {...svgProps} style={{ ...fill, ...style }} className={className}>
      <defs><linearGradient id={`sk${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.top} /><stop offset="1" stopColor={p.bottom} /></linearGradient></defs>
      <rect width="160" height="100" fill={`url(#sk${id})`} />
      {p.stars && STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity="0.85" />)}
    </svg>
  );
}
export function SunArt({ p, style, className }: ArtProps) {
  return (
    <svg {...svgProps} style={{ ...fill, ...style }} className={className}>
      <circle cx="112" cy="34" r="25" fill={p.sun} opacity="0.28" />
      <circle cx="112" cy="34" r="12" fill={p.sun} />
    </svg>
  );
}
export function FarArt({ p, style, className }: ArtProps) {
  return (
    <svg {...svgProps} style={{ ...fill, ...style }} className={className}>
      <path d="M-4 66 L22 46 L40 58 L64 36 L90 60 L116 42 L140 56 L164 46 V104 H-4Z" fill={p.far} />
    </svg>
  );
}
export function NearArt({ p, style, className }: ArtProps) {
  return (
    <svg {...svgProps} style={{ ...fill, ...style }} className={className}>
      <path d="M-4 80 Q30 58 62 72 T122 68 T164 74 V104 H-4Z" fill={p.near} />
    </svg>
  );
}
export function PineArt({ p, style, className }: ArtProps) {
  const pines: Array<[number, number]> = [[12, 22], [28, 30], [48, 20], [128, 26], [146, 34]];
  return (
    <svg {...svgProps} style={{ ...fill, ...style }} className={className}>
      {pines.map(([x, h], i) => <polygon key={i} points={`${x},${96 - h} ${x - 7},96 ${x + 7},96`} fill={p.pine} />)}
      <rect x="-4" y="92" width="168" height="12" fill={p.pine} />
    </svg>
  );
}
export function MistArt({ p, style, className }: ArtProps) {
  return (
    <svg {...svgProps} style={{ ...fill, ...style }} className={className}>
      <ellipse cx="38" cy="84" rx="52" ry="6" fill={p.mist} opacity="0.5" />
      <ellipse cx="118" cy="90" rx="56" ry="6" fill={p.mist} opacity="0.4" />
    </svg>
  );
}
export const LAYER_ARTS = [SkyArt, SunArt, FarArt, NearArt, PineArt, MistArt] as const;

/** The whole landscape, flat. */
export function Scene({ palette = 'day', style }: { palette?: PaletteName; style?: CSSProperties }) {
  const p = PALETTES[palette];
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}>
      {LAYER_ARTS.map((Art, i) => <Art key={i} p={p} />)}
    </div>
  );
}
