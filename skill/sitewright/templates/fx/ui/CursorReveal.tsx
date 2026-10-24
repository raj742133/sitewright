'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { Scene, useReducedMotion } from './_d5';

export interface CursorRevealProps {
  /** Top layer (default: a daylight landscape). */
  front?: ReactNode;
  /** Layer uncovered by the circle (default: the same landscape at night). */
  back?: ReactNode;
  /** Radius of the reveal circle in px. */
  radius?: number;
  frontLabel?: string;
  backLabel?: string;
  className?: string;
}

/** A circular mask follows the pointer and uncovers a second layer under the first. Arrow keys move it; a tap places it. */
export default function CursorReveal({ front, back, radius = 64, frontLabel = 'Daylight', backLabel = 'Nightfall', className }: CursorRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const s = { x: 0, y: 0, tx: 0, ty: 0, r: 0, tr: 0, raf: 0, touched: false, active: false };
    const idle = radius * 0.3;
    const paint = () => {
      el.style.setProperty('--ui-cr-x', `${s.x.toFixed(1)}px`); el.style.setProperty('--ui-cr-y', `${s.y.toFixed(1)}px`);
      el.style.setProperty('--ui-cr-r', `${Math.max(0, s.r).toFixed(1)}px`);
    };
    const tick = () => {
      s.raf = 0;
      s.x += (s.tx - s.x) * 0.22; s.y += (s.ty - s.y) * 0.22; s.r += (s.tr - s.r) * 0.2;
      paint();
      if (Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) + Math.abs(s.tr - s.r) > 0.4) s.raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (reduced) { s.x = s.tx; s.y = s.ty; s.r = s.tr; paint(); } else if (!s.raf) s.raf = requestAnimationFrame(tick);
    };
    const center = () => { const r = el.getBoundingClientRect(); s.tx = r.width * 0.5; s.ty = r.height * 0.5; };
    center(); s.x = s.tx; s.y = s.ty; s.tr = idle; s.r = idle; paint();
    const at = (e: PointerEvent) => { const r = el.getBoundingClientRect(); s.tx = e.clientX - r.left; s.ty = e.clientY - r.top; s.touched = true; };
    const move = (e: PointerEvent) => { if (e.pointerType === 'touch') return; at(e); s.tr = radius; kick(); };
    const down = (e: PointerEvent) => { at(e); s.tr = radius; kick(); };
    const leave = (e: PointerEvent) => { if (e.pointerType === 'touch') return; s.tr = idle; kick(); };
    const focus = () => { s.tr = radius; kick(); };
    const blur = () => { s.tr = idle; kick(); };
    const key = (e: KeyboardEvent) => {
      const d = e.key === 'ArrowLeft' ? [-28, 0] : e.key === 'ArrowRight' ? [28, 0] : e.key === 'ArrowUp' ? [0, -28] : e.key === 'ArrowDown' ? [0, 28] : null;
      if (!d) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      s.tx = Math.min(r.width, Math.max(0, s.tx + (d[0] ?? 0))); s.ty = Math.min(r.height, Math.max(0, s.ty + (d[1] ?? 0))); s.tr = radius; s.touched = true; kick();
    };
    const ro = new ResizeObserver(() => { if (!s.touched) { center(); s.x = s.tx; s.y = s.ty; paint(); } });
    ro.observe(el);
    el.addEventListener('pointermove', move); el.addEventListener('pointerdown', down); el.addEventListener('pointerleave', leave);
    el.addEventListener('focus', focus); el.addEventListener('blur', blur); el.addEventListener('keydown', key);
    return () => {
      cancelAnimationFrame(s.raf); ro.disconnect();
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerdown', down); el.removeEventListener('pointerleave', leave);
      el.removeEventListener('focus', focus); el.removeEventListener('blur', blur); el.removeEventListener('keydown', key);
    };
  }, [radius, reduced]);

  return (
    <div ref={ref} className={`ui-cursor-reveal-root ${className ?? ''}`} tabIndex={0} role="group"
      aria-label={`${frontLabel} picture. Move the pointer, tap, or use the arrow keys to uncover the ${backLabel} version underneath.`}>
      <div className="ui-cursor-reveal-layer">{front ?? <Scene palette="day" />}<span className="ui-cursor-reveal-tag">{frontLabel}</span></div>
      <div className="ui-cursor-reveal-layer ui-cursor-reveal-back" aria-hidden="true">{back ?? <Scene palette="night" />}</div>
      <span className="ui-cursor-reveal-ring" aria-hidden="true" />
    </div>
  );
}

export function Demo() {
  return <CursorReveal radius={56} />;
}
