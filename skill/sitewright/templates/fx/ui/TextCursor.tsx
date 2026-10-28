'use client';
import { useEffect, useRef, useState, type CSSProperties, type ElementType } from 'react';
import { seeded, useReducedMotion, watchLive } from './_text-b';

export interface TextCursorProps {
  /** Phrases typed out one after another. */
  phrases?: string[];
  /** Caret shape. */
  caret?: 'bar' | 'block' | 'underscore';
  /** Milliseconds per typed character (average; a little human jitter is added). */
  typeMs?: number;
  /** Milliseconds per deleted character. */
  deleteMs?: number;
  /** Milliseconds a finished phrase rests before it is deleted. */
  holdMs?: number;
  /** Keep cycling; when false the last phrase stays. */
  loop?: boolean;
  /** Element to render (span by default). */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/** Text that types itself out character by character, rests, deletes and moves to the next phrase, with a blinking caret you can style (bar, block, underscore). Shows the first phrase still with reduced motion. */
export default function TextCursor({ phrases = ['Build the thing.', 'Ship it on Friday.', 'Sleep well after.'], caret = 'bar', typeMs = 70, deleteMs = 32, holdMs = 1500, loop = true, as: Tag = 'span', className, style }: TextCursorProps) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const first = phrases[0] ?? '';
  const [text, setText] = useState(first);
  const [typing, setTyping] = useState(false);
  const key = phrases.join('\u0001');

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (reduced || phrases.length === 0) { setText(phrases[0] ?? ''); setTyping(false); return; }
    const rnd = seeded(11);
    let live = true, timer = 0, pi = 0, len = 0, phase: 'type' | 'hold' | 'del' = 'type';
    setText(''); 
    const wait = (ms: number) => { timer = window.setTimeout(step, ms); };
    function step() {
      if (!live) return;
      const cur = phrases[pi] ?? '';
      if (phase === 'type') {
        len++; setText(cur.slice(0, len)); setTyping(true);
        if (len >= cur.length) { phase = 'hold'; setTyping(false); wait(holdMs); } else wait(typeMs * (0.55 + rnd() * 0.9) + (cur.charAt(len - 1) === ' ' ? 40 : 0));
      } else if (phase === 'hold') {
        if (!loop && pi === phrases.length - 1) return;
        phase = 'del'; setTyping(true); wait(deleteMs);
      } else {
        len--; setText(cur.slice(0, Math.max(0, len)));
        if (len <= 0) { phase = 'type'; pi = (pi + 1) % phrases.length; setTyping(false); wait(380); } else wait(deleteMs);
      }
    }
    const off = watchLive(el, (v) => { const was = live; live = v; if (v && !was) wait(200); else if (!v) window.clearTimeout(timer); });
    wait(450);
    return () => { live = false; window.clearTimeout(timer); off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced, typeMs, deleteMs, holdMs, loop]);

  return (
    <Tag ref={root} className={`ui-text-cursor-root${className ? ` ${className}` : ''}`} data-caret={caret} data-typing={typing && !reduced} style={style}>
      <span className="ui-text-cursor-sr">{phrases.join(' ')}</span>
      <span aria-hidden="true" className="ui-text-cursor-line"><span className="ui-text-cursor-text">{text}</span><span className="ui-text-cursor-caret" /></span>
    </Tag>
  );
}

export function Demo() {
  return (
    <div className="ui-text-cursor-demo">
      <div className="ui-text-cursor-term">
        <div className="ui-text-cursor-bar" aria-hidden="true"><i /><i /><i /><span>deploy.sh</span></div>
        <div className="ui-text-cursor-body"><span className="ui-text-cursor-prompt" aria-hidden="true">$</span><TextCursor caret="block" /></div>
      </div>
    </div>
  );
}
