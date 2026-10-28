'use client';
import { useEffect, useRef, useState, type CSSProperties, type ElementType } from 'react';
import { seeded, useReducedMotion, watchLive } from './_text-c';
import { ParticleHeading } from './_text-c-heads';

export type HeadingVariant = 'decode' | 'neon' | 'particles' | 'bars';
export const HEADING_VARIANTS: { id: HeadingVariant; label: string }[] = [
  { id: 'decode', label: 'Decode' }, { id: 'neon', label: 'Neon' }, { id: 'particles', label: 'Particles' }, { id: 'bars', label: 'Bars' },
];

export interface ArticleHeadingsProps {
  /** The heading text. */
  text?: string;
  /** Small line above the heading. */
  kicker?: string;
  /** Treatment (default 'decode'). */
  variant?: HeadingVariant;
  /** Show the replay / pause button (default true). */
  controls?: boolean;
  /** Increase to replay the intro from outside. */
  replayKey?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

const SET = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>';
const scrambled = (text: string) => { const r = seeded(7); return Array.from(text).map((c) => (c === ' ' ? ' ' : SET[Math.floor(r() * SET.length)]!)).join(''); };

/**
 * Four editorial heading treatments in one component: letters that decode out of noise, a neon sign that powers up and flickers,
 * a heading assembled from particles that scatter around the pointer, and a heading over a rhythmic equaliser. Each plays when it scrolls into view
 * and can be replayed; reduced motion shows the finished heading.
 */
export default function ArticleHeadings({ text = 'The long way home', kicker = 'Field notes · 04', variant = 'decode', controls = true, replayKey = 0, as: Tag = 'h2', className, style }: ArticleHeadingsProps) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(replayKey);
  const [seen, setSeen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [shown, setShown] = useState(() => scrambled(text));
  const [done, setDone] = useState(0);
  useEffect(() => { setRun(replayKey); }, [replayKey]);
  useEffect(() => { const r = root.current; return r ? watchLive(r, (v) => { if (v) setSeen(true); }) : undefined; }, []);

  useEffect(() => {
    if (variant !== 'decode') return;
    const total = Array.from(text).length;
    if (reduced) { setShown(text); setDone(total); return; }
    if (!seen) { setShown(scrambled(text)); setDone(0); return; }
    const t0 = performance.now();
    let raf = 0, last = 0;
    const step = (now: number) => {
      const el = now - t0, n = Math.min(total, Math.max(0, Math.floor((el - 350) / 55)));
      if (now - last > 45 || n >= total) {
        last = now;
        setDone(n);
        setShown(Array.from(text).map((c, i) => (i < n || c === ' ' ? c : SET[Math.floor(Math.random() * SET.length)]!)).join(''));
      }
      if (n < total) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [variant, text, run, seen, reduced]);

  const chars = Array.from(text);
  const bars = 30;
  return (
    <div ref={root} className={`ui-article-headings-root ${className ?? ''}`} data-variant={variant} data-paused={paused ? '' : undefined} style={style}>
      <p className="ui-article-headings-kicker">{kicker}</p>
      <Tag className="ui-article-headings-head">
        <span className="ui-article-headings-sr">{text}</span>
        {variant === 'decode' ? (
          <span className="ui-article-headings-vis" aria-hidden="true">
            {Array.from(shown).map((c, i) => <span key={i} data-done={i < done ? '' : undefined}>{c}</span>)}
          </span>
        ) : variant === 'neon' ? (
          <span key={`n${run}`} className="ui-article-headings-vis ui-article-headings-neon" aria-hidden="true" data-seen={seen ? '' : undefined}>
            {chars.map((c, i) => <span key={i} data-f={i % 4 === 1 ? '' : undefined} style={{ ['--i' as string]: i }}>{c}</span>)}
          </span>
        ) : variant === 'particles' ? (
          <span className="ui-article-headings-vis ui-article-headings-pwrap" aria-hidden="true">
            <span className="ui-article-headings-ghost">{text}</span>
            <ParticleHeading text={text} run={run} reduced={reduced} />
          </span>
        ) : (
          <span className="ui-article-headings-vis ui-article-headings-eq" aria-hidden="true">
            <span className="ui-article-headings-bars">
              {Array.from({ length: bars }, (_, i) => <i key={i} style={{ ['--b' as string]: (0.3 + ((i * 37) % 11) / 16).toFixed(2), ['--d' as string]: `${(0.7 + ((i * 53) % 9) / 10).toFixed(2)}s`, ['--o' as string]: `${(-i * 0.17).toFixed(2)}s` }} />)}
            </span>
            <span className="ui-article-headings-eqtext">{text}</span>
          </span>
        )}
      </Tag>
      {controls && !(reduced && variant !== 'bars') ? (
        variant === 'bars' ? (
          reduced ? null : <button type="button" className="ui-article-headings-btn" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>{paused ? 'Play' : 'Pause'}</button>
        ) : (
          <button type="button" className="ui-article-headings-btn" onClick={() => setRun((r) => r + 1)}>Replay</button>
        )
      ) : null}
    </div>
  );
}

export function Demo() {
  const [v, setV] = useState<HeadingVariant>('decode');
  return (
    <div className="ui-article-headings-stage">
      <div className="ui-article-headings-tabs" role="group" aria-label="Heading treatment">
        {HEADING_VARIANTS.map((o) => <button key={o.id} type="button" aria-pressed={v === o.id} onClick={() => setV(o.id)}>{o.label}</button>)}
      </div>
      <ArticleHeadings variant={v} text={v === 'particles' ? 'Slow\nmornings' : 'The long way home'} />
    </div>
  );
}
