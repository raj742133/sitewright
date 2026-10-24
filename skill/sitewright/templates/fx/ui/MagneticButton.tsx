'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { useMedia, useReduced } from './_d3';

export interface MagneticButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** pull radius in px around the button edge */
  radius?: number;
  /** 0..1 fraction of the pointer offset the button follows */
  strength?: number;
  className?: string;
}

export default function MagneticButton({ children = 'Get started', onClick, disabled, radius = 90, strength = 0.35, className = '' }: MagneticButtonProps) {
  const coarse = useMedia('(pointer: coarse)');
  const reduced = useReduced();
  const btn = useRef<HTMLButtonElement>(null);
  const inner = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const b = btn.current, label = inner.current;
    if (!b || !label || coarse || reduced || disabled) return;
    const s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, raf: 0, last: 0, visible: true };
    const apply = () => {
      b.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0)`;
      label.style.transform = `translate3d(${(s.x * 0.45).toFixed(2)}px, ${(s.y * 0.45).toFixed(2)}px, 0)`;
    };
    const tick = (t: number) => {
      const dt = Math.min(0.032, (t - s.last) / 1000 || 0.016);
      s.last = t;
      s.vx += ((s.tx - s.x) * 260 - s.vx * 14) * dt; s.x += s.vx * dt;
      s.vy += ((s.ty - s.y) * 260 - s.vy * 14) * dt; s.y += s.vy * dt;
      apply();
      if (Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) + Math.abs(s.vx) + Math.abs(s.vy) < 0.05) {
        s.x = s.tx; s.y = s.ty; s.vx = s.vy = 0; apply(); s.raf = 0; return;
      }
      s.raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!s.raf) { s.last = performance.now(); s.raf = requestAnimationFrame(tick); } };
    const move = (e: PointerEvent) => {
      if (!s.visible) return;
      // measure from the resting centre: subtract the current offset
      const r = b.getBoundingClientRect();
      const cx = r.left + r.width / 2 - s.x, cy = r.top + r.height / 2 - s.y;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const hw = r.width / 2 + radius, hh = r.height / 2 + radius;
      const inside = Math.abs(dx) < hw && Math.abs(dy) < hh;
      s.tx = inside ? dx * strength : 0;
      s.ty = inside ? dy * strength : 0;
      kick();
    };
    const leave = () => { s.tx = 0; s.ty = 0; kick(); };
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((en) => { s.visible = en.some((x) => x.isIntersecting); if (!s.visible) leave(); })
      : null;
    io?.observe(b);
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      io?.disconnect();
      cancelAnimationFrame(s.raf);
      b.style.transform = ''; label.style.transform = '';
    };
  }, [coarse, reduced, disabled, radius, strength]);

  return (
    <button ref={btn} type="button" className={`ui-magnetic-button ${className}`.trim()} onClick={onClick} disabled={disabled}>
      <span ref={inner} className="ui-magnetic-button-inner">{children}</span>
    </button>
  );
}

export function Demo() {
  return <div style={{ display: 'grid', placeItems: 'center', minHeight: 150 }}><MagneticButton>Get started</MagneticButton></div>;
}
