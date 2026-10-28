'use client';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/* Small shared helpers for the micro-a batch (menus, selects, chips, dials). */

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

/** Controlled/uncontrolled state in one hook: pass `value` to control, otherwise `initial` seeds internal state. */
export function useControlled<T>(value: T | undefined, initial: T, onChange?: (v: T) => void): [T, (v: T) => void] {
  const [inner, setInner] = useState<T>(initial);
  const controlled = value !== undefined;
  const set = useCallback((v: T) => { if (!controlled) setInner(v); onChange?.(v); }, [controlled, onChange]);
  return [controlled ? (value as T) : inner, set];
}

/** Calls onDismiss when a pointer goes down outside `ref` while `active`. */
export function useDismiss(ref: RefObject<HTMLElement | null>, active: boolean, onDismiss: () => void) {
  const cb = useRef(onDismiss);
  useEffect(() => { cb.current = onDismiss; });
  useEffect(() => {
    if (!active) return;
    const down = (e: PointerEvent) => { const el = ref.current; if (el && !el.contains(e.target as Node)) cb.current(); };
    document.addEventListener('pointerdown', down);
    return () => document.removeEventListener('pointerdown', down);
  }, [ref, active]);
}

/** Type-ahead for list widgets: returns a function (key, fromIndex) -> matching index or -1. Buffer clears after 600ms. */
export function useTypeahead(labels: string[]) {
  const buf = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback((key: string, from: number): number => {
    if (key.length !== 1 || key === ' ') return -1;
    buf.current += key.toLowerCase();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { buf.current = ''; }, 600);
    const n = labels.length;
    const single = buf.current.split('').every((c) => c === buf.current[0]);
    const q = single ? buf.current[0] ?? '' : buf.current;
    for (let k = 0; k < n; k++) {
      const i = (from + (single ? 1 : 0) + k) % n;
      if ((labels[i] ?? '').toLowerCase().startsWith(q)) return i;
    }
    return -1;
  }, [labels]);
}
