'use client';
/*
 * Adapted from BoardUI (MIT), Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI), (free tier). See THIRD_PARTY_NOTICES.md.
 * Shared kit of the BoardUI-style components (stat cards, chart cards, segmented control, notification center, data table, sidebar, auth card).
 * What changed from upstream: Tailwind classes are plain CSS on host tokens (ui-bui-base.css), react-aria / remixicon / recharts / tanstack are
 * replaced by small hand-written parts (inline SVG icons, native controls, SVG charts), nothing random or time based runs in a first render.
 */
import { useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode, type RefObject } from 'react';

export const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(' ');
export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/* ------------------------------------------------------------------ icons: 24px strokes, drawn for this kit */
const P: Record<string, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  users: 'M16 20v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 18.5V20M10 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 20v-1.5a3.5 3.5 0 00-2.5-3.35M15.5 5.2a3.5 3.5 0 010 6.6',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  basket: 'M3 9h18l-1.6 9.2a2 2 0 01-2 1.8H6.6a2 2 0 01-2-1.8zM8 9l3-5M16 9l-3-5',
  chat: 'M5 4h14a1 1 0 011 1v11a1 1 0 01-1 1H9l-4 4v-4a1 1 0 01-1-1V5a1 1 0 011-1zM9 10h.01M15 10h.01M9.5 13a3.5 3.5 0 005 0',
  coins: 'M12 11c3.9 0 7-1.8 7-4s-3.1-4-7-4-7 1.8-7 4 3.1 4 7 4zM5 7v4c0 2.2 3.1 4 7 4s7-1.8 7-4V7M5 11v4c0 2.2 3.1 4 7 4s7-1.8 7-4v-4',
  refund: 'M3 12a9 9 0 109-9M3 4v5h5M12 8v8M9.8 10c.3-.8 1.2-1.2 2.2-1.2 1.2 0 2.2.5 2.2 1.4 0 2-4.4.9-4.4 2.9 0 .9 1 1.4 2.2 1.4 1 0 1.9-.4 2.2-1.2',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5v.01',
  'up-circle': 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16V8M8.5 11.5L12 8l3.5 3.5',
  'down-circle': 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v8M8.5 12.5L12 16l3.5-3.5',
  'flat-circle': 'M12 21a9 9 0 100-18 9 9 0 000 18zM8.5 12h7',
  'check-circle': 'M12 21a9 9 0 100-18 9 9 0 000 18zM8.5 12.5l2.5 2.5 4.5-5',
  'alert-circle': 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7.5v5M12 16v.01',
  bell: 'M6 9a6 6 0 0112 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 004 0',
  'bell-off': 'M6 9a6 6 0 019.5-4.9M18 9c0 3 .6 4.6 1.2 5.6M4 16s2-1 2-7M10 20a2 2 0 004 0M3 3l18 18',
  'download-cloud': 'M7 18a4.5 4.5 0 01-.5-9A6 6 0 0118 9.5 4 4 0 0117.5 18M12 11v8M9 16l3 3 3-3',
  'git-pr': 'M6 8a2 2 0 100-4 2 2 0 000 4zM6 8v8M6 20a2 2 0 100-4 2 2 0 000 4zM18 20a2 2 0 100-4 2 2 0 000 4zM18 16V9a3 3 0 00-3-3h-3M14 3l-2 3 2 3',
  shield: 'M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-5',
  'user-add': 'M14 20v-1.5a3.5 3.5 0 00-3.5-3.5h-4A3.5 3.5 0 003 18.5V20M8.5 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19 8v6M16 11h6',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5',
  close: 'M6 6l12 12M18 6L6 18',
  sidebar: 'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM9 5v14',
  kanban: 'M4 4h16v16H4zM9 4v16M15 4v9',
  megaphone: 'M3 10v4h3l8 5V5L6 10zM18 9a4 4 0 010 6',
  calendar: 'M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM4 10h16M8 3v4M16 3v4',
  bank: 'M3 9l9-5 9 5M5 9v9M9 9v9M15 9v9M19 9v9M3 20h18',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM9 19.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  headset: 'M4 14v-2a8 8 0 0116 0v2M4 14h3v5H5a1 1 0 01-1-1zM20 14h-3v5h2a1 1 0 001-1zM17 19c0 1.5-2 2-5 2',
  down: 'M6 9l6 6 6-6',
  updown: 'M8 9l4-4 4 4M8 15l4 4 4-4',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  more: 'M12 5h.01M12 12h.01M12 19h.01',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  download: 'M12 4v11M7.5 11L12 15.5 16.5 11M5 20h14',
  archive: 'M3 5h18v4H3zM5 9v10h14V9M10 13h4',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20a7.5 7.5 0 0115 0',
  folder: 'M3 6a1 1 0 011-1h5l2 2h9a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1z',
  card: 'M3 6h18v12H3zM3 10h18M7 15h3',
  school: 'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6',
  logout: 'M10 4H5a1 1 0 00-1 1v14a1 1 0 001 1h5M15 8l4 4-4 4M19 12H9',
  plus: 'M12 5v14M5 12h14',
  'mail-check': 'M3 6h18v12H3zM3 7l9 6 9-6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  'eye-off': 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6zM4 4l16 16',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  google: 'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z',
  apple: 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701',
  github: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
};
const FILLED = new Set(['google', 'apple', 'github']); // brand glyphs (Simple Icons, CC0) are filled; everything else is a stroke
export type BuiIcon = keyof typeof P;
export function Ico({ name, size = 20, className, sw = 1.75 }: { name: BuiIcon | string; size?: number; className?: string; sw?: number }) {
  const filled = FILLED.has(name);
  return (
    <svg className={cx('bui-ico', className)} width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth={name === 'more' ? 3 : sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={P[name] ?? P.more} />
    </svg>
  );
}

/* ------------------------------------------------------------------ small parts: chip, badge, status dot, kbd, avatar */
export type ChipColor = 'orange' | 'lime' | 'rose' | 'yellow' | 'cyan' | 'blue' | 'purple' | 'neutral' | 'gray' | 'soft';
export type ChipVariant = 'bold' | 'subtle' | 'caption';
export function Chip({ variant = 'bold', color = 'neutral', className, ...p }: { variant?: ChipVariant; color?: ChipColor } & HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('bui-chip', `is-${variant}`, `c-${color}`, className)} {...p} />;
}
export function Badge({ color = 'neutral', className, ...p }: { color?: 'primary' | 'neutral' } & HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('bui-badge', `c-${color}`, className)} {...p} />;
}
export function StatusDot({ color = 'green', className }: { color?: 'green' | 'yellow' | 'indigo'; className?: string }) {
  return <span className={cx('bui-sdot', `c-${color}`, className)} aria-hidden="true"><i /></span>;
}
export function Kbd({ className, ...p }: HTMLAttributes<HTMLElement>) {
  return <kbd className={cx('bui-kbd', className)} {...p} />;
}
/** Initials on a hue derived from the name (stable, so server and client agree). */
export function Avatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  const ini = name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return <span className={cx('bui-avatar', className)} aria-hidden="true" style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.4)), ['--h' as string]: h }}>{ini}</span>;
}

/* ------------------------------------------------------------------ hooks */
export function usePrefersReducedMotion(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => { const m = window.matchMedia('(prefers-reduced-motion: reduce)'); const f = () => setR(m.matches); f(); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  return r;
}
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
/** Rolls a number from its current value to `target`. The first render shows the target (so server and client agree); reduced motion jumps. */
export function useCountUp(target: number, duration = 320): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const a = from.current;
    if (a === target) return;
    if (reduced) { from.current = target; setShown(target); return; }
    const t0 = performance.now(); let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / duration); const v = Math.round(a + (target - a) * ease(k));
      from.current = v; setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);
  return shown;
}
/** Size of an element, with a fixed deterministic fallback for the first render. */
export function useSize<T extends HTMLElement>(fw = 640, fh = 220): [RefObject<T | null>, number, number] {
  const ref = useRef<T>(null); const [s, setS] = useState({ w: fw, h: fh });
  useIsoLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const f = () => { const w = Math.round(el.clientWidth), h = Math.round(el.clientHeight); if (w > 0 && h > 0) setS((o) => (o.w === w && o.h === h ? o : { w, h })); };
    f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, s.w, s.h];
}
export function useControlled<T>(value: T | undefined, def: T, onChange?: (v: T) => void): [T, (v: T) => void] {
  const [inner, setInner] = useState<T>(def); const ctrl = value !== undefined;
  return [ctrl ? (value as T) : inner, (v: T) => { if (!ctrl) setInner(v); onChange?.(v); }];
}

/* ------------------------------------------------------------------ formatting */
export const money = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
export const num = (v: number) => Math.round(v).toLocaleString('en-US');
/** Percent change between two figures, as a chip label and a tone. */
export function describeDelta(current: number, previous: number): { label: string; color: ChipColor } {
  if (previous === 0) return { label: 'New', color: 'neutral' };
  const r = Math.round(((current - previous) / previous) * 1000) / 10;
  if (r === 0) return { label: '0%', color: 'neutral' };
  return { label: `${r > 0 ? '+' : ''}${r}%`, color: r > 0 ? 'lime' : 'rose' };
}

export function Sr({ children }: { children: ReactNode }) { return <span className="bui-sr">{children}</span>; }
