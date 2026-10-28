'use client';
import { useEffect, useRef } from 'react';

/* Shared helpers for the micro-c batch: clamp, a damped-spring step and an on-demand single rAF loop. */

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface SpringState { x: number; v: number }

/** Advances a damped spring one step toward `target` (dt in seconds, semi-implicit Euler, sub-stepped for stability). */
export function springStep(s: SpringState, target: number, dt: number, stiffness = 180, damping = 9): void {
  const n = Math.max(1, Math.ceil(dt / 0.008));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const a = -stiffness * (s.x - target) - damping * s.v;
    s.v += a * h;
    s.x += s.v * h;
  }
}

/**
 * An on-demand animation loop: call `start()` to run `tick(dt)` every frame until it returns false.
 * One rAF at a time, paused while the tab is hidden, cancelled on unmount.
 */
export function useFrameLoop(tick: (dt: number) => boolean): { start: () => void; stop: () => void } {
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const api = useRef<{ start: () => void; stop: () => void } | null>(null);
  if (!api.current) {
    let raf = 0;
    let last = 0;
    const frame = (t: number) => {
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 1 / 60);
      last = t;
      raf = tickRef.current(dt) ? requestAnimationFrame(frame) : 0;
      if (!raf) last = 0;
    };
    api.current = {
      start: () => { if (!raf && typeof requestAnimationFrame !== 'undefined') { last = 0; raf = requestAnimationFrame(frame); } },
      stop: () => { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; },
    };
  }
  useEffect(() => () => api.current?.stop(), []);
  return api.current;
}
