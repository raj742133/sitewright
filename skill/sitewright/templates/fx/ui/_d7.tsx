'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';

export const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function useReduced(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setR(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return r;
}

/** Entry choreography: `armed` hides content before paint (never when reduced motion), `shown` flips once visible. */
export function useEntry(ref: RefObject<Element | null>, rekey: unknown = 0) {
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);
  useIso(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setArmed(false); setShown(true); return; }
    setArmed(true); setShown(false);
  }, [rekey]);
  useEffect(() => {
    const el = ref.current;
    if (!armed || !el) return;
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [armed, ref, rekey]);
  return { armed, shown, cls: (armed ? ' is-armed' : '') + (shown ? ' is-in' : '') };
}

/** Count-up number; returns the target right away on the server / reduced motion. */
export function useCountUp(target: number, run: boolean, ms = 1100): number {
  const [v, setV] = useState(target);
  const from = useRef<number | null>(null);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { from.current = target; setV(target); return; }
    const start = from.current ?? 0;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setV(start + (target - start) * e);
      if (k < 1) raf = requestAnimationFrame(step); else from.current = target;
    };
    setV(start);
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = target; };
  }, [target, run, ms]);
  return v;
}

export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export function Avatar({ name, size = 28, hue, style }: { name: string; size?: number; hue?: number; style?: CSSProperties }) {
  const ini = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  let h = hue;
  if (h === undefined) { h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360; }
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', flex: 'none', fontSize: Math.max(10, size * 0.4), fontWeight: 700, color: '#fff', background: `hsl(${h} 45% 28%)`, letterSpacing: '.02em', ...style }}>{ini}</span>
  );
}

/** Gallery miniature: renders children at `width` px wide, scaled to fit the parent, inside a 150px stage. */
export function Mini({ children, width = 1000, height = 150 }: { children: ReactNode; width?: number; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.28);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const set = () => setK(Math.max(0.1, el.clientWidth / width));
    set();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={box} style={{ width: '100%', height, overflow: 'hidden', position: 'relative', borderRadius: 8 }} aria-hidden="true">
      <div inert style={{ width, transform: `scale(${k})`, transformOrigin: 'top left', pointerEvents: 'none', position: 'absolute', left: 0, top: 0 }}>{children}</div>
    </div>
  );
}
