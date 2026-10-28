'use client';
import { Fragment, useRef, type CSSProperties, type ElementType } from 'react';
import { useProbeLoop, useReducedMotion } from './_text-c';

export interface VariableProximityProps {
  text?: string;
  /** Distance in px over which letters change state (default 170). */
  radius?: number;
  /** How the change grows toward the pointer (default 'smooth'). */
  falloff?: 'linear' | 'smooth' | 'sharp';
  /** Show a soft halo under the probe (default true). */
  halo?: boolean;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/**
 * Every letter has two typographic states, a light sans and a heavy italic serif, and blends between them by its distance to the pointer.
 * Both states are stacked, so the line never reflows. Touch screens and idle pointers get a sweeping probe; reduced motion shows one fixed blend.
 */
export default function VariableProximity({ text = 'Closer changes everything', radius = 170, falloff = 'smooth', halo = true, as: Tag = 'h2', className, style }: VariableProximityProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const cache = useRef<{ el: HTMLElement; cx: number; cy: number; p: number }[] | null>(null);
  const measure = () => {
    const root = ref.current;
    if (!root) return;
    cache.current = Array.from(root.querySelectorAll<HTMLElement>('[data-c]')).map((el) => ({ el, cx: el.offsetLeft + el.offsetWidth / 2, cy: el.offsetTop + el.offsetHeight / 2, p: -1 }));
  };
  useProbeLoop(ref, (x, y, lvl) => {
    if (!cache.current) measure();
    const h = haloRef.current;
    if (h) { h.style.transform = `translate(${x - radius}px, ${y - radius}px)`; h.style.opacity = String(0.25 + lvl * 0.5); }
    for (const c of cache.current ?? []) {
      const k = Math.max(0, 1 - Math.hypot(c.cx - x, c.cy - y) / radius);
      const p = falloff === 'linear' ? k : falloff === 'sharp' ? k * k * k : k * k * (3 - 2 * k);
      if (Math.abs(p - c.p) > 0.004) { c.p = p; c.el.style.setProperty('--p', p.toFixed(3)); }
    }
  }, { reduced, onLayout: () => { cache.current = null; } });

  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag className={`ui-variable-proximity-root ${className ?? ''}`} style={style}>
      <span className="ui-variable-proximity-sr">{text}</span>
      <span ref={ref} className="ui-variable-proximity-line" aria-hidden="true">
        {halo ? <span ref={haloRef} className="ui-variable-proximity-halo" style={{ width: radius * 2, height: radius * 2 }} /> : null}
        {words.map((w, wi) => (
          <Fragment key={wi}><span className="ui-variable-proximity-word">
            {Array.from(w).map((ch, ci) => (
              <span key={ci} data-c="" className="ui-variable-proximity-char">
                <span className="ui-variable-proximity-size">{ch}</span>
                <span className="ui-variable-proximity-a">{ch}</span>
                <span className="ui-variable-proximity-b">{ch}</span>
              </span>
            ))}
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
    <div className="ui-variable-proximity-stage">
      <VariableProximity text="Closer changes everything" />
    </div>
  );
}
