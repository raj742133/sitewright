'use client';
import { useState } from 'react';
import { Scene } from './_d4';

export interface BlindsRevealProps { slats?: number; cover?: number; reveal?: number; title?: string; caption?: string; className?: string }

/** A picture revealed through vertical blinds: the cover slats turn edge-on one after another on hover, focus or tap. */
export default function BlindsReveal({ slats = 8, cover = 4, reveal = 0, title = 'Open the blinds', caption = 'Harbour at dusk', className }: BlindsRevealProps) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" className={`ui-blinds-reveal ${className ?? ''}`} data-open={open || undefined} aria-pressed={open} aria-label={`${title}: ${open ? caption : 'closed'}`} onClick={() => setOpen((o) => !o)} onBlur={() => setOpen(false)}>
      <span className="ui-blinds-reveal-under"><Scene i={reveal} /></span>
      <span className="ui-blinds-reveal-slats" aria-hidden="true">
        {Array.from({ length: slats }, (_, i) => (
          <span key={i} className="ui-blinds-reveal-slat" style={{ transitionDelay: `${i * 55}ms` }}>
            <span className="ui-blinds-reveal-slice" style={{ width: `${slats * 100}%`, left: `${-i * 100}%` }}><Scene i={cover} /></span>
          </span>
        ))}
      </span>
      <span className="ui-blinds-reveal-label">{open ? caption : title}</span>
    </button>
  );
}

export function Demo() {
  return <div style={{ padding: 8, height: '100%', boxSizing: 'border-box' }}><BlindsReveal /></div>;
}
