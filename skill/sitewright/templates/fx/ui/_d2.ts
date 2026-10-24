'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** True when the user prefers reduced motion (false during SSR / first render). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export type RunState = 'idle' | 'running' | 'done';

/**
 * Simulated 0..100 progress run (no network). `start()` begins, `reset()` returns to idle.
 * The eased, slightly stuttering curve is deterministic so it is hydration safe.
 */
export function useFakeRun(ms = 2600, onDone?: () => void) {
  const [p, setP] = useState(0);
  const [state, setState] = useState<RunState>('idle');
  const raf = useRef(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const stop = useCallback(() => { cancelAnimationFrame(raf.current); raf.current = 0; }, []);
  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    stop();
    setP(0);
    setState('running');
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      // ease with two small plateaus so it feels like a real transfer
      const e = k < 0.4 ? k * 1.1 : k < 0.55 ? 0.44 + (k - 0.4) * 0.3 : 0.485 + (k - 0.55) * 1.145;
      setP(Math.min(100, Math.round(Math.min(1, e) * 100)));
      if (k >= 1) {
        setP(100);
        setState('done');
        raf.current = 0;
        doneRef.current?.();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [ms, stop]);

  const reset = useCallback(() => { stop(); setP(0); setState('idle'); }, [stop]);
  return { p, state, start, reset };
}
