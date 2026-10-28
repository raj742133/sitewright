'use client';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { useReducedMotion, watchLive } from './_t2';
import { cx } from './_motion-a';

export type BlurShape = 'circle' | 'rounded' | 'triangle' | 'diamond' | 'hexagon' | 'star';

export interface ShapeBlurProps {
  /** The shape that drifts and blurs. */
  shape?: BlurShape;
  /** Shape size in px. */
  size?: number;
  /** Blur at rest in px. */
  restBlur?: number;
  /** Extra blur gained at speed, up to this many px. */
  maxBlur?: number;
  /** Fill: a CSS colour or gradient. Default blends the primary and signal tokens. */
  fill?: string;
  /** Opacity of the shape, 0 to 1. */
  opacity?: number;
  /** Follow the pointer (otherwise it only drifts on its own). */
  follow?: boolean;
  /** Content drawn over the shape. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const CLIP: Record<BlurShape, string> = {
  circle: 'circle(50% at 50% 50%)',
  rounded: 'inset(6% round 28%)',
  triangle: 'polygon(50% 5%, 96% 90%, 4% 90%)',
  diamond: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
  hexagon: 'polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%)',
  star: 'polygon(50% 2%, 61% 36%, 98% 36%, 68% 57%, 79% 92%, 50% 71%, 21% 92%, 32% 57%, 2% 36%, 39% 36%)',
};

/** A soft shape that chases the pointer with a spring: it blurs and stretches along its motion, sharpens when it settles, and drifts on its own when nobody is pointing. Arrow keys nudge it. */
export default function ShapeBlur({ shape = 'circle', size = 120, restBlur = 3, maxBlur = 22, fill, opacity = 0.9, follow = true, children, className, style }: ShapeBlurProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const blurRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const s = useRef({ tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0, ang: 0, pointer: false, idleAt: 0, touched: 0 });
  const cfg = useRef({ restBlur, maxBlur, follow, reduced, size });
  const ctl = useRef<{ kick: () => void; apply: () => void } | null>(null);
  useEffect(() => { cfg.current = { restBlur, maxBlur, follow, reduced, size }; ctl.current?.kick(); ctl.current?.apply(); });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const st = s.current;
    let raf = 0, last = 0, live = true;
    const apply = (speed = 0) => {
      const c = cfg.current, b = blurRef.current, body = bodyRef.current;
      if (!b || !body) return;
      const blur = c.reduced ? c.restBlur : c.restBlur + Math.min(c.maxBlur, speed * 0.55);
      const stretch = c.reduced ? 1 : 1 + Math.min(0.32, speed / 90);
      b.style.transform = `translate3d(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px, 0)`;
      b.style.filter = `blur(${blur.toFixed(1)}px)`;
      body.style.transform = `rotate(${st.ang.toFixed(1)}deg) scale(${stretch.toFixed(3)}, ${(1 / stretch).toFixed(3)})`;
    };
    const frame = (t: number) => {
      raf = 0;
      const c = cfg.current;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      const rw = root.clientWidth / 2 - c.size / 3, rh = root.clientHeight / 2 - c.size / 3;
      if (!st.pointer || !c.follow) {
        const k = t / 1000;
        st.tx = Math.sin(k * 0.55) * rw * 0.7 + Math.sin(k * 1.3) * rw * 0.12;
        st.ty = Math.cos(k * 0.42) * rh * 0.7;
      }
      const ax = (st.tx - st.x) * 60 - st.vx * 11, ay = (st.ty - st.y) * 60 - st.vy * 11;
      st.vx += ax * dt; st.vy += ay * dt;
      st.x += st.vx * dt; st.y += st.vy * dt;
      const speed = Math.hypot(st.vx, st.vy) * 0.18;
      if (speed > 1.5) st.ang += (Math.atan2(st.vy, st.vx) * 57.3 - st.ang) * 0.2;
      apply(speed);
      if (live && !c.reduced) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && live && !cfg.current.reduced) { last = 0; raf = requestAnimationFrame(frame); } };
    ctl.current = { kick, apply: () => { if (cfg.current.reduced) apply(0); } };
    const off = watchLive(root, (v) => { live = v; if (v) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } });
    apply(0);
    return () => { off(); if (raf) cancelAnimationFrame(raf); ctl.current = null; };
  }, []);

  const move = (e: PointerEvent) => {
    const r = rootRef.current?.getBoundingClientRect();
    if (!r || e.pointerType === 'touch') return;
    const st = s.current;
    st.pointer = true;
    st.tx = e.clientX - r.left - r.width / 2; st.ty = e.clientY - r.top - r.height / 2;
    if (cfg.current.reduced) { st.x = st.tx; st.y = st.ty; ctl.current?.apply(); }
  };
  const onKey = (e: KeyboardEvent) => {
    const st = s.current, d = 40;
    st.pointer = true;
    if (e.key === 'ArrowLeft') st.tx -= d; else if (e.key === 'ArrowRight') st.tx += d;
    else if (e.key === 'ArrowUp') st.ty -= d; else if (e.key === 'ArrowDown') st.ty += d;
    else if (e.key === 'Home' || e.key === 'Escape') { st.tx = 0; st.ty = 0; st.pointer = false; }
    else return;
    e.preventDefault();
    if (cfg.current.reduced) { st.x = st.tx; st.y = st.ty; ctl.current?.apply(); } else ctl.current?.kick();
  };

  return (
    <div ref={rootRef} className={cx('ui-shape-blur-root', className)} style={style} tabIndex={0} role="group"
      aria-label="Soft blurred shape that follows the pointer. Arrow keys move it, Home lets it drift."
      onPointerMove={move} onPointerLeave={() => { s.current.pointer = false; ctl.current?.kick(); }} onKeyDown={onKey}>
      <div ref={blurRef} className="ui-shape-blur-blur" aria-hidden="true" style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, opacity }}>
        <div ref={bodyRef} className="ui-shape-blur-body" style={{ clipPath: CLIP[shape], background: fill }} />
      </div>
      {children && <div className="ui-shape-blur-content">{children}</div>}
    </div>
  );
}

const SHAPES: BlurShape[] = ['circle', 'rounded', 'triangle', 'star'];

export function Demo() {
  const [shape, setShape] = useState<BlurShape>('circle');
  return (
    <div className="ui-shape-blur-demo">
      <div className="ui-shape-blur-field">
        <ShapeBlur shape={shape} size={112} />
        <div className="ui-shape-blur-picker" role="group" aria-label="Shape">
          {SHAPES.map((sh) => <button key={sh} type="button" aria-pressed={shape === sh} onClick={() => setShape(sh)}>{sh}</button>)}
        </div>
        <div className="ui-shape-blur-card">
          <strong>Soft focus</strong>
          <span>Move the pointer: speed adds blur.</span>
        </div>
      </div>
    </div>
  );
}
