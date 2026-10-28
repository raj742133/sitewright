'use client';
import { Fragment, useRef, type CSSProperties, type ElementType } from 'react';
import { useProbeLoop, useReducedMotion } from './_text-c';

export interface TextPressureProps {
  /** The words to render. */
  text?: string;
  /** Reach of the press in px (default 150). */
  radius?: number;
  /** Element to render (default h2). */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/**
 * Letters squash, thicken and warm toward the primary colour under a "press". The press follows the pointer, deepens while the button is held,
 * and sweeps by itself on touch screens or when idle. Reduced motion shows one fixed press.
 */
export default function TextPressure({ text = 'Press down', radius = 150, as: Tag = 'h2', className, style }: TextPressureProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const cache = useRef<{ el: HTMLElement; cx: number; cy: number; p: number }[] | null>(null);
  const measure = () => {
    const root = ref.current;
    if (!root) return;
    cache.current = Array.from(root.querySelectorAll<HTMLElement>('[data-c]')).map((el) => ({ el, cx: el.offsetLeft + el.offsetWidth / 2, cy: el.offsetTop + el.offsetHeight / 2, p: -1 }));
  };
  useProbeLoop(ref, (x, y, lvl) => {
    if (!cache.current) measure();
    for (const c of cache.current ?? []) {
      const k = Math.max(0, 1 - Math.hypot(c.cx - x, (c.cy - y) * 0.8) / radius);
      const p = lvl * k * k * (3 - 2 * k);
      if (Math.abs(p - c.p) > 0.004) { c.p = p; c.el.style.setProperty('--p', p.toFixed(3)); }
    }
  }, { reduced, onLayout: () => { cache.current = null; } });

  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag className={`ui-text-pressure-root ${className ?? ''}`} style={style}>
      <span className="ui-text-pressure-sr">{text}</span>
      <span ref={ref} className="ui-text-pressure-line" aria-hidden="true">
        {words.map((w, wi) => (
          <Fragment key={wi}><span className="ui-text-pressure-word">
            {Array.from(w).map((ch, ci) => <span key={ci} data-c="" className="ui-text-pressure-char">{ch}</span>)}
          </span>
            {wi < words.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}

export function Demo() {
  return (
    <div className="ui-text-pressure-stage">
      <TextPressure text="Press down hard" />
      <p className="ui-text-pressure-hint" aria-hidden="true">move, or hold to press</p>
    </div>
  );
}
