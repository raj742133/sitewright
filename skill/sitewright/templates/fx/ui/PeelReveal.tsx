'use client';
import { useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { useReducedMotion } from './_d5';

export interface PeelRevealProps {
  /** The sticker face (default: a promo tile). */
  front?: ReactNode;
  /** What sits underneath (default: a promo code). */
  back?: ReactNode;
  /** Card height in px. */
  height?: number;
  className?: string;
}

type Corner = 'tl' | 'tr' | 'br' | 'bl';
const ANGLE: Record<Corner, number> = { br: 135, tr: 45, bl: 225, tl: 315 };
const pt = (x: 0 | 1, dx: number, y: 0 | 1, dy: number) => `calc(${x * 100}% + ${dx}px) calc(${y * 100}% + ${dy}px)`;

/** Polygons (CSS calc based, so no measuring) for the face with a folded-off corner, and for the folded flap. */
function shapes(c: Corner, s: number) {
  const cx = c === 'tr' || c === 'br' ? 1 : 0, cy = c === 'bl' || c === 'br' ? 1 : 0;
  const dx = cx ? -s : s, dy = cy ? -s : s;
  const A = pt(cx as 0 | 1, dx, cy as 0 | 1, 0), B = pt(cx as 0 | 1, 0, cy as 0 | 1, dy), R = pt(cx as 0 | 1, dx, cy as 0 | 1, dy);
  const cut = c === 'tl' || c === 'br' ? [B, A] : [A, B];
  const rect: Record<Corner, string[]> = {
    tl: [...cut, pt(1, 0, 0, 0), pt(1, 0, 1, 0), pt(0, 0, 1, 0)],
    tr: [pt(0, 0, 0, 0), ...cut, pt(1, 0, 1, 0), pt(0, 0, 1, 0)],
    br: [pt(0, 0, 0, 0), pt(1, 0, 0, 0), ...cut, pt(0, 0, 1, 0)],
    bl: [pt(0, 0, 0, 0), pt(1, 0, 0, 0), pt(1, 0, 1, 0), ...cut],
  };
  return { face: `polygon(${rect[c].join(',')})`, flap: `polygon(${A},${B},${R})` };
}

/** A sticker whose corner peels back (following the pointer's corner) to show what is underneath. The corner button toggles it for keyboard and touch. */
export default function PeelReveal({ front, back, height = 150, className }: PeelRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [peel, setPeel] = useState<{ c: Corner; s: number }>({ c: 'br', s: 16 });
  const [pinned, setPinned] = useState(false);
  const move = (e: RPointerEvent) => {
    if (e.pointerType === 'touch' || pinned || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const c: Corner = `${y < r.height / 2 ? 't' : 'b'}${x < r.width / 2 ? 'l' : 'r'}` as Corner;
    const dxc = c.endsWith('l') ? x : r.width - x, dyc = c.startsWith('t') ? y : r.height - y;
    const d = Math.hypot(dxc, dyc), m = Math.min(r.width, r.height);
    setPeel({ c, s: Math.round(Math.min(m * 0.7, Math.max(16, m * 0.85 - d * 0.7))) });
  };
  const leave = () => { if (!pinned) setPeel((p) => ({ c: p.c, s: 16 })); };
  const toggle = () => {
    const next = !pinned; setPinned(next);
    const m = ref.current ? Math.min(ref.current.clientWidth, ref.current.clientHeight) : 120;
    setPeel({ c: 'br', s: next ? Math.round(m * 0.7) : 16 });
  };
  const { face, flap } = shapes(peel.c, peel.s);
  const tr = reduced ? 'none' : 'clip-path 0.14s ease-out';
  const flapStyle: CSSProperties = {
    clipPath: flap, transition: tr,
    background: `linear-gradient(${ANGLE[peel.c]}deg, var(--raised-2, #e2e8f0) 10%, var(--raised, #fff) 100%)`,
  };
  return (
    <div className={`ui-peel-reveal-root ${className ?? ''}`} style={{ height }} ref={ref} onPointerMove={move} onPointerLeave={leave}>
      <div className="ui-peel-reveal-under">{back ?? (
        <><span className="ui-peel-reveal-kicker">Your code</span><strong className="ui-peel-reveal-code">PEEL-25</strong><span>25% off your first order</span></>
      )}</div>
      <div className="ui-peel-reveal-face" style={{ clipPath: face, transition: tr }}>{front ?? (
        <><span className="ui-peel-reveal-kicker">Spring offer</span><strong className="ui-peel-reveal-big">Peel for a surprise</strong><span>Hover a corner or press the button</span></>
      )}</div>
      <div className="ui-peel-reveal-flap-wrap" aria-hidden="true"><div className="ui-peel-reveal-flap" style={flapStyle} /></div>
      <button type="button" className="ui-peel-reveal-btn" aria-pressed={pinned} aria-label={pinned ? 'Stick the corner back down' : 'Peel back the corner'} onClick={toggle}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d={pinned ? 'M3 3l10 10M13 6v7H6' : 'M13 13L3 3M3 10V3h7'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}

export function Demo() {
  return <PeelReveal height={150} />;
}
