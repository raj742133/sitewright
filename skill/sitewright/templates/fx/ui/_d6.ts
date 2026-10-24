'use client';
import { useEffect, useState, type RefObject } from 'react';

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Small deterministic PRNG (mulberry32). Same seed gives the same sequence. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Reduced motion and coarse pointer flags (false during SSR, corrected in an effect). */
export function usePrefs() {
  const [p, setP] = useState({ reduced: false, coarse: false });
  useEffect(() => {
    const r = window.matchMedia('(prefers-reduced-motion: reduce)');
    const c = window.matchMedia('(pointer: coarse)');
    const read = () => setP({ reduced: r.matches, coarse: c.matches });
    read();
    r.addEventListener('change', read);
    c.addEventListener('change', read);
    return () => { r.removeEventListener('change', read); c.removeEventListener('change', read); };
  }, []);
  return p;
}

/** True while the element is on screen and the tab is visible. */
export function useActive(ref: RefObject<Element | null>) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inView = true;
    let shown = document.visibilityState !== 'hidden';
    const set = () => setOn(inView && shown);
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((e) => { inView = e[e.length - 1]?.isIntersecting ?? true; set(); }) : null;
    io?.observe(el);
    const vis = () => { shown = document.visibilityState !== 'hidden'; set(); };
    document.addEventListener('visibilitychange', vis);
    return () => { io?.disconnect(); document.removeEventListener('visibilitychange', vis); };
  }, [ref]);
  return on;
}
