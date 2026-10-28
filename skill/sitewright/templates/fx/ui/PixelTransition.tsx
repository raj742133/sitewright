'use client';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { readPalette, useReducedMotion, watchLive, watchPalette } from './_t2';
import { renderSource, sourceAlt, type Source } from './_motion-a';

export interface PixelTransitionProps {
  /** Picture shown at rest. */
  front?: Source;
  /** Picture it resolves into. */
  back?: Source;
  /** Caption over the front picture. */
  frontLabel?: string;
  /** Caption over the back picture. */
  backLabel?: string;
  /** hover: pointer and focus drive it (a click or Enter pins it); click: only press, tap or Enter. */
  trigger?: 'hover' | 'click';
  /** Controlled state: true shows the back picture. */
  active?: boolean;
  defaultActive?: boolean;
  onActiveChange?: (active: boolean) => void;
  /** Number of coarse stages between sharp and the biggest blocks. */
  steps?: number;
  /** Largest block size in px. */
  maxBlock?: number;
  /** Duration in ms. */
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

/** A transition that pixelates one picture into big blocks and resolves it into another, in a few chunky stages. Hover, focus, tap or Enter drives it; instant under reduced motion. */
export default function PixelTransition({
  front = { variant: 'dunes' }, back = { variant: 'city' }, frontLabel = 'Day', backLabel = 'Night', trigger = 'hover',
  active, defaultActive = false, onActiveChange, steps = 6, maxBlock = 56, duration = 800, className, style,
}: PixelTransitionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [inner, setInner] = useState(defaultActive);
  const [hover, setHover] = useState(false);
  const pinned = active ?? inner;
  const on = trigger === 'hover' ? pinned !== hover : pinned;
  const eng = useRef<{ to: (v: boolean) => void } | null>(null);
  const o = useRef({ steps, maxBlock, duration, reduced });
  useEffect(() => { o.current = { steps, maxBlock, duration, reduced }; });
  const sk = (s: Source) => s.src ?? s.variant ?? '';
  const key = sk(front) + '|' + sk(back);
  const pointer = useRef('mouse');

  useEffect(() => {
    const root = rootRef.current, cv = cvRef.current;
    if (!root || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const small = document.createElement('canvas');
    const sg = small.getContext('2d');
    if (!sg) return;
    let pal = readPalette(root);
    let a: HTMLCanvasElement | null = null, b: HTMLCanvasElement | null = null;
    let p = on ? 1 : 0, goal = p, raf = 0, last = 0, live = true, gen = 0;
    const paint = () => {
      if (!a || !b) return;
      const src = p < 0.5 ? a : b;
      const lvl = Math.round(Math.sin(p * Math.PI) * o.current.steps);
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (lvl <= 0) { ctx.imageSmoothingEnabled = true; ctx.drawImage(src, 0, 0); return; }
      const dpr = cv.width / Math.max(1, root.clientWidth);
      const bs = Math.max(2, Math.round(o.current.maxBlock * Math.pow(lvl / o.current.steps, 1.6) * dpr));
      small.width = Math.max(1, Math.ceil(cv.width / bs)); small.height = Math.max(1, Math.ceil(cv.height / bs));
      sg.imageSmoothingEnabled = true;
      sg.drawImage(src, 0, 0, small.width, small.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, small.width * bs, small.height * bs);
    };
    const frame = (t: number) => {
      raf = 0;
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      const d = dt / Math.max(1, o.current.duration);
      p = goal > p ? Math.min(goal, p + d) : Math.max(goal, p - d);
      paint();
      if (live && p !== goal) raf = requestAnimationFrame(frame); else last = 0;
    };
    const kick = () => { if (o.current.reduced) { p = goal; paint(); } else if (!raf && live) raf = requestAnimationFrame(frame); };
    const build = async () => {
      const my = ++gen;
      const r = root.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      cv.width = w; cv.height = h;
      const [ca, cb] = await Promise.all([renderSource(front, w, h, pal), renderSource(back, w, h, pal)]);
      if (my !== gen) return;
      a = ca; b = cb; paint();
    };
    eng.current = { to: (v) => { goal = v ? 1 : 0; kick(); } };
    void build();
    const ro = new ResizeObserver(() => { void build(); });
    ro.observe(root);
    let firstPal = true;
    const offP = watchPalette(root, (pl) => { pal = pl; if (firstPal) { firstPal = false; return; } void build(); });
    const offL = watchLive(root, (v) => { live = v; if (v) kick(); });
    return () => { gen++; ro.disconnect(); offP(); offL(); if (raf) cancelAnimationFrame(raf); eng.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { eng.current?.to(on); }, [on, reduced]);

  const toggle = () => {
    const next = !on;
    const base = trigger === 'hover' ? next !== hover : next;
    if (active === undefined) setInner(base);
    onActiveChange?.(base);
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
  const desc = (s: Source, l: string) => `${l}${sourceAlt(s) ? `: ${sourceAlt(s)}` : ''}`;

  return (
    <div ref={rootRef} role="button" tabIndex={0} aria-pressed={on} className={`ui-pixel-transition-root ${className ?? ''}`} style={style}
      aria-label={`${on ? desc(back, backLabel) : desc(front, frontLabel)}. Press to switch to ${on ? frontLabel : backLabel}.`}
      onKeyDown={onKey}
      onPointerDown={(e) => { pointer.current = e.pointerType; }}
      onPointerEnter={(e) => { if (trigger === 'hover' && e.pointerType === 'mouse') setHover(true); }}
      onPointerLeave={() => setHover(false)}
      onClick={() => { if (trigger === 'hover' && pointer.current === 'mouse') return; toggle(); }}>
      <canvas ref={cvRef} className="ui-pixel-transition-canvas" aria-hidden="true" />
      <span className="ui-pixel-transition-label" data-on={!on} aria-hidden="true">{frontLabel}</span>
      <span className="ui-pixel-transition-label" data-on={on} aria-hidden="true">{backLabel}</span>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-pixel-transition-demo">
      <PixelTransition front={{ variant: 'dunes' }} back={{ variant: 'city' }} frontLabel="Day" backLabel="Night" />
    </div>
  );
}
