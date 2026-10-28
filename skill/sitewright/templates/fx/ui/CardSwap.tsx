'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Scene } from './_cards-art';
import { useReducedMotion } from './_t2';
import { useControlled, useLive } from './_cards-use';

export interface CardSwapItem {
  id: string;
  title: string;
  subtitle?: string;
  /** Card visual; defaults to a drawn scene. */
  art?: ReactNode;
}

export interface CardSwapProps {
  items?: CardSwapItem[];
  /** Front card index (controlled). */
  index?: number;
  defaultIndex?: number;
  onChange?: (index: number) => void;
  /** Swap automatically. Always off under prefers-reduced-motion. */
  autoplay?: boolean;
  /** Milliseconds between automatic swaps. */
  interval?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULTS: CardSwapItem[] = [
  { id: 'a', title: 'Plan', subtitle: 'Sketch the outline' },
  { id: 'b', title: 'Build', subtitle: 'Shape every section' },
  { id: 'c', title: 'Review', subtitle: 'Tighten the details' },
  { id: 'd', title: 'Ship', subtitle: 'Publish with one click' },
];

const OUT = 360;

/** A stack of cards where the front one drops away and returns to the back, bringing the next forward. Previous/next buttons, dots and arrow keys also swap; autoplay pauses on hover, focus and when off-screen. */
export default function CardSwap({ items = DEFAULTS, index, defaultIndex = 0, onChange, autoplay = true, interval = 3800, label = 'Card stack', className, style }: CardSwapProps) {
  const n = items.length;
  const [front, setFront] = useControlled<number>(index, defaultIndex, onChange);
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const live = useLive(root);
  const [leaving, setLeaving] = useState(-1);
  const [entering, setEntering] = useState(-1);
  const [hold, setHold] = useState(false);
  const [paused, setPaused] = useState(false);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const frontRef = useRef(front);
  frontRef.current = front;
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); }, []);

  const go = useCallback((dir: 1 | -1) => {
    if (busy.current || n < 2) return;
    const f = frontRef.current;
    if (reduced) { setFront((f + dir + n) % n); return; }
    busy.current = true;
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    if (dir === 1) {
      setLeaving(f);
      later(() => { setFront((f + 1) % n); setLeaving(-1); later(() => { busy.current = false; }, 520); }, OUT);
    } else {
      const back = (f - 1 + n) % n;
      setEntering(back); setFront(back);
      later(() => { setEntering(-1); later(() => { busy.current = false; }, 520); }, 40);
    }
  }, [n, reduced, setFront]);

  const run = autoplay && !reduced && live && !paused && !hold && n > 1;
  useEffect(() => {
    if (!run) return;
    const t = window.setInterval(() => go(1), interval);
    return () => window.clearInterval(t);
  }, [run, interval, go]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(-1); }
  };

  return (
    <div ref={root} className={`ui-card-swap-root ${className ?? ''}`} style={{ '--n': n, ...style } as CSSProperties} role="group" aria-roledescription="carousel" aria-label={label}
      onKeyDown={onKey} onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
      <div className="ui-card-swap-stage">
        {items.map((it, i) => {
          const p = (i - front + n) % n;
          const isLeaving = leaving === i;
          const isEntering = entering === i;
          return (
            <article key={it.id} className="ui-card-swap-card" data-front={p === 0 ? 'true' : 'false'} data-leaving={isLeaving ? 'true' : 'false'} data-entering={isEntering ? 'true' : 'false'}
              aria-hidden={p === 0 ? undefined : true} aria-label={`${it.title}, ${i + 1} of ${n}`}
              style={{ '--p': p, zIndex: isLeaving || isEntering ? n + 2 : n - p } as CSSProperties}>
              <div className="ui-card-swap-art">{it.art ?? <Scene index={i + 1} />}</div>
              <div className="ui-card-swap-cap"><strong>{it.title}</strong>{it.subtitle ? <span>{it.subtitle}</span> : null}<em aria-hidden="true">{String(i + 1).padStart(2, '0')}</em></div>
            </article>
          );
        })}
      </div>
      <div className="ui-card-swap-bar">
        <button type="button" className="ui-card-swap-btn" aria-label="Previous card" onClick={() => go(-1)}><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <div className="ui-card-swap-dots" aria-hidden="true">{items.map((it, i) => <i key={it.id} data-on={i === front ? 'true' : 'false'} />)}</div>
        <button type="button" className="ui-card-swap-btn" aria-label="Next card" onClick={() => go(1)}><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        {autoplay && !reduced ? (
          <button type="button" className="ui-card-swap-btn" aria-pressed={paused} aria-label={paused ? 'Resume autoplay' : 'Pause autoplay'} onClick={() => setPaused((v) => !v)}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">{paused ? <path d="M5 3l8 5-8 5z" fill="currentColor" /> : <path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor" />}</svg>
          </button>
        ) : null}
        <span className="ui-card-swap-live" aria-live="polite">{`Card ${front + 1} of ${n}: ${items[front]?.title ?? ''}`}</span>
      </div>
    </div>
  );
}

export function Demo() {
  return <div className="ui-card-swap-demo"><CardSwap /></div>;
}
