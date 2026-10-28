'use client';
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { useReducedMotion } from './_t2';

export interface StackCard { id: string; title: string; body?: string; tag?: string; content?: ReactNode }
export interface StackProps {
  cards?: StackCard[];
  /** Called with the id of the card that is now on top. */
  onChange?: (id: string) => void;
  /** Drag distance in px that sends the top card to the back. */
  threshold?: number;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT: StackCard[] = [
  { id: 'a', title: 'Plan', body: 'Sketch the outline and agree the scope.', tag: '01' },
  { id: 'b', title: 'Build', body: 'Ship the smallest useful version first.', tag: '02' },
  { id: 'c', title: 'Review', body: 'Read it aloud and cut a third.', tag: '03' },
  { id: 'd', title: 'Launch', body: 'Tell three people and watch what happens.', tag: '04' },
];

/** A pile of cards. Drag, flick or click the top card to send it to the back; arrow keys and the buttons do the same. */
export default function Stack({ cards = DEFAULT, onChange, threshold = 90, className, style }: StackProps) {
  const n = cards.length;
  const [top, setTop] = useState(0);
  const [d, setD] = useState({ x: 0, y: 0, on: false });
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const reduced = useReducedMotion();
  const go = (by: number) => {
    if (n < 2) return;
    const t = (((top + by) % n) + n) % n;
    setTop(t);
    onChange?.(cards[t]!.id);
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, moved: false };
    setD({ x: 0, y: 0, on: true });
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    const x = e.clientX - s.x, y = e.clientY - s.y;
    if (Math.abs(x) + Math.abs(y) > 4) s.moved = true;
    setD({ x, y, on: true });
  };
  const up = () => {
    const s = start.current;
    if (!s) return;
    start.current = null;
    const far = Math.hypot(d.x, d.y) > threshold;
    setD({ x: 0, y: 0, on: false });
    if (far || !s.moved) go(1);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') go(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1);
    else return;
    e.preventDefault();
  };
  const depth = Math.min(4, n);
  const cur = cards[top];
  return (
    <div className={`ui-stack-root ${className ?? ''}`} style={style} role="group" aria-roledescription="card stack" aria-label="Card stack" tabIndex={0} onKeyDown={key}>
      <div className="ui-stack-pile">
        {cards.map((c, i) => {
          const pos = (i - top + n) % n; // 0 = top
          const vis = pos < depth;
          const isTop = pos === 0;
          const rot = ((i * 37) % 7 - 3) * (isTop ? 0 : 1.2) + (isTop ? d.x / 18 : 0);
          const tx = isTop ? d.x : 0, ty = isTop ? d.y : 0;
          const t = `translate(${tx}px, ${ty - pos * 10}px) scale(${1 - pos * 0.05}) rotate(${rot}deg)`;
          return (
            <div key={c.id} className={`ui-stack-card ${isTop ? 'is-top' : ''}`} aria-hidden={!isTop} data-tone={i % 4}
              style={{ transform: t, zIndex: n - pos, opacity: vis ? 1 : 0, transition: d.on && isTop || reduced ? 'none' : undefined, pointerEvents: isTop ? 'auto' : 'none' }}
              onPointerDown={isTop ? down : undefined} onPointerMove={isTop ? move : undefined} onPointerUp={isTop ? up : undefined} onPointerCancel={isTop ? up : undefined}>
              {c.tag && <span className="ui-stack-tag">{c.tag}</span>}
              <strong>{c.title}</strong>
              {c.content ?? (c.body && <p>{c.body}</p>)}
            </div>
          );
        })}
      </div>
      <div className="ui-stack-bar">
        <button type="button" aria-label="Previous card" onClick={() => go(-1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg></button>
        <span aria-live="polite">{top + 1} / {n}<span className="ui-stack-sr"> {cur?.title}</span></span>
        <button type="button" aria-label="Next card" onClick={() => go(1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg></button>
      </div>
    </div>
  );
}

export function Demo() {
  return <div className="ui-stack-demo"><Stack /></div>;
}
