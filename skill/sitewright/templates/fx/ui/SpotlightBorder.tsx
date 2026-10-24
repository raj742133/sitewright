'use client';
import { useRef, type PointerEvent, type ReactNode } from 'react';

export interface SpotlightBorderProps {
  title?: string;
  children?: ReactNode;
  className?: string;
}

/** A card whose 1.5px border is lit by a radial gradient that follows the pointer. Keyboard focus lights it steadily. */
export default function SpotlightBorder({ title = 'Edge lighting', children, className }: SpotlightBorderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--ui-spotlight-border-x', `${e.clientX - r.left}px`);
    el.style.setProperty('--ui-spotlight-border-y', `${e.clientY - r.top}px`);
  };
  return (
    <div ref={ref} className={`ui-spotlight-border ${className ?? ''}`} onPointerMove={move} tabIndex={0} role="group" aria-label={title}>
      <div className="ui-spotlight-border-inner">
        <h3 className="ui-spotlight-border-title">{title}</h3>
        <div className="ui-spotlight-border-body">{children ?? 'Move across the card and the border catches the light under your pointer.'}</div>
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', padding: '0 14px', boxSizing: 'border-box' }}>
      <SpotlightBorder title="Spotlight">Hover to light the edge.</SpotlightBorder>
    </div>
  );
}
