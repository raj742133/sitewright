'use client';
import { useRef, type ReactNode } from 'react';
import { useCoarsePointer, usePointerVars, useReducedMotion } from './_d5';

export interface HolographicCardProps {
  title?: string;
  subtitle?: string;
  serial?: string;
  /** Replaces the default content. */
  children?: ReactNode;
  className?: string;
}

/** A card with a rainbow foil sheen and glare that move with the pointer, plus a gentle 3D tilt. Arrow keys tilt it; touch and keyboard get a slow idle sweep. */
export default function HolographicCard({ title = 'Aurora Member', subtitle = 'Foil edition', serial = 'No. 0420 / 1000', children, className }: HolographicCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const coarse = useCoarsePointer();
  const reduced = useReducedMotion();
  usePointerVars(ref, { enabled: !reduced, keys: true });
  return (
    <div ref={ref} className={`ui-holographic-card-root ${coarse && !reduced ? 'ui-holographic-card-sweep' : ''} ${className ?? ''}`} tabIndex={0} role="group" aria-label={`${title}, ${subtitle}. Foil effect responds to pointer or arrow keys.`}>
      <div className="ui-holographic-card-card">
        <span className="ui-holographic-card-foil" aria-hidden="true" />
        <span className="ui-holographic-card-glare" aria-hidden="true" />
        <div className="ui-holographic-card-body">
          {children ?? (
            <>
              <svg className="ui-holographic-card-mark" viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
                <path d="M16 3l3.4 9.2L29 13l-7.6 5.8L24 28l-8-5.4L8 28l2.6-9.2L3 13l9.6-.8z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              <div><strong className="ui-holographic-card-title">{title}</strong><span className="ui-holographic-card-sub">{subtitle}</span></div>
              <span className="ui-holographic-card-serial">{serial}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function Demo() {
  return <HolographicCard />;
}
