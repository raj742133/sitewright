'use client';
import { useEffect, useState } from 'react';

function useMedia(query: string): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const update = () => setOn(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return on;
}

export function useReducedMotion(): boolean {
  return useMedia('(prefers-reduced-motion: reduce)');
}

/** True only for devices with a fine primary pointer (mouse / trackpad). */
export function useFinePointer(): boolean {
  return useMedia('(pointer: fine)');
}

export function useControlled<T>(value: T | undefined, def: T, onChange?: (v: T) => void): [T, (v: T) => void] {
  const [inner, setInner] = useState<T>(def);
  const cur = value !== undefined ? value : inner;
  const set = (v: T) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
  };
  return [cur, set];
}
