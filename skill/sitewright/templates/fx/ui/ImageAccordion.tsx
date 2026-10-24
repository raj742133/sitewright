'use client';
import { useRef, useState, type KeyboardEvent } from 'react';
import { Scene } from './_d4';

export interface AccordionPanel { title: string; text?: string; scene?: number }
export interface ImageAccordionProps { panels?: AccordionPanel[]; className?: string }

const DEFAULT: AccordionPanel[] = [
  { title: 'Coast', text: 'Salt air and slow tides.', scene: 1 },
  { title: 'Dusk', text: 'The harbour lights come on.', scene: 0 },
  { title: 'Forest', text: 'Cedar, fern and fog.', scene: 3 },
  { title: 'Desert', text: 'Warm stone at sunset.', scene: 5 },
];

/** Horizontal accordion of pictures. The hovered, focused or tapped panel grows; arrow keys, Home and End move between panels. */
export default function ImageAccordion({ panels = DEFAULT, className }: ImageAccordionProps) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const go = (i: number) => { const n = (i + panels.length) % panels.length; setActive(n); refs.current[n]?.focus(); };
  const key = (e: KeyboardEvent, i: number) => {
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown') go(i + 1);
    else if (k === 'ArrowLeft' || k === 'ArrowUp') go(i - 1);
    else if (k === 'Home') go(0);
    else if (k === 'End') go(panels.length - 1);
    else return;
    e.preventDefault();
  };
  return (
    <div className={`ui-image-accordion ${className ?? ''}`} role="group" aria-label="Picture panels">
      {panels.map((p, i) => (
        <button
          key={p.title}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          className="ui-image-accordion-panel"
          data-active={active === i || undefined}
          aria-expanded={active === i}
          tabIndex={active === i ? 0 : -1}
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') setActive(i); }}
          onFocus={() => setActive(i)}
          onClick={() => setActive(i)}
          onKeyDown={(e) => key(e, i)}
        >
          <Scene i={p.scene ?? i} />
          <span className="ui-image-accordion-shade" />
          <span className="ui-image-accordion-copy">
            <span className="ui-image-accordion-title">{p.title}</span>
            {p.text && <span className="ui-image-accordion-text">{p.text}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

export function Demo() {
  return <div style={{ padding: 8, height: '100%', boxSizing: 'border-box' }}><ImageAccordion /></div>;
}
