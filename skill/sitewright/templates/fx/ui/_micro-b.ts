'use client';
import { useEffect, useState, type RefObject } from 'react';
import { watchLive } from './_t2';

/* Shared helpers for the micro-b batch of small interactions. */

/** True while the element is on screen and the tab is visible (pauses looping CSS animation otherwise). SSR renders `true`. */
export function useLive(ref: RefObject<Element | null>): boolean {
  const [live, setLive] = useState(true);
  useEffect(() => {
    const el = ref.current;
    return el ? watchLive(el, setLive) : undefined;
  }, [ref]);
  return live;
}

/** Deterministic pseudo-random number in [-1, 1] from an integer seed (no Math.random, SSR safe). */
export function jitter(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
