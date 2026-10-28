'use client';
import { useMemo, useRef, type CSSProperties, type ElementType, type RefObject } from 'react';
import { clamp01, useIsoLayoutEffect, useReducedMotion, watchScrollProgress } from './_text-b';

export interface ScrollRevealProps {
  /** The passage to reveal, word by word. */
  text?: string;
  /** Element to render (p by default). */
  as?: ElementType;
  /** Scroll container to follow; defaults to the nearest scrolling ancestor, else the page. */
  scroller?: RefObject<HTMLElement | null>;
  /** Blur in px that unread words carry. */
  blur?: number;
  /** Opacity unread words start at (0..1). */
  dim?: number;
  /** Show the thin progress rail on the left. */
  rail?: boolean;
  /** Fraction of the viewport height where the top edge starts the reveal. */
  start?: number;
  /** Fraction of the viewport height where the bottom edge finishes it. */
  end?: number;
  className?: string;
  style?: CSSProperties;
}

/** A passage that comes into focus word by word as you scroll: unread words are dim and blurred, the word being read glows in the brand colour, read words settle to ink. */
export default function ScrollReveal({ text = 'Words arrive as you read them.', as: Tag = 'p', scroller, blur = 5, dim = 0.18, rail = true, start = 0.9, end = 0.5, className, style }: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ws = Array.from(el.querySelectorAll<HTMLElement>('.ui-scroll-reveal-w'));
    const paint = (p: number) => {
      const n = ws.length;
      const head = p * (n + 2) - 1;
      ws.forEach((w, i) => {
        const t = clamp01(head - i + 1);
        const f = Math.max(0, 1 - Math.abs(head - i) / 2.2) * (p < 1 ? 1 : 0);
        w.style.setProperty('--r', t.toFixed(3));
        w.style.setProperty('--f', f.toFixed(3));
      });
      railRef.current?.style.setProperty('--p', p.toFixed(4));
    };
    if (reduced) { paint(1); return; }
    return watchScrollProgress(el, { scroller: scroller?.current, start, end }, paint);
  }, [reduced, scroller, start, end, text]);

  return (
    <Tag ref={ref} className={`ui-scroll-reveal-root${className ? ` ${className}` : ''}`} data-rail={rail} style={{ ['--blur' as string]: `${blur}px`, ['--dim' as string]: dim, ...style }}>
      {rail && <span ref={railRef} aria-hidden="true" className="ui-scroll-reveal-rail"><i /></span>}
      <span className="ui-scroll-reveal-sr">{text}</span>
      <span aria-hidden="true">{words.map((w, i) => <span key={i} className="ui-scroll-reveal-w">{w}{i < words.length - 1 ? ' ' : ''}</span>)}</span>
    </Tag>
  );
}

const COPY = 'Good interfaces explain themselves slowly. Each sentence earns the next one, so we reveal them at the pace you read, never faster, and never in a way that makes you hunt for the point. Scroll on and watch the words come into focus.';

export function Demo() {
  return (
    <div className="ui-scroll-reveal-demo" tabIndex={0} role="region" aria-label="Scroll to reveal the passage">
      <div className="ui-scroll-reveal-hint" aria-hidden="true">Scroll</div>
      <div className="ui-scroll-reveal-page">
        <ScrollReveal text={COPY} />
      </div>
      <div className="ui-scroll-reveal-tail" aria-hidden="true" />
    </div>
  );
}
