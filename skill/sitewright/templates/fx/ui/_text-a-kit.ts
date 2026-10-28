'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { clampDpr, watchLive } from './_t2';

/* Shared helpers for the text-a batch: a visibility-aware rAF loop, size observer, canvas fitting, seeded random. */

/** Deterministic PRNG (mulberry32): same seed, same sequence, so SSR and first paint never depend on Math.random. */
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

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Runs step(t, dt) once per animation frame while the element is on screen and the tab is visible. */
export function useLoop(ref: RefObject<Element | null>, step: (t: number, dt: number) => void, enabled = true) {
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; });
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let raf = 0;
    let last = 0;
    let live = false;
    const frame = (t: number) => {
      raf = 0;
      if (!live) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      stepRef.current(t / 1000, dt);
      raf = requestAnimationFrame(frame);
    };
    const off = watchLive(el, (v) => {
      live = v;
      if (v && !raf) { last = 0; raf = requestAnimationFrame(frame); }
      if (!v && raf) { cancelAnimationFrame(raf); raf = 0; }
    });
    return () => { off(); if (raf) cancelAnimationFrame(raf); };
  }, [ref, enabled]);
}

/** Observed content-box size of an element (0x0 until mounted). */
export function useSize(ref: RefObject<Element | null>): { w: number; h: number } {
  const [s, setS] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      setS((p) => (Math.abs(p.w - r.width) < 0.5 && Math.abs(p.h - r.height) < 0.5 ? p : { w: r.width, h: r.height }));
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return s;
}

/** True once the element has entered the viewport (stays true if `once`). */
export function useInView(ref: RefObject<Element | null>, once = true, threshold = 0.25): boolean {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setV(true); return; }
    const io = new IntersectionObserver((es) => {
      const e = es[es.length - 1];
      if (!e) return;
      if (e.isIntersecting) { setV(true); if (once) io.disconnect(); } else if (!once) setV(false);
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, once, threshold]);
  return v;
}

/** Sizes a canvas to w x h CSS pixels at a DPR capped at 2 and returns its 2D context scaled to CSS pixels. */
export function fitCanvas(c: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D | null {
  const dpr = clampDpr();
  const pw = Math.max(1, Math.round(w * dpr));
  const ph = Math.max(1, Math.round(h * dpr));
  if (c.width !== pw) c.width = pw;
  if (c.height !== ph) c.height = ph;
  c.style.width = w + 'px';
  c.style.height = h + 'px';
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** Computed font family and the resolved text colour token of an element. */
export function readFont(el: Element) {
  const cs = getComputedStyle(el);
  return { family: cs.fontFamily || 'system-ui, sans-serif', color: cs.color };
}

/** Re-runs cb when web fonts finish loading (canvas text must wait for them). */
export function onFontsReady(cb: () => void): () => void {
  let dead = false;
  try { document.fonts?.ready.then(() => { if (!dead) cb(); }); } catch { /* ignore */ }
  return () => { dead = true; };
}
