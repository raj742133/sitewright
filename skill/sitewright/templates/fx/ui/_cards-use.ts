'use client';
import { useEffect, useState, type RefObject } from 'react';
import { watchLive } from './_t2';

/** True while the element is on screen and the tab is visible (false on the server and before mount). */
export function useLive(ref: RefObject<Element | null>): boolean {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return watchLive(el, setLive);
  }, [ref]);
  return live;
}

/** True once the element has been on screen at least once (for enter animations). */
export function useSeen(ref: RefObject<Element | null>): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen]);
  return seen;
}

/** Controlled / uncontrolled state in one hook. */
export function useControlled<T>(value: T | undefined, initial: T, onChange?: (v: T) => void): [T, (v: T) => void] {
  const [inner, setInner] = useState<T>(initial);
  const isCtl = value !== undefined;
  const cur = isCtl ? (value as T) : inner;
  const set = (v: T) => { if (!isCtl) setInner(v); onChange?.(v); };
  return [cur, set];
}

/** Writes pointer position inside `el` as --mx / --my (px) and --px / --py (0..1). */
export function setPointerVars(el: HTMLElement, clientX: number, clientY: number) {
  const r = el.getBoundingClientRect();
  const x = clientX - r.left;
  const y = clientY - r.top;
  el.style.setProperty('--mx', x.toFixed(1) + 'px');
  el.style.setProperty('--my', y.toFixed(1) + 'px');
  el.style.setProperty('--px', (r.width ? x / r.width : 0.5).toFixed(3));
  el.style.setProperty('--py', (r.height ? y / r.height : 0.5).toFixed(3));
}
