'use client';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { useReducedMotion } from './_t2';
import { Art, cx } from './_motion-a';

export type PeelCorner = 'tl' | 'tr' | 'bl' | 'br';

export interface StickerPeelProps {
  /** The sticker face. Defaults to a drawn sticker. It fills the sticker. */
  children?: ReactNode;
  /** Corner that curls up. */
  corner?: PeelCorner;
  width?: number;
  height?: number;
  /** Tilt of the sticker in degrees. */
  rotate?: number;
  /** Corner radius of the sticker in px. */
  radius?: number;
  /** Peel amount as a fraction of the sticker (0 to 1): controlled. */
  peel?: number;
  defaultPeel?: number;
  onPeelChange?: (peel: number) => void;
  /** How far hovering near the corner lifts it (0 to 1). */
  hoverPeel?: number;
  /** Colour of the paper backing. */
  backing?: string;
  /** Accessible name. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

type V = [number, number];
const REST = 12;

/** Clip a convex polygon to the half-plane n.(x - m) >= 0 (keep = 1) or <= 0 (keep = -1). */
function clipPoly(poly: V[], n: V, m: V, keep: 1 | -1): V[] {
  const f = (p: V) => keep * (n[0] * (p[0] - m[0]) + n[1] * (p[1] - m[1]));
  const out: V[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i] as V, b = poly[(i + 1) % poly.length] as V;
    const fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
const poly = (p: V[]) => (p.length < 3 ? 'polygon(0 0, 0 0, 0 0)' : `polygon(${p.map((q) => `${q[0].toFixed(1)}px ${q[1].toFixed(1)}px`).join(', ')})`);

function StickerArt() {
  return (
    <div className="ui-sticker-peel-art">
      <Art variant="tide" />
      <span>Make<br />waves</span>
    </div>
  );
}

/** A sticker with a lifting corner: hover near the corner to curl it, drag it to peel back further (release past halfway and it stays peeled; drag back, tap or press Enter to stick it down). A real fold line, backing paper and shading are computed from geometry. Arrow keys adjust the peel. */
export default function StickerPeel({
  children, corner = 'br', width = 168, height = 168, rotate = -5, radius = 22, peel, defaultPeel = 0, onPeelChange, hoverPeel = 0.3,
  backing = '#ebe6d8', label = 'Sticker', className, style,
}: StickerPeelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [inner, setInner] = useState(defaultPeel);
  const value = peel ?? inner;
  const maxD = Math.min(width, height) * 0.92;
  const C: V = [corner[1] === 'r' ? width : 0, corner[0] === 'b' ? height : 0];
  const st = useRef({ d: REST, dx: 0, dy: 0, td: REST, tdx: 0, tdy: 0, raf: 0, drag: false, hover: 0, sx: 0, sy: 0 });
  const cfg = useRef({ width, height, C, maxD, reduced, rotate, value });
  const draw = useRef<() => void>(() => {});
  const run = useRef<() => void>(() => {});
  useEffect(() => { cfg.current = { width, height, C, maxD, reduced, rotate, value }; });

  const toCentre = (): V => { const x = width / 2 - C[0], y = height / 2 - C[1]; const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

  useEffect(() => {
    const s = st.current;
    draw.current = () => {
      const c = cfg.current, [cx0, cy0] = c.C;
      const fr = frontRef.current, fl = flapRef.current, sh = shadeRef.current;
      if (!fr || !fl || !sh) return;
      const rect: V[] = [[0, 0], [c.width, 0], [c.width, c.height], [0, c.height]];
      const l = Math.hypot(s.dx, s.dy) || 1, n: V = [s.dx / l, s.dy / l];
      if (s.d < 0.8) { fr.style.clipPath = 'none'; fl.style.visibility = 'hidden'; sh.style.background = 'none'; return; }
      const m: V = [cx0 + n[0] * s.d / 2, cy0 + n[1] * s.d / 2];
      const front = clipPoly(rect, n, m, 1), flap = clipPoly(rect, n, m, -1);
      fr.style.clipPath = poly(front);
      fl.style.visibility = 'visible';
      fl.style.clipPath = poly(flap);
      const nm = n[0] * m[0] + n[1] * m[1];
      fl.style.transform = `matrix(${1 - 2 * n[0] * n[0]}, ${-2 * n[0] * n[1]}, ${-2 * n[0] * n[1]}, ${1 - 2 * n[1] * n[1]}, ${2 * nm * n[0]}, ${2 * nm * n[1]})`;
      // gradients run along n
      const ang = (Math.atan2(n[0], -n[1]) * 180) / Math.PI, a = (ang * Math.PI) / 180;
      const L = Math.abs(c.width * Math.sin(a)) + Math.abs(c.height * Math.cos(a));
      const tOf = (p: V) => (((p[0] - c.width / 2) * n[0] + (p[1] - c.height / 2) * n[1]) / L + 0.5) * 100;
      const tf = tOf(m), tc = tOf([cx0, cy0]);
      fl.style.setProperty('--ui-sp-bg', `linear-gradient(${ang.toFixed(1)}deg, rgba(255,255,255,0.55) ${tc.toFixed(1)}%, rgba(0,0,0,0.3) ${tf.toFixed(1)}%)`);
      const spread = Math.min(18, 3 + s.d / 6) / L * 100;
      sh.style.background = `linear-gradient(${ang.toFixed(1)}deg, transparent ${(tf - 0.1).toFixed(1)}%, rgba(0,0,0,0.34) ${(tf + 0.1).toFixed(1)}%, transparent ${(tf + spread).toFixed(1)}%)`;
    };
    const tick = () => {
      s.raf = 0;
      const c = cfg.current;
      const k = c.reduced ? 1 : 0.2;
      s.d += (s.td - s.d) * k; s.dx += (s.tdx - s.dx) * k; s.dy += (s.tdy - s.dy) * k;
      const done = Math.abs(s.td - s.d) < 0.1 && Math.abs(s.tdx - s.dx) < 0.002 && Math.abs(s.tdy - s.dy) < 0.002;
      if (done) { s.d = s.td; s.dx = s.tdx; s.dy = s.tdy; }
      draw.current();
      if (!done) s.raf = requestAnimationFrame(tick);
    };
    run.current = () => { if (!s.raf) s.raf = requestAnimationFrame(tick); };
    const c0 = toCentre();
    s.dx = s.tdx = c0[0]; s.dy = s.tdy = c0[1];
    return () => { if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // target from the controlled/uncontrolled value, hover and drag
  useEffect(() => {
    const s = st.current;
    if (!s.drag) {
      const c = toCentre();
      s.tdx = c[0]; s.tdy = c[1];
      s.td = Math.max(REST, value * maxD, s.hover * maxD * hoverPeel * 2);
    }
    if (s.dx === 0 && s.dy === 0) { s.dx = s.tdx; s.dy = s.tdy; }
    run.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, corner, width, height, maxD, hoverPeel]);

  const local = (e: PointerEvent): V => {
    const r = rootRef.current?.getBoundingClientRect();
    if (!r) return [0, 0];
    const ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    const a = (-rotate * Math.PI) / 180, dx = e.clientX - ox, dy = e.clientY - oy;
    return [dx * Math.cos(a) - dy * Math.sin(a) + width / 2, dx * Math.sin(a) + dy * Math.cos(a) + height / 2];
  };
  const setValue = (v: number) => { const x = Math.max(0, Math.min(1, v)); if (peel === undefined) setInner(x); onPeelChange?.(x); };
  const onMove = (e: PointerEvent) => {
    const s = st.current;
    const p = local(e);
    if (s.drag) {
      const vx = p[0] - C[0], vy = p[1] - C[1], l = Math.hypot(vx, vy);
      if (l > 1) { s.tdx = vx / l; s.tdy = vy / l; s.td = Math.max(REST, Math.min(maxD, l)); run.current(); }
      return;
    }
    if (e.pointerType === 'touch') return;
    const dist = Math.hypot(p[0] - C[0], p[1] - C[1]), reach = Math.min(width, height) * 0.75;
    s.hover = Math.max(0, 1 - dist / reach);
    s.td = Math.max(REST, value * maxD, s.hover * maxD * hoverPeel * 2);
    run.current();
  };
  const onDown = (e: PointerEvent) => {
    const s = st.current, p = local(e);
    if (Math.hypot(p[0] - C[0], p[1] - C[1]) > Math.min(width, height) * 0.6) return;
    s.drag = true; s.sx = e.clientX; s.sy = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
    onMove(e);
  };
  const onUp = (e: PointerEvent) => {
    const s = st.current;
    if (!s.drag) return;
    s.drag = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    const tap = Math.hypot(e.clientX - s.sx, e.clientY - s.sy) < 6;
    const next = tap ? (value > 0.3 ? 0 : 0.7) : s.td > maxD * 0.55 ? s.td / maxD : value;
    const c = toCentre(); s.tdx = c[0]; s.tdy = c[1];
    setValue(next > 0.55 ? next : 0);
    s.td = Math.max(REST, (next > 0.55 ? next : 0) * maxD, s.hover * maxD * hoverPeel * 2);
    run.current();
  };
  const onKey = (e: KeyboardEvent) => {
    const step = 0.1;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') setValue(value + step);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') setValue(value - step);
    else if (e.key === 'Home') setValue(0);
    else if (e.key === 'End') setValue(1);
    else if (e.key === 'Enter' || e.key === ' ') setValue(value > 0.3 ? 0 : 0.7);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={rootRef} className={cx('ui-sticker-peel-root', className)} role="slider" tabIndex={0} aria-label={`${label}. Drag the ${corner === 'br' ? 'bottom right' : corner === 'bl' ? 'bottom left' : corner === 'tr' ? 'top right' : 'top left'} corner or use the arrow keys to peel.`}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-valuetext={`${Math.round(value * 100)} percent peeled`}
      style={{ width, height, '--ui-sp-r': radius + 'px', '--ui-sp-back': backing, ...style } as CSSProperties}
      onPointerMove={onMove} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp}
      onPointerLeave={() => { const s = st.current; if (s.drag) return; s.hover = 0; s.td = Math.max(REST, value * maxD); run.current(); }}
      onKeyDown={onKey}>
      <div className="ui-sticker-peel-stage" style={{ transform: `rotate(${rotate}deg)` }}>
        <div ref={frontRef} className="ui-sticker-peel-front">
          <div className="ui-sticker-peel-face">{children ?? <StickerArt />}</div>
          <div ref={shadeRef} className="ui-sticker-peel-shade" />
        </div>
        <div ref={flapRef} className="ui-sticker-peel-flap" style={{ visibility: 'hidden' }}><div className="ui-sticker-peel-paper" /></div>
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-sticker-peel-demo">
      <div className="ui-sticker-peel-lid" aria-hidden="true" />
      <StickerPeel width={148} height={148} corner="br" />
    </div>
  );
}
