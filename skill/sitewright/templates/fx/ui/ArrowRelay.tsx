'use client';
import type { ButtonHTMLAttributes } from 'react';

export interface ArrowRelayProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label?: string;
  /** 'right' sends the arrow out to the right and brings a new one in from the left. */
  direction?: 'right' | 'left';
}

const Arrow = ({ flip }: { flip: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

/** One arrow leaves the button as a second arrives from the opposite side (hover or keyboard focus). */
export default function ArrowRelay({ label = 'Continue', direction = 'right', className, ...rest }: ArrowRelayProps) {
  const flip = direction === 'left';
  return (
    <button type="button" {...rest} className={`ui-arrow-relay ${className ?? ''}`} data-dir={direction}>
      {flip && <span className="ui-arrow-relay-box"><span className="ui-arrow-relay-a"><Arrow flip /></span><span className="ui-arrow-relay-b"><Arrow flip /></span></span>}
      <span>{label}</span>
      {!flip && <span className="ui-arrow-relay-box"><span className="ui-arrow-relay-a"><Arrow flip={false} /></span><span className="ui-arrow-relay-b"><Arrow flip={false} /></span></span>}
    </button>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', gap: 10, alignContent: 'center' }}>
      <ArrowRelay />
      <ArrowRelay label="Back" direction="left" />
    </div>
  );
}
