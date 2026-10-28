'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from './_t2';
import { Artwork, clamp, itemKey, type GalleryItem } from './_galleries-data';
import { useIsoLayoutEffect, useSize } from './_galleries-hooks';

export interface ScrollStackItem extends GalleryItem {
  /** A sentence or two shown on the card. */
  text?: string;
}
export interface ScrollStackProps {
  /** Cards, in stacking order. */
  items?: ScrollStackItem[];
  /** Vertical offset in px between the tops of stacked cards. Default 14. */
  offset?: number;
  /** How much a card shrinks for every card that has landed on it (0 to 0.1). Default 0.045. */
  shrink?: number;
  label?: string;
  /** Height of the scrolling frame; by default fills the parent. */
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

const STEPS: ScrollStackItem[] = [
  { title: 'Gather', subtitle: 'Step 1', text: 'Collect what you have: notes, files and half-ideas, in one place.' },
  { title: 'Shape', subtitle: 'Step 2', text: 'Cut it down to what matters and give it a clear order.' },
  { title: 'Build', subtitle: 'Step 3', text: 'Make the smallest version that works, then use it for real.' },
  { title: 'Review', subtitle: 'Step 4', text: 'Read it back with fresh eyes and fix what snags.' },
  { title: 'Ship', subtitle: 'Step 5', text: 'Release it quietly, watch what happens, and keep improving.' },
];

/** Cards that pile up as you scroll: each one sticks near the top and the next slides over it while the covered ones shrink and dim a little. The frame scrolls on its own and has a card navigator. */
export default function ScrollStack({ items = STEPS, offset = 14, shrink = 0.045, label = 'Steps', height, className, style }: ScrollStackProps) {
  const root = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const reduced = useReducedMotion();
  const { h } = useSize(root);
  const [active, setActive] = useState(0);
  const n = items.length;
  const ch = clamp((h || 300) * 0.62, 150, 380);
  const gap = Math.round(ch * 0.55);
  const pitch = ch + gap;

  const paint = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const top = el.scrollTop;
    const cover: number[] = [];
    for (let j = 0; j < n; j++) cover.push(j === 0 ? 0 : clamp(1 - (12 + j * pitch - top - (12 + j * offset)) / (ch * 0.9), 0, 1));
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = i + 1; j < n; j++) sum += cover[j]!;
      const c = cards.current[i];
      if (!c) continue;
      c.style.setProperty('--s', reduced ? '1' : (1 - sum * shrink).toFixed(4));
      c.style.setProperty('--d', reduced ? '0' : Math.min(0.5, sum * 0.16).toFixed(3));
    }
    const a = clamp(Math.round(top / pitch), 0, n - 1);
    setActive((p) => (p === a ? p : a));
  }, [n, pitch, ch, offset, shrink, reduced]);

  useIsoLayoutEffect(() => { paint(); }, [paint]);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;
    const on = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); };
    el.addEventListener('scroll', on, { passive: true });
    return () => { el.removeEventListener('scroll', on); cancelAnimationFrame(raf); };
  }, [paint]);

  const jump = (i: number) => root.current?.scrollTo({ top: clamp(i, 0, n - 1) * pitch, behavior: reduced ? 'auto' : 'smooth' });

  return (
    <div className={`ui-scroll-stack-root ${className ?? ''}`} style={{ height: height ?? '100%', '--ch': `${ch}px`, '--gap': `${gap}px`, ...style } as CSSProperties}>
      <div ref={root} className="ui-scroll-stack-scroll" role="region" aria-label={`${label}, scrolling stack of cards`} tabIndex={0}>
        <ol className="ui-scroll-stack-list">
          {items.map((it, i) => {
            const body = (
              <>
                <div className="ui-scroll-stack-art"><Artwork item={it} index={i} /></div>
                <div className="ui-scroll-stack-copy">
                  <span className="ui-scroll-stack-num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{it.title}</h3>
                  {it.subtitle ? <p className="ui-scroll-stack-sub">{it.subtitle}</p> : null}
                  {it.text ? <p>{it.text}</p> : null}
                </div>
              </>
            );
            return (
              <li key={itemKey(it, i)} ref={(el) => { cards.current[i] = el; }} className="ui-scroll-stack-card" style={{ top: 12 + i * offset, zIndex: i + 1 }} aria-current={i === active ? 'step' : undefined}>
                {it.href ? <a href={it.href} className="ui-scroll-stack-face">{body}</a> : <div className="ui-scroll-stack-face">{body}</div>}
                <span className="ui-scroll-stack-dim" aria-hidden="true" />
              </li>
            );
          })}
        </ol>
      </div>
      <nav className="ui-scroll-stack-nav" aria-label={`${label} navigation`}>
        {items.map((it, i) => (
          <button key={itemKey(it, i)} type="button" className="ui-scroll-stack-dot" aria-label={`Go to card ${i + 1}: ${it.title}`} aria-current={i === active ? 'true' : undefined} onClick={() => jump(i)} />
        ))}
      </nav>
    </div>
  );
}

export function Demo() {
  return <ScrollStack label="How a project moves" />;
}
