'use client';
import { useEffect, useRef, useState, type CSSProperties, type ElementType } from 'react';
import { useIsoLayoutEffect, useReducedMotion, watchLive } from './_text-b';

export interface TextLoopProps {
  /** Words that take turns in the slot. */
  words?: string[];
  /** Static text before the slot. */
  prefix?: string;
  /** Static text after the slot. */
  suffix?: string;
  /** How a word replaces the previous one. */
  effect?: 'slide' | 'blur' | 'roll';
  /** Milliseconds each word stays. */
  interval?: number;
  /** Show a small pause / play button (recommended for long-lived pages). */
  controls?: boolean;
  /** Element to render (span by default). */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

const ANIM_MS = 560;

/** A sentence with one rotating slot: the word is swapped for the next with a slide, blur or roll, and the slot glides to the new word's width so the sentence never jumps. Pauses on hover and focus, optional pause button. */
export default function TextLoop({ words = ['faster', 'safer', 'together', 'beautifully'], prefix = 'Ship', suffix = '', effect = 'slide', interval = 2400, controls = false, as: Tag = 'span', className, style }: TextLoopProps) {
  const root = useRef<HTMLElement>(null);
  const meas = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [widths, setWidths] = useState<number[]>([]);
  const [hold, setHold] = useState(false);
  const [paused, setPaused] = useState(false);
  const [live, setLive] = useState(true);
  const key = words.join('\u0001');
  const cur = words[i % Math.max(1, words.length)] ?? '';

  useIsoLayoutEffect(() => {
    const m = meas.current;
    if (!m) return;
    const read = () => setWidths(Array.from(m.children).map((c) => (c as HTMLElement).offsetWidth));
    read();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : null;
    ro?.observe(m);
    return () => ro?.disconnect();
  }, [key]);

  useEffect(() => { const el = root.current; return el ? watchLive(el, setLive) : undefined; }, []);
  useEffect(() => {
    if (reduced || paused || hold || !live || words.length < 2) return;
    const t = window.setTimeout(() => { setPrev(i); setI((i + 1) % words.length); }, interval);
    return () => window.clearTimeout(t);
  }, [i, reduced, paused, hold, live, interval, words.length]);
  useEffect(() => {
    if (prev === null) return;
    const t = window.setTimeout(() => setPrev(null), ANIM_MS + 40);
    return () => window.clearTimeout(t);
  }, [prev]);

  const w = widths[i % Math.max(1, words.length)];
  return (
    <Tag ref={root} className={`ui-text-loop-root${className ? ` ${className}` : ''}`} data-effect={effect} style={style}
      onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
      <span className="ui-text-loop-sr">{`${prefix} ${words.join(', ')} ${suffix}`.trim()}</span>
      <span aria-hidden="true" className="ui-text-loop-line">
        {prefix && <span className="ui-text-loop-fixed">{prefix} </span>}
        <span className="ui-text-loop-slot" style={w ? { width: w } : undefined}>
          {w === undefined && <span className="ui-text-loop-word ui-text-loop-flow">{words[0]}</span>}
          {prev !== null && prev !== i && <span key={'o' + prev} className="ui-text-loop-word ui-text-loop-out">{words[prev]}</span>}
          {w !== undefined && <span key={'i' + i} className={`ui-text-loop-word${prev !== null ? ' ui-text-loop-in' : ''}`}>{cur}</span>}
        </span>
        {suffix && <span className="ui-text-loop-fixed"> {suffix}</span>}
      </span>
      <span ref={meas} className="ui-text-loop-meas" aria-hidden="true">{words.map((x, n) => <span key={n}>{x}</span>)}</span>
      {controls && !reduced && words.length > 1 && (
        <button type="button" className="ui-text-loop-btn" aria-pressed={paused} aria-label={paused ? 'Resume rotating words' : 'Pause rotating words'} onClick={() => setPaused((p) => !p)}>
          {paused
            ? <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>
            : <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" /></svg>}
        </button>
      )}
    </Tag>
  );
}

export function Demo() {
  return (
    <div className="ui-text-loop-demo">
      <p className="ui-text-loop-head"><TextLoop prefix="Ship" words={['faster', 'safer', 'together', 'beautifully']} controls /></p>
      <span className="ui-text-loop-note" aria-hidden="true">Hover to hold a word</span>
    </div>
  );
}
