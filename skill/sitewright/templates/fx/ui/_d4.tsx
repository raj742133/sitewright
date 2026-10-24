'use client';
// Helpers shared by the d4 hover batch: media-query hooks and a CSS/SVG "picture" so no component needs an image file.
import { useEffect, useState } from 'react';

export function useMedia(query: string): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return on;
}
export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');
export const useCoarsePointer = () => useMedia('(pointer: coarse)');

// [sky top, sky bottom, sun, far hill, mid hill, near hill]
const PALETTES: string[][] = [
  ['#1e3a8a', '#fb923c', '#fde68a', '#7c3aed', '#4c1d95', '#1e1b4b'],
  ['#0e7490', '#a7f3d0', '#fef9c3', '#0f766e', '#115e59', '#134e4a'],
  ['#9f1239', '#fda4af', '#fff1f2', '#be185d', '#831843', '#500724'],
  ['#14532d', '#d9f99d', '#fefce8', '#15803d', '#166534', '#052e16'],
  ['#312e81', '#c4b5fd', '#e0e7ff', '#4338ca', '#3730a3', '#1e1b4b'],
  ['#7c2d12', '#fcd34d', '#fff7ed', '#b45309', '#92400e', '#451a03'],
];

/** A decorative landscape drawn with a CSS gradient plus inline SVG. Fills its (positioned) parent. */
export function Scene({ i = 0, className }: { i?: number; className?: string }) {
  const p = PALETTES[((i % PALETTES.length) + PALETTES.length) % PALETTES.length] as string[];
  const sunX = 55 + ((i * 23) % 50);
  return (
    <div aria-hidden="true" className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: `linear-gradient(${p[0]}, ${p[1]})` }}>
      <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ display: 'block' }} focusable="false">
        <circle cx={sunX} cy="42" r="14" fill={p[2]} />
        <path d="M0 62 Q30 40 62 58 T125 52 T160 60 V100 H0Z" fill={p[3]} />
        <path d="M0 74 Q40 54 80 72 T160 68 V100 H0Z" fill={p[4]} />
        <path d="M0 88 Q50 72 100 86 T160 82 V100 H0Z" fill={p[5]} />
      </svg>
    </div>
  );
}
