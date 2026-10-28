'use client';
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { watchLive } from './_t2';

/* Shared hooks for the gallery components: pointer drag with velocity, live (on-screen + tab visible) flag, element size. */

export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface DragHandlers {
  /** Which direction starts a drag (default both). The other direction is left to the browser (set touch-action in CSS). */
  axis?: 'x' | 'y' | 'both';
  /** Pixels before a press counts as a drag (default 6). */
  threshold?: number;
  onStart?: () => void;
  /** dx/dy since the press; ix/iy since the previous event. */
  onMove: (dx: number, dy: number, ix: number, iy: number) => void;
  /** Velocity in px per ms at release. Only called when the press became a drag. */
  onEnd: (vx: number, vy: number, dx: number, dy: number) => void;
}

/** Pointer-driven drag on `ref`. A press that never moves stays a click; one that moves swallows the click that follows. Elements inside [data-nodrag] never start a drag. */
export function usePointerDrag(ref: RefObject<HTMLElement | null>, handlers: DragHandlers) {
  const hr = useRef(handlers);
  useEffect(() => { hr.current = handlers; });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let id = -1, sx = 0, sy = 0, lx = 0, ly = 0, lt = 0, vx = 0, vy = 0, down = false, moved = false, swallow = false;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if ((e.target as Element).closest('[data-nodrag]')) return;
      down = true; moved = false; id = e.pointerId; sx = lx = e.clientX; sy = ly = e.clientY; lt = e.timeStamp; vx = vy = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== id) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved) {
        const ax = hr.current.axis ?? 'both';
        const d = ax === 'x' ? Math.abs(dx) : ax === 'y' ? Math.abs(dy) : Math.hypot(dx, dy);
        if (d < (hr.current.threshold ?? 6)) return;
        if (ax === 'x' && Math.abs(dy) > Math.abs(dx) * 1.2) { down = false; return; }
        if (ax === 'y' && Math.abs(dx) > Math.abs(dy) * 1.2) { down = false; return; }
        moved = true;
        try { el.setPointerCapture(id); } catch { /* pointer already gone */ }
        hr.current.onStart?.();
      }
      const dt = Math.max(1, e.timeStamp - lt);
      vx = vx * 0.4 + ((e.clientX - lx) / dt) * 0.6;
      vy = vy * 0.4 + ((e.clientY - ly) / dt) * 0.6;
      const ix = e.clientX - lx, iy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY; lt = e.timeStamp;
      hr.current.onMove(dx, dy, ix, iy);
    };
    const finish = (e: PointerEvent) => {
      if (!down || e.pointerId !== id) return;
      down = false;
      if (!moved) return;
      try { el.releasePointerCapture(id); } catch { /* released */ }
      if (e.timeStamp - lt > 90) { vx = 0; vy = 0; }
      swallow = true;
      setTimeout(() => { swallow = false; }, 0);
      hr.current.onEnd(vx, vy, e.clientX - sx, e.clientY - sy);
    };
    const onClick = (e: MouseEvent) => { if (swallow) { e.stopPropagation(); e.preventDefault(); swallow = false; } };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', finish);
    el.addEventListener('pointercancel', finish);
    el.addEventListener('click', onClick, true);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', finish);
      el.removeEventListener('pointercancel', finish);
      el.removeEventListener('click', onClick, true);
    };
  }, [ref]);
}

/** True while the element is on screen and the tab is visible. */
export function useLive(ref: RefObject<Element | null>): boolean {
  const [live, setLive] = useState(true);
  useEffect(() => {
    const el = ref.current;
    return el ? watchLive(el, setLive) : undefined;
  }, [ref]);
  return live;
}

/** Content-box size of the element, measured before paint and kept current. */
export function useSize(ref: RefObject<Element | null>): { w: number; h: number } {
  const [s, setS] = useState({ w: 0, h: 0 });
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => { const r = el.getBoundingClientRect(); setS((p) => (Math.abs(p.w - r.width) < 0.5 && Math.abs(p.h - r.height) < 0.5 ? p : { w: r.width, h: r.height })); };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return s;
}

/** Controlled/uncontrolled number state. */
export function useIndexState(value: number | undefined, def: number, onChange?: (i: number) => void): [number, (i: number) => void] {
  const [inner, setInner] = useState(def);
  const cur = value ?? inner;
  const set = (i: number) => { if (value === undefined) setInner(i); onChange?.(i); };
  return [cur, set];
}
