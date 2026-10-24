'use client';
import { useEffect, useRef } from 'react';
import { usePrefs, useActive } from './_d6';

export interface DynamicTextShadowProps {
  text?: string;
  /** Length of the long shadow in px. */
  length?: number;
  /** Starting light angle in degrees (0 = shadow falls to the right, 90 = down). */
  angle?: number;
  className?: string;
  style?: React.CSSProperties;
}

function shadow(deg: number, len: number) {
  const r = (deg * Math.PI) / 180;
  const dx = Math.cos(r), dy = Math.sin(r);
  const parts: string[] = [];
  for (let i = 1; i <= len; i += 1) {
    const mix = Math.round(78 - (i / len) * 58);
    parts.push(`${(dx * i).toFixed(1)}px ${(dy * i).toFixed(1)}px 0 color-mix(in srgb, var(--primary, #2563eb) ${mix}%, transparent)`);
  }
  return parts.join(',');
}

/** A headline with a long shadow that always falls away from the pointer. Arrow keys rotate it when focused; tap steps it on touch; fixed with reduced motion. */
export default function DynamicTextShadow({ text = 'Long shadows', length = 26, angle = 45, className, style }: DynamicTextShadowProps) {
  const root = useRef<HTMLDivElement>(null);
  const el = useRef<HTMLSpanElement>(null);
  const deg = useRef(angle);
  const { reduced, coarse } = usePrefs();
  const active = useActive(root);
  const len = Math.max(4, Math.min(60, Math.round(length)));

  const apply = (d: number) => { deg.current = d; if (el.current) el.current.style.textShadow = shadow(d, len); };

  useEffect(() => { apply(angle); }, [angle, len]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reduced || coarse || !active) return;
    const node = root.current;
    if (!node) return;
    let raf = 0, target = deg.current, cur = deg.current;
    const loop = () => {
      const diff = ((target - cur + 540) % 360) - 180;
      cur += diff * 0.18;
      apply(cur);
      raf = Math.abs(diff) > 0.2 ? requestAnimationFrame(loop) : 0;
    };
    const move = (e: PointerEvent) => {
      const r = node.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      // shadow falls away from the pointer
      target = (Math.atan2(cy - e.clientY, cx - e.clientX) * 180) / Math.PI;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [reduced, coarse, active, len]); // eslint-disable-line react-hooks/exhaustive-deps

  const key = (e: React.KeyboardEvent) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 15 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -15 : 0;
    if (step) { e.preventDefault(); apply(deg.current + step); }
  };

  return (
    <div
      ref={root}
      className={`ui-dynamic-text-shadow${className ? ' ' + className : ''}`}
      style={style}
      tabIndex={0}
      role="group"
      aria-label={`${text}. Arrow keys turn the shadow.`}
      onKeyDown={key}
      onClick={() => { if (coarse) apply(deg.current + 45); }}
    >
      <span ref={el} className="ui-dynamic-text-shadow-text" style={{ textShadow: shadow(angle, len) }} aria-hidden="true">{text}</span>
    </div>
  );
}

export function Demo() {
  return <DynamicTextShadow text="Long shadows" length={22} />;
}
