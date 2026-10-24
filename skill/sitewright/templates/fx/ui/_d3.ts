'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';

/** subscribe to a media query (false on the server and first paint) */
export function useMedia(query: string): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}
export const useReduced = () => useMedia('(prefers-reduced-motion: reduce)');

export interface Edges { l: number; r: number }

/**
 * Moves an indicator element between targets with a separate spring on each edge:
 * the edge facing the direction of travel is stiff (moves first), the other lags,
 * so the indicator stretches and then contracts. Writes styles straight to the element.
 */
export function useEdgeSprings(
  ref: RefObject<HTMLElement | null>,
  measure: () => Edges | null,
  key: unknown,
  reduced: boolean,
) {
  const st = useRef({ l: 0, r: 0, vl: 0, vr: 0, tl: 0, tr: 0, kl: 0, kr: 0, ready: false, raf: 0, last: 0 });
  const measureRef = useRef(measure);
  measureRef.current = measure;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const s = st.current;
    const paint = () => {
      el.style.transform = `translateX(${s.l.toFixed(2)}px)`;
      el.style.width = `${Math.max(0, s.r - s.l).toFixed(2)}px`;
    };
    const step = (t: number) => {
      const dt = Math.min(0.032, (t - s.last) / 1000 || 0.016);
      s.last = t;
      const damp = 0.86;
      s.vl += (s.tl - s.l) * s.kl * dt; s.vl *= Math.pow(damp, dt * 60); s.l += s.vl * dt;
      s.vr += (s.tr - s.r) * s.kr * dt; s.vr *= Math.pow(damp, dt * 60); s.r += s.vr * dt;
      paint();
      const done = Math.abs(s.tl - s.l) < 0.15 && Math.abs(s.tr - s.r) < 0.15 && Math.abs(s.vl) < 0.5 && Math.abs(s.vr) < 0.5;
      if (done) { s.l = s.tl; s.r = s.tr; s.vl = s.vr = 0; paint(); s.raf = 0; return; }
      s.raf = requestAnimationFrame(step);
    };
    const go = (snap: boolean) => {
      const e = measureRef.current();
      if (!e) { el.style.opacity = '0'; return; }
      el.style.opacity = '1';
      const toRight = e.l >= s.l;
      s.tl = e.l; s.tr = e.r;
      s.kl = toRight ? 90 : 340; // trailing edge lags, leading edge leads
      s.kr = toRight ? 340 : 90;
      if (snap || reduced || !s.ready) {
        s.l = e.l; s.r = e.r; s.vl = s.vr = 0; s.ready = true;
        cancelAnimationFrame(s.raf); s.raf = 0; paint(); return;
      }
      if (!s.raf) { s.last = performance.now(); s.raf = requestAnimationFrame(step); }
    };
    go(false);
    const parent = el.parentElement;
    let ro: ResizeObserver | undefined;
    if (parent && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => go(true));
      ro.observe(parent);
    }
    return () => { ro?.disconnect(); cancelAnimationFrame(s.raf); s.raf = 0; };
  }, [ref, key, reduced]);
}
