'use client';
import { Fragment, useRef, type CSSProperties, type ElementType } from 'react';
import { useProbeLoop, useReducedMotion } from './_text-c';

export interface WarpTextProps {
  text?: string;
  /** Strength of the lens under the pointer, 0 to 2 (default 1). */
  lens?: number;
  /** Height of the travelling wave in em (default 0.08). */
  wave?: number;
  /** Reach of the lens in px (default 130). */
  radius?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/**
 * Text on a rippling baseline with a fisheye lens: letters near the pointer swell, spread apart and tilt away from it.
 * The lens follows the pointer (stronger while pressed) or drifts on its own for touch and idle; reduced motion freezes one warped frame.
 */
export default function WarpText({ text = 'Bend the line', lens = 1, wave = 0.08, radius = 130, as: Tag = 'h2', className, style }: WarpTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const cache = useRef<{ el: HTMLElement; cx: number; cy: number; fs: number }[] | null>(null);
  const measure = () => {
    const root = ref.current;
    if (!root) return;
    const fs = parseFloat(getComputedStyle(root).fontSize) || 48;
    cache.current = Array.from(root.querySelectorAll<HTMLElement>('[data-c]')).map((el) => ({ el, cx: el.offsetLeft + el.offsetWidth / 2, cy: el.offsetTop + el.offsetHeight / 2, fs }));
  };
  useProbeLoop(ref, (x, y, lvl, t) => {
    if (!cache.current) measure();
    for (const c of cache.current ?? []) {
      const dx = c.cx - x, dy = c.cy - y;
      const k = Math.exp(-((dx * dx + dy * dy) / (radius * radius)));
      const push = dx * 0.55 * lens * lvl * k;
      const rise = Math.sin(c.cx / (c.fs * 1.6) + t * 1.7) * wave * c.fs - k * c.fs * 0.1 * lens * lvl;
      const sc = 1 + k * 0.85 * lens * lvl;
      const rot = (dx / radius) * k * 16 * lens * lvl;
      c.el.style.transform = `translate(${push.toFixed(1)}px, ${rise.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
      c.el.style.setProperty('--k', (k * lvl).toFixed(2));
    }
  }, { reduced, onLayout: () => { cache.current = null; } });

  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag className={`ui-warp-text-root ${className ?? ''}`} style={style}>
      <span className="ui-warp-text-sr">{text}</span>
      <span ref={ref} className="ui-warp-text-line" aria-hidden="true">
        {words.map((w, wi) => (
          <Fragment key={wi}><span className="ui-warp-text-word">
            {Array.from(w).map((ch, ci) => <span key={ci} data-c="" className="ui-warp-text-char">{ch}</span>)}
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
    <div className="ui-warp-text-stage">
      <WarpText text="Bend the line" />
    </div>
  );
}
