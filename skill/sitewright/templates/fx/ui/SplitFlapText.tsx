'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion, watchLive } from './_text-b';

export interface SplitFlapTextProps {
  /** Text to display (controlled). Ignored while `words` is cycling. */
  text?: string;
  /** If set, the board cycles through these on its own. */
  words?: string[];
  /** Milliseconds between automatic changes. */
  interval?: number;
  /** Number of cells; defaults to the longest text. */
  length?: number;
  /** Milliseconds per flap. */
  flapMs?: number;
  /** Cell height in px. */
  size?: number;
  /** Characters a flap can show, in the order the drum turns. */
  charset?: string;
  className?: string;
  style?: CSSProperties;
}

const CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-:.';

interface CellProps { target: string; charset: string; flapMs: number; delay: number; instant: boolean; live: boolean }

function Cell({ target, charset, flapMs, delay, instant, live }: CellProps) {
  const [st, setSt] = useState({ cur: target, nxt: target, flip: 0 });
  const curRef = useRef(target);
  useEffect(() => {
    if (instant || !live) { curRef.current = target; setSt({ cur: target, nxt: target, flip: 0 }); return; }
    const ti = charset.indexOf(target);
    let timer = 0;
    const next = () => {
      const cur = curRef.current;
      if (cur === target) return;
      const ci = charset.indexOf(cur);
      let nx = target;
      if (ti >= 0) { const base = ci >= 0 ? ci : ti - 6; nx = charset.charAt((base + 1 + charset.length) % charset.length); }
      curRef.current = nx;
      setSt((s) => ({ cur: cur, nxt: nx, flip: s.flip + 1 }));
      timer = window.setTimeout(() => { setSt((s) => ({ cur: nx, nxt: nx, flip: s.flip })); next(); }, flapMs);
    };
    timer = window.setTimeout(next, delay);
    return () => window.clearTimeout(timer);
  }, [target, charset, flapMs, delay, instant, live]);
  const flipping = st.cur !== st.nxt;
  const g = (c: string) => <span className="ui-split-flap-text-glyph">{c === ' ' ? ' ' : c}</span>;
  return (
    <span className="ui-split-flap-text-cell" style={{ ['--flap' as string]: `${flapMs / 2}ms` }}>
      <span className="ui-split-flap-text-half ui-split-flap-text-top">{g(flipping ? st.nxt : st.cur)}</span>
      <span className="ui-split-flap-text-half ui-split-flap-text-bottom">{g(st.cur)}</span>
      {flipping && <span key={'t' + st.flip} className="ui-split-flap-text-half ui-split-flap-text-top ui-split-flap-text-leaf ui-split-flap-text-fall">{g(st.cur)}</span>}
      {flipping && <span key={'b' + st.flip} className="ui-split-flap-text-half ui-split-flap-text-bottom ui-split-flap-text-leaf ui-split-flap-text-rise">{g(st.nxt)}</span>}
    </span>
  );
}

/** A departure-board display: every character sits on its own flap and turns through the drum, one flap at a time, until it shows the target. Cycles `words` by itself or follows `text`. */
export default function SplitFlapText({ text = 'DEPARTURES', words, interval = 3600, length, flapMs = 80, size = 44, charset = CHARS, className, style }: SplitFlapTextProps) {
  const root = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [live, setLive] = useState(true);
  const list = words && words.length ? words : null;

  useEffect(() => {
    const el = root.current;
    return el ? watchLive(el, setLive) : undefined;
  }, []);
  useEffect(() => {
    if (!list || reduced || !live || list.length < 2) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % list.length), interval);
    return () => window.clearInterval(t);
  }, [list, reduced, live, interval]);

  const shown = (list ? list[idx % list.length] ?? '' : text).toUpperCase();
  const n = length ?? Math.max(...(list ?? [text]).map((w) => w.length), 1);
  const cells = Array.from({ length: n }, (_, i) => shown.charAt(i) || ' ');
  return (
    <span ref={root} className={`ui-split-flap-text-root${className ? ` ${className}` : ''}`} style={{ ['--cell' as string]: `${size}px`, ...style }}>
      <span className="ui-split-flap-text-sr" role="status">{shown.trim()}</span>
      <span className="ui-split-flap-text-board" aria-hidden="true">
        {cells.map((c, i) => <Cell key={i} target={c} charset={charset} flapMs={flapMs} delay={i * 45} instant={reduced} live={live} />)}
      </span>
    </span>
  );
}

export function Demo() {
  return (
    <div className="ui-split-flap-text-demo">
      <span className="ui-split-flap-text-label" aria-hidden="true">Next flight</span>
      <SplitFlapText words={['LISBON', 'OSLO', 'KYOTO', 'LIMA']} size={52} />
      <span className="ui-split-flap-text-gate" aria-hidden="true"><i /> Gate 12 - on time</span>
    </div>
  );
}
