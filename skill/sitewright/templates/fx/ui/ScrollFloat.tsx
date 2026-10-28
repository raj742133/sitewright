'use client';
import { useMemo, useRef, type CSSProperties, type ElementType, type RefObject } from 'react';
import { clamp01, easeOutBack, useIsoLayoutEffect, useReducedMotion, watchScrollProgress } from './_text-b';

export interface ScrollFloatProps {
  /** The headline text. */
  text?: string;
  /** Element to render (h2 by default). */
  as?: ElementType;
  /** Scroll container to follow; defaults to the nearest scrolling ancestor, else the page. */
  scroller?: RefObject<HTMLElement | null>;
  /** How far letters start below their place, in em. */
  distance?: number;
  /** 0..0.9: how much of the scroll range is spent staggering letters (higher = more one-by-one). */
  stagger?: number;
  /** Where the top edge starts the effect, as a fraction of the viewport height. */
  start?: number;
  /** Where the bottom edge finishes it, as a fraction of the viewport height. */
  end?: number;
  className?: string;
  style?: CSSProperties;
}

/** A headline whose letters float up into place, scrubbed by scroll: they rise with a slight overshoot, tilt and stretch, staggered across the word. */
export default function ScrollFloat({ text = 'Rise with the page', as: Tag = 'h2', scroller, distance = 0.9, stagger = 0.65, start = 0.95, end = 0.6, className, style }: ScrollFloatProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chars = Array.from(el.querySelectorAll<HTMLElement>('.ui-scroll-float-ch'));
    const paint = (p: number) => {
      const n = chars.length;
      chars.forEach((c, i) => {
        const t = clamp01((p - (i / Math.max(1, n - 1)) * stagger) / (1 - stagger));
        c.style.setProperty('--y', (1 - easeOutBack(t)).toFixed(4));
        c.style.setProperty('--o', clamp01(t * 2.2).toFixed(3));
        c.style.setProperty('--k', (1 - t).toFixed(4));
      });
    };
    if (reduced) { paint(1); return; }
    return watchScrollProgress(el, { scroller: scroller?.current, start, end }, paint);
  }, [reduced, scroller, stagger, start, end, text]);

  let k = 0;
  return (
    <Tag ref={ref} className={`ui-scroll-float-root${className ? ` ${className}` : ''}`} style={{ ['--dist' as string]: `${distance}em`, ...style }}>
      <span className="ui-scroll-float-sr">{text}</span>
      <span aria-hidden="true" className="ui-scroll-float-vis">
        {words.map((w, wi) => (
          <span key={wi} className="ui-scroll-float-word">
            {Array.from(w).map((ch) => <span key={k++} className="ui-scroll-float-ch">{ch}</span>)}
            {wi < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </Tag>
  );
}

export function Demo() {
  return (
    <div className="ui-scroll-float-demo" tabIndex={0} role="region" aria-label="Scroll to float the headline into place">
      <div className="ui-scroll-float-hint" aria-hidden="true"><span>Scroll</span><i /></div>
      <div className="ui-scroll-float-stage">
        <p className="ui-scroll-float-eyebrow">Launch notes</p>
        <ScrollFloat text="Rise with the page" />
        <p className="ui-scroll-float-sub">Every letter lifts on its own beat as you scroll.</p>
      </div>
      <div className="ui-scroll-float-tail" aria-hidden="true" />
    </div>
  );
}
