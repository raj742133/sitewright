'use client';
import { useState, type CSSProperties } from 'react';
import { Scene } from './_d4';

export interface ImageStackProps { items?: { label: string; scene?: number }[]; caption?: string; className?: string }

const DEFAULT = [{ label: 'Dunes', scene: 5 }, { label: 'Lagoon', scene: 1 }, { label: 'Dusk', scene: 0 }, { label: 'Ember', scene: 2 }];

/** A pile of pictures that fans out on hover, keyboard focus, or tap. */
export default function ImageStack({ items = DEFAULT, caption = 'Trip photos', className }: ImageStackProps) {
  const [open, setOpen] = useState(false);
  const n = items.length;
  return (
    <button
      type="button"
      className={`ui-image-stack ${className ?? ''}`}
      data-open={open || undefined}
      aria-expanded={open}
      aria-label={`${caption}, ${n} pictures: ${items.map((i) => i.label).join(', ')}`}
      onClick={() => setOpen((o) => !o)}
      onBlur={() => setOpen(false)}
    >
      <span className="ui-image-stack-pile">
        {items.map((it, i) => {
          const mid = (n - 1) / 2;
          const k = i - mid; // -mid .. +mid, centre stays put
          const style = {
            '--ui-image-stack-rest': `${((i * 37) % 7) - 3}deg`,
            '--ui-image-stack-rot': `${k * 9}deg`,
            '--ui-image-stack-x': `${k * 34}px`,
            '--ui-image-stack-y': `${Math.abs(k) * 6}px`,
            zIndex: i,
          } as CSSProperties;
          return (
            <span key={it.label} className="ui-image-stack-card" style={style}>
              <Scene i={it.scene ?? i} />
              <span className="ui-image-stack-tag">{it.label}</span>
            </span>
          );
        })}
      </span>
      <span className="ui-image-stack-caption">{caption}</span>
    </button>
  );
}

export function Demo() {
  return <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><ImageStack /></div>;
}
