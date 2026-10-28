'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { watchLive } from './_t2';
export { useReducedMotion, useCoarsePointer } from './_t2';

/* Shared helpers for the menus package: controlled state, dismiss (Escape / outside), roving tabindex, a proximity spring bank, demo stage and icons. */

/** Controlled when `value` is given, otherwise internal state seeded from `def`. */
export function useControlled<T>(value: T | undefined, def: T, onChange?: (v: T) => void): [T, (v: T) => void] {
  const [inner, setInner] = useState<T>(def);
  const ctrl = value !== undefined;
  const set = useCallback((v: T) => { if (!ctrl) setInner(v); onChange?.(v); }, [ctrl, onChange]);
  return [ctrl ? (value as T) : inner, set];
}

/** While `open`: Escape calls close(true) (caller returns focus to its trigger), a press outside `rootRef` calls close(false). */
export function useDismiss(open: boolean, close: (returnFocus: boolean) => void, rootRef: RefObject<HTMLElement | null>) {
  const cb = useRef(close);
  useEffect(() => { cb.current = close; });
  useEffect(() => {
    if (!open) return;
    const kd = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const a = document.activeElement;
      if (!a || a === document.body || rootRef.current?.contains(a)) cb.current(true);
    };
    const pd = (e: PointerEvent) => { const r = rootRef.current; if (r && !r.contains(e.target as Node)) cb.current(false); };
    document.addEventListener('keydown', kd);
    document.addEventListener('pointerdown', pd);
    return () => { document.removeEventListener('keydown', kd); document.removeEventListener('pointerdown', pd); };
  }, [open, rootRef]);
}

/** Roving tabindex: one tab stop, arrow keys / Home / End move focus. Spread `item(i)` on each focusable. */
export function useRoving(count: number, orientation: 'horizontal' | 'vertical' | 'both' = 'horizontal', start = 0) {
  const [index, setIndex] = useState(start);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const cur = Math.min(index, Math.max(0, count - 1));
  const focusAt = useCallback((i: number) => {
    const n = ((i % count) + count) % count;
    setIndex(n);
    refs.current[n]?.focus();
  }, [count]);
  const onKeyDown = (e: KeyboardEvent) => {
    const h = orientation !== 'vertical', v = orientation !== 'horizontal';
    const k = e.key;
    if ((k === 'ArrowRight' && h) || (k === 'ArrowDown' && v)) focusAt(cur + 1);
    else if ((k === 'ArrowLeft' && h) || (k === 'ArrowUp' && v)) focusAt(cur - 1);
    else if (k === 'Home') focusAt(0);
    else if (k === 'End') focusAt(count - 1);
    else return;
    e.preventDefault();
  };
  const item = (i: number) => ({
    ref: (el: HTMLElement | null) => { refs.current[i] = el; },
    tabIndex: i === cur ? 0 : -1,
    onFocus: () => setIndex(i),
  });
  return { index: cur, setIndex, refs, onKeyDown, item, focusAt };
}

export interface ProximityOpts {
  /** Row element the items are laid out in (its offsetParent coordinates are used). */
  items: RefObject<(HTMLElement | null)[]>;
  /** Distance in px over which the effect fades out. */
  radius: number;
  /** Scale of the item directly under the pointer. */
  peak: number;
  /** Skip the spring: jump straight to the target (reduced motion). */
  instant: boolean;
  stiffness?: number;
  damping?: number;
  /** Receives each item's scale and the x shift (px) that keeps neighbours from overlapping. */
  apply: (i: number, scale: number, dx: number) => void;
}

/** A bank of springs driven by the pointer's distance to each item. Runs rAF only while something moves, and not off-screen. */
export function useProximity(rootRef: RefObject<HTMLElement | null>, o: ProximityOpts) {
  const oRef = useRef(o);
  useEffect(() => { oRef.current = o; });
  const api = useMemo(() => {
    const s = { ptr: null as number | null, foc: null as number | null, sc: [] as number[], vel: [] as number[], raf: 0, live: true, last: 0,
      st: [] as number[], w: [] as number[] };
    const measure = () => {
      const els = oRef.current.items.current ?? [];
      s.st = els.map((e) => e?.offsetLeft ?? 0);
      s.w = els.map((e) => e?.offsetWidth ?? 0);
      if (s.sc.length !== els.length) { s.sc = els.map(() => 1); s.vel = els.map(() => 0); }
    };
    const frame = (t: number) => {
      s.raf = 0;
      const op = oRef.current;
      const n = s.st.length;
      if (!n) return;
      const dt = Math.min(0.032, Math.max(0.001, (t - (s.last || t - 16)) / 1000));
      s.last = t;
      const pos = s.ptr ?? (s.foc != null ? (s.st[s.foc] ?? 0) + (s.w[s.foc] ?? 0) / 2 : null);
      const k = op.stiffness ?? 260, c = op.damping ?? 20;
      let moving = false;
      for (let i = 0; i < n; i++) {
        const d = pos == null ? Infinity : Math.abs(pos - ((s.st[i] ?? 0) + (s.w[i] ?? 0) / 2));
        const u = Math.max(0, 1 - d / op.radius);
        const target = 1 + (op.peak - 1) * (u * u * (3 - 2 * u));
        let x = s.sc[i] ?? 1, v = s.vel[i] ?? 0;
        if (op.instant) { x = target; v = 0; } else {
          v += (k * (target - x) - c * v) * dt;
          x += v * dt;
          if (Math.abs(target - x) < 0.002 && Math.abs(v) < 0.02) { x = target; v = 0; } else moving = true;
        }
        s.sc[i] = x; s.vel[i] = v;
      }
      let w0 = 0, w1 = 0, run = s.st[0] ?? 0;
      const pos2: number[] = [];
      for (let i = 0; i < n; i++) {
        const sc = s.sc[i] ?? 1, w = s.w[i] ?? 0;
        pos2.push(run);
        const gap = i + 1 < n ? (s.st[i + 1] ?? 0) - (s.st[i] ?? 0) - w : 0;
        run += w * sc + gap;
        w0 += w; w1 += w * sc;
      }
      const shift = -(w1 - w0) / 2;
      for (let i = 0; i < n; i++) {
        const sc = s.sc[i] ?? 1, w = s.w[i] ?? 0;
        op.apply(i, sc, (pos2[i] ?? 0) + (w * sc) / 2 + shift - ((s.st[i] ?? 0) + w / 2));
      }
      if (moving && s.live) s.raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!s.raf && s.live) { s.last = 0; s.raf = requestAnimationFrame(frame); } };
    return {
      point: (x: number | null) => { if (x != null && !s.st.length) measure(); s.ptr = x; kick(); },
      focus: (i: number | null) => { if (i != null && !s.st.length) measure(); s.foc = i; kick(); },
      measure: () => { measure(); kick(); },
      setLive: (v: boolean) => { s.live = v; if (v) kick(); },
      stop: () => { if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0; },
    };
  }, []);
  useEffect(() => {
    const el = rootRef.current;
    api.measure();
    const off = el ? watchLive(el, api.setLive) : undefined;
    const ro = typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(() => api.measure()) : null;
    if (ro && el) ro.observe(el);
    return () => { off?.(); ro?.disconnect(); api.stop(); };
  }, [rootRef, api]);
  return api;
}

/* ---------- icons ---------- */
const PATHS: Record<string, string> = {
  home: 'M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm5 12 4 4',
  folder: 'M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  mail: 'M4 6h16v12H4zm0 1 8 6 8-6',
  music: 'M9 17V6l10-2v11M9 17a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zm10-2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  camera: 'M4 8h3l1.5-2h7L17 8h3v11H4zm8 2.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0-5v2m0 12v2M4 12h2m12 0h2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4M7.7 16.3l-1.4 1.4',
  user: 'M12 5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM5 20a7 7 0 0 1 14 0',
  chat: 'M4 5h16v11H9l-5 4z',
  star: 'M12 4l2.4 5 5.6.7-4.1 3.8 1.1 5.5L12 16.2 7 19l1.1-5.5L4 9.7 9.6 9z',
  grid: 'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z',
  check: 'M5 12.5 10 17.5 19 7',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  bolt: 'M13 3 5 13h6l-1 8 8-10h-6z',
};
/** A small original line icon (24x24, currentColor). */
export function Icon({ name, size = 22, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      <path d={PATHS[name] ?? PATHS.star} />
    </svg>
  );
}

/** Demo backdrop: a soft brand-tinted scene with faux page content so glass and shadows read. Fills its parent and contains whatever is placed inside. */
export function Stage({ children, className = '', align = 'center' }: { children?: ReactNode; className?: string; align?: 'center' | 'top' | 'bottom' | 'stretch' }) {
  return (
    <div className={`ui-menus-stage is-${align} ${className}`}>
      <div className="ui-menus-stage-art" aria-hidden="true">
        <i className="ui-menus-stage-blob a" /><i className="ui-menus-stage-blob b" />
        <span className="ui-menus-stage-h" /><span className="ui-menus-stage-l w1" /><span className="ui-menus-stage-l w2" /><span className="ui-menus-stage-l w3" />
        <span className="ui-menus-stage-card" /><span className="ui-menus-stage-card c2" />
      </div>
      <div className="ui-menus-stage-body">{children}</div>
    </div>
  );
}
