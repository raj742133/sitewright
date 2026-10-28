'use client';
import { useCallback, useRef, useState } from 'react';

export const clampN = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Controlled / uncontrolled state in one hook. */
export function useControlled<T>(value: T | undefined, def: T, onChange?: (v: T) => void): [T, (v: T) => void] {
  const [inner, setInner] = useState<T>(def);
  const cb = useRef(onChange);
  cb.current = onChange;
  const controlled = value !== undefined;
  const cur = controlled ? (value as T) : inner;
  const set = useCallback((v: T) => { if (!controlled) setInner(v); cb.current?.(v); }, [controlled]);
  return [cur, set];
}

/** Round a number to the precision of a step so 0.1 steps do not drift. */
export function snapTo(v: number, min: number, step: number): number {
  const s = step > 0 ? step : 1;
  const dec = (String(s).split('.')[1] || '').length;
  return Number((min + Math.round((v - min) / s) * s).toFixed(dec));
}
