'use client';
// Small hooks shared by batch d1 (buttons). SSR-safe: nothing touches window until an effect runs.
import { useCallback, useEffect, useRef, useState } from 'react';

/** Tracks a media query. `false` during SSR and the first paint, then the real value. */
export function useMedia(query: string): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return on;
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');
export const useCoarsePointer = () => useMedia('(pointer: coarse)');

/** Timeouts that are all cleared on unmount. `later` returns nothing; `clear` cancels everything pending. */
export function useTimers() {
  const ids = useRef<number[]>([]);
  const clear = useCallback(() => { ids.current.forEach((i) => window.clearTimeout(i)); ids.current = []; }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => { ids.current = ids.current.filter((x) => x !== id); fn(); }, ms);
    ids.current.push(id);
  }, []);
  useEffect(() => clear, [clear]);
  return { later, clear };
}

/** Shared inline style for the little mono caption under demos. */
export const captionStyle = { font: '12px var(--font-mono, monospace)', color: 'var(--muted, #475569)' } as const;
