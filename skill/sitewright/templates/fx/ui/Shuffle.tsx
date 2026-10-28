'use client';
import { Fragment, useCallback, useEffect, useMemo, useRef, type CSSProperties, type ElementType } from 'react';
import { useReducedMotion, watchInView } from './_text-b';

export interface ShuffleProps {
  /** The text to shuffle. */
  text?: string;
  /** Element to render (h2 by default). */
  as?: ElementType;
  /** How many scrambled arrangements the letters pass through before settling. */
  rounds?: number;
  /** Milliseconds each arrangement is held. */
  hold?: number;
  /** Play once when scrolled into view. */
  playOnView?: boolean;
  className?: string;
  style?: CSSProperties;
}

function permute(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i] as number; a[i] = a[j] as number; a[j] = t; }
  return a;
}

/** Letters trade places: each tile slides through several random arrangements of the line, then settles back into reading order. Plays on view, and on hover, click, tap or Enter. */
export default function Shuffle({ text = 'Shuffle the deck', as: Tag = 'h2', rounds = 4, hold = 260, playOnView = true, className, style }: ShuffleProps) {
  const btn = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  const running = useRef(false);
  const reduced = useReducedMotion();
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  let k = 0;

  const clear = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
  const reset = useCallback(() => {
    btn.current?.querySelectorAll<HTMLElement>('.ui-shuffle-ch').forEach((c) => { c.style.transform = ''; c.style.transitionDelay = ''; });
    btn.current?.removeAttribute('data-run');
  }, []);

  const play = useCallback(() => {
    const el = btn.current;
    if (!el || reduced || running.current) return;
    const nodes = Array.from(el.querySelectorAll<HTMLElement>('.ui-shuffle-ch'));
    const idx = nodes.map((n, i) => (n.dataset.sp ? -1 : i)).filter((i) => i >= 0);
    if (idx.length < 2) return;
    const pos = nodes.map((n) => ({ x: n.offsetLeft, y: n.offsetTop }));
    running.current = true;
    el.setAttribute('data-run', 'true');
    const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
    for (let r = 0; r < rounds; r++) {
      at(r * hold, () => {
        const p = permute(idx.length);
        idx.forEach((ni, k) => {
          const to = pos[idx[p[k] as number] as number] as { x: number; y: number };
          const from = pos[ni] as { x: number; y: number };
          const n = nodes[ni] as HTMLElement;
          n.style.transitionDelay = '0ms';
          n.style.transform = `translate(${to.x - from.x}px, ${to.y - from.y}px)`;
        });
      });
    }
    at(rounds * hold, () => {
      idx.forEach((ni, k) => { const n = nodes[ni] as HTMLElement; n.style.transitionDelay = `${k * 24}ms`; n.style.transform = ''; });
    });
    at(rounds * hold + idx.length * 24 + 520, () => { running.current = false; reset(); });
  }, [reduced, rounds, hold, reset]);

  useEffect(() => {
    const el = btn.current;
    if (!el || !playOnView || reduced) return;
    let done = false;
    const off = watchInView(el, (v) => { if (v && !done) { done = true; window.setTimeout(play, 250); } }, 0.6);
    return off;
  }, [playOnView, reduced, play]);

  useEffect(() => () => { clear(); running.current = false; }, []);
  useEffect(() => { if (reduced) { clear(); running.current = false; reset(); } }, [reduced, reset]);

  return (
    <Tag className={`ui-shuffle-root${className ? ` ${className}` : ''}`} style={style}>
      <button ref={btn} type="button" className="ui-shuffle-btn" aria-label={`${text}. Shuffle the letters.`} onClick={play} onPointerEnter={(e) => { if (e.pointerType === 'mouse') play(); }}>
        <span aria-hidden="true">
          {words.map((w, wi) => (
            <Fragment key={wi}>
              <span className="ui-shuffle-word">{Array.from(w).map((c) => <span key={k++} className="ui-shuffle-ch">{c}</span>)}</span>
              {wi < words.length - 1 && <span key={'s' + k++} className="ui-shuffle-ch ui-shuffle-sp" data-sp="1"> </span>}
            </Fragment>
          ))}
        </span>
      </button>
    </Tag>
  );
}

export function Demo() {
  return (
    <div className="ui-shuffle-demo">
      <span className="ui-shuffle-kicker" aria-hidden="true">Hover, tap or press Enter</span>
      <Shuffle text="Shuffle the deck" />
    </div>
  );
}
