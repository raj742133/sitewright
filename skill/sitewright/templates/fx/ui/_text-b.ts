'use client';
import { useEffect, useLayoutEffect } from 'react';

/* Shared helpers for the text-b batch: scroll-progress watching (works in a scrolling tile and on the page), a one-shot in-view watcher,
   a seeded PRNG and an isomorphic layout effect. Hooks for reduced motion / palette / live-pausing come from _t2. */
export { useReducedMotion, useCoarsePointer, watchLive, watchPalette, readPalette, rgba, mix } from './_t2';
export type { Palette } from './_t2';

export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t: number) => { const c = 1.45; const x = t - 1; return 1 + (c + 1) * x * x * x + c * x * x; };

/** Small deterministic PRNG (mulberry32) so first renders never depend on Math.random. */
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

/** The nearest ancestor that scrolls vertically, or null when the page itself scrolls. */
export function findScroller(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement;
  while (p && p !== document.body && p !== document.documentElement) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return p;
    p = p.parentElement;
  }
  return null;
}

export interface ScrollSource { el: HTMLElement | null; target: HTMLElement | Window; pos: () => number; viewport: () => { top: number; height: number } }
/** Resolves where scrolling happens for `el`: an explicit scroller, the nearest scrolling ancestor, or the window. */
export function scrollSource(el: HTMLElement, scroller?: HTMLElement | null): ScrollSource {
  const s = scroller ?? findScroller(el);
  if (s) return { el: s, target: s, pos: () => s.scrollTop, viewport: () => { const r = s.getBoundingClientRect(); return { top: r.top, height: s.clientHeight || r.height }; } };
  return { el: null, target: window, pos: () => window.scrollY, viewport: () => ({ top: 0, height: window.innerHeight }) };
}

/**
 * Calls cb(p) with p in 0..1 as `el` travels through the scroll viewport: 0 when its top edge sits at `start` (fraction of the viewport height from the
 * top, default 0.92), 1 when its bottom edge has reached `end` (default 0.5). One rAF per scroll burst, no standing loop. Returns a cleanup.
 */
export function watchScrollProgress(el: HTMLElement, opts: { scroller?: HTMLElement | null; start?: number; end?: number }, cb: (p: number) => void): () => void {
  const start = opts.start ?? 0.92;
  const end = opts.end ?? 0.5;
  const src = scrollSource(el, opts.scroller);
  let raf = 0;
  const run = () => {
    raf = 0;
    const vp = src.viewport();
    const r = el.getBoundingClientRect();
    const top = r.top - vp.top;
    const span = (start - end) * vp.height + r.height;
    cb(clamp01(span > 0 ? (start * vp.height - top) / span : 1));
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(run); };
  src.target.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(kick) : null;
  ro?.observe(el);
  if (src.el) ro?.observe(src.el);
  run();
  return () => {
    if (raf) cancelAnimationFrame(raf);
    src.target.removeEventListener('scroll', kick);
    window.removeEventListener('resize', kick);
    ro?.disconnect();
  };
}

/** Calls cb(true/false) as the element enters/leaves the viewport (threshold = visible fraction). Returns a cleanup. */
export function watchInView(el: Element, cb: (inView: boolean) => void, threshold = 0.35): () => void {
  if (typeof IntersectionObserver === 'undefined') { cb(true); return () => undefined; }
  const io = new IntersectionObserver((es) => { const e = es[es.length - 1]; if (e) cb(e.isIntersecting); }, { threshold });
  io.observe(el);
  return () => io.disconnect();
}
