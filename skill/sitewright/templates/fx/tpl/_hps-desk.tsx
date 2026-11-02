'use client';
// The desk around the open sketchbook: light that is a window by day and a lamp by night (both drawn in CSS from the host tokens), a
// tea ring, a pencil and an eraser lying on the wood, floating dust in the lamp light, and the index-tab ribbon that is the navigation.
import type { MouseEvent } from 'react';
import { rng } from './_hps-art';

export function Room() {
  const rnd = rng(7);
  return (
    <div className="hps-room" aria-hidden="true">
      <span className="hps-wood" />
      <span className="hps-win" />
      <span className="hps-lamp" />
      <span className="hps-vig" />
      <span className="hps-dust">{Array.from({ length: 16 }, (_, k) => <i key={k} style={{ left: `${(8 + rnd() * 84).toFixed(1)}%`, top: `${(6 + rnd() * 80).toFixed(1)}%`, animationDelay: `${(-rnd() * 14).toFixed(1)}s`, animationDuration: `${(11 + rnd() * 10).toFixed(1)}s`, '--s': (0.5 + rnd() * 1.1).toFixed(2) } as React.CSSProperties} />)}</span>
    </div>
  );
}

export function Objects() {
  return (
    <>
      <span className="hps-ring" aria-hidden="true" />
      <svg className="hps-pencil" viewBox="0 0 330 30" aria-hidden="true">
        <g className="hps-pen-shadow"><rect x="64" y="6" width="226" height="22" rx="3" /></g>
        <path className="hps-pen-wood" d="M70 3L12 15L70 27Z" />
        <path className="hps-pen-lead" d="M24 12.5L11 15l13 2.5Z" />
        <rect className="hps-pen-b1" x="70" y="3" width="190" height="8" /><rect className="hps-pen-b2" x="70" y="11" width="190" height="8" /><rect className="hps-pen-b3" x="70" y="19" width="190" height="8" />
        <path className="hps-pen-ln" d="M70 11H260M70 19H260" />
        <rect className="hps-pen-fer" x="260" y="3" width="26" height="24" /><path className="hps-pen-ln" d="M268 3v24M276 3v24" />
        <rect className="hps-pen-er" x="286" y="4" width="30" height="22" rx="6" />
        <text className="hps-pen-tx" x="104" y="18.6">ODILE &#183; 2B &#183; PORTO</text>
      </svg>
      <svg className="hps-eraser" viewBox="0 0 80 44" aria-hidden="true"><rect className="hps-er-body" x="3" y="6" width="74" height="32" rx="5" /><rect className="hps-er-sleeve" x="26" y="6" width="28" height="32" /><path className="hps-pen-ln" d="M26 6v32M54 6v32" /></svg>
    </>
  );
}

export interface TabItem { id: string; label: string; focus?: boolean }
export function Tabs({ items, onJump }: { items: TabItem[]; onJump: (id: string, focus?: boolean) => (e: MouseEvent) => void }) {
  return (
    <nav className="hps-tabs" aria-label="Primary">
      {items.map((t, k) => <a key={t.id} href={`#${t.id}`} className="hps-tab" style={{ '--k': k } as React.CSSProperties} onClick={onJump(t.id, t.focus)}><span>{t.label}</span></a>)}
    </nav>
  );
}

/** the round "original drawings" sticker face; StickerPeel fills its box with whatever it is given */
export function StickerFace() {
  return (
    <svg className="hps-stk" viewBox="0 0 120 120" aria-hidden="true">
      <defs><path id="hps-circ" d="M60 60m-41 0a41 41 0 1 1 82 0a41 41 0 1 1-82 0" /></defs>
      <rect width="120" height="120" className="hps-stk-bg" />
      <circle cx="60" cy="60" r="54" className="hps-stk-r1" /><circle cx="60" cy="60" r="29" className="hps-stk-r2" />
      <text className="hps-stk-t"><textPath href="#hps-circ" startOffset="0">ORIGINAL DRAWINGS &#183; PORTO &#183; </textPath></text>
      <path className="hps-stk-p" d="M60 42c-4 7-12 8-12 17 0 6 5 10 12 10s12-4 12-10c0-9-8-10-12-17z" /><path className="hps-stk-v" d="M60 50v19" />
    </svg>
  );
}
