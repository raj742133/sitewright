'use client';
import { useRef, type CSSProperties } from 'react';
import { mix, rgba, useCanvas2D, type Frame } from './_motion-gl-2d';

export interface RibbonsProps {
  /** Number of ribbons (default 3). */
  count?: number;
  /** Segments per ribbon; longer = longer tail (default 36). */
  length?: number;
  /** Head thickness in px (default 28). */
  thickness?: number;
  /** Ribbons follow the pointer; without it (or on touch) they swim on their own (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface Rib { x: number[]; y: number[]; hx: number; hy: number }
const STEP = 1 / 60;

/**
 * Soft tapered ribbons that trail the pointer on springs, or drift along looping paths when idle or
 * on touch. Canvas 2D; fills its parent. Decorative (aria-hidden); a settled still frame with
 * reduced motion.
 */
export default function Ribbons({ count = 3, length = 56, thickness = 34, interactive = true, className, style }: RibbonsProps) {
  const st = useRef<{ ribs: Rib[]; clock: number; px: number; py: number; w: number; h: number } | null>(null);
  const { wrapRef, canvasRef } = useCanvas2D((f: Frame) => {
    const { ctx, w, h, pal, ptr } = f;
    const n = Math.max(1, Math.round(count)), len = Math.max(6, Math.round(length));
    if (!st.current || f.fresh || st.current.ribs.length !== n || st.current.ribs[0]!.x.length !== len) {
      st.current = { ribs: Array.from({ length: n }, () => ({ x: new Array<number>(len).fill(w / 2), y: new Array<number>(len).fill(h / 2), hx: w / 2, hy: h / 2 })), clock: 0, px: w / 2, py: h / 2, w, h };
      // settle into a nice shape before the first paint so the still frame is already composed
      for (let i = 0; i < 240; i++) advance(st.current, STEP, f, false);
    }
    const s = st.current;
    const steps = f.reduced ? 0 : Math.min(4, Math.max(1, Math.round(f.dt / STEP)));
    for (let i = 0; i < steps; i++) advance(s, STEP, f, true);
    const cols = [pal.primary, mix(pal.signal, [255, 255, 255], 0.1), mix(pal.primary, [255, 255, 255], 0.35)];
    s.ribs.forEach((r, ri) => {
      const c = cols[ri % cols.length]!;
      const L = r.x.length;
      const left: number[] = [], right: number[] = [];
      for (let j = 0; j < L; j++) {
        const a = Math.max(0, j - 1), b = Math.min(L - 1, j + 1);
        const dx = r.x[b]! - r.x[a]!, dy = r.y[b]! - r.y[a]!, d = Math.hypot(dx, dy) || 1;
        const tp = j / (L - 1);
        const wd = thickness * Math.pow(1 - tp, 0.9) * (0.35 + 0.65 * Math.min(1, d / 6 + 0.25)) * (1 - ri * 0.12);
        left.push(r.x[j]! + (dy / d) * wd * 0.5, r.y[j]! - (dx / d) * wd * 0.5);
        right.push(r.x[j]! - (dy / d) * wd * 0.5, r.y[j]! + (dx / d) * wd * 0.5);
      }
      ctx.beginPath();
      ctx.moveTo(left[0]!, left[1]!);
      for (let j = 1; j < L; j++) ctx.lineTo(left[j * 2]!, left[j * 2 + 1]!);
      for (let j = L - 1; j >= 0; j--) ctx.lineTo(right[j * 2]!, right[j * 2 + 1]!);
      ctx.closePath();
      const g = ctx.createLinearGradient(r.x[0]!, r.y[0]!, r.x[L - 1]!, r.y[L - 1]!);
      g.addColorStop(0, rgba(c, 0.92));
      g.addColorStop(1, rgba(c, 0.04));
      ctx.fillStyle = g;
      ctx.fill();
    });
    void ptr;
  });
  /** One physics step: move the head toward the pointer / idle path, then let each segment chase the one before. */
  function advance(s: NonNullable<typeof st.current>, dt: number, f: Frame, live: boolean) {
    s.clock += dt;
    const usePtr = live && interactive && f.ptr.inside && !f.coarse;
    s.w = f.w; s.h = f.h;
    const tx = usePtr ? f.ptr.x : f.w * (0.5 + 0.38 * Math.sin(s.clock * 0.6) + 0.06 * Math.sin(s.clock * 1.9));
    const ty = usePtr ? f.ptr.y : f.h * (0.5 + 0.34 * Math.sin(s.clock * 0.8 + 1.2) * Math.cos(s.clock * 0.35));
    s.px += (tx - s.px) * Math.min(1, dt * 7);
    s.py += (ty - s.py) * Math.min(1, dt * 7);
    s.ribs.forEach((r, ri) => {
      const off = ri * 0.9;
      const ex = usePtr ? Math.sin(s.clock * 2.2 + off) * 10 : Math.sin(s.clock * 0.5 + off) * f.w * 0.07;
      const ey = usePtr ? Math.cos(s.clock * 1.8 + off) * 10 : Math.cos(s.clock * 0.6 + off * 1.3) * f.h * 0.1;
      const k = Math.min(1, dt * (9 - ri * 1.2));
      r.hx += (s.px + ex - r.hx) * k; r.hy += (s.py + ey - r.hy) * k;
      r.x[0] = r.hx; r.y[0] = r.hy;
      for (let j = 1; j < r.x.length; j++) {
        const kj = Math.min(1, dt * (13 - ri * 1.2));
        const wob = Math.sin(s.clock * 3 + j * 0.45 + off) * (j / r.x.length) * 3.2;
        r.x[j] = r.x[j]! + (r.x[j - 1]! - r.x[j]!) * kj;
        r.y[j] = r.y[j]! + (r.y[j - 1]! - r.y[j]! + wob) * kj;
      }
    });
  }
  return (
    <div ref={wrapRef} className={'ui-ribbons' + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-ribbons-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-ribbons-stage">
      <Ribbons />
      <span className="ui-ribbons-label">Follow the pointer</span>
    </div>
  );
}
