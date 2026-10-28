'use client';
import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Scene } from './_cards-art';
import { setPointerVars } from './_cards-use';

export interface ReflectiveCardProps {
  children?: ReactNode;
  /** Height of the reflection below the card, in px. */
  reflection?: number;
  /** Strength of the reflection, 0 to 1. */
  strength?: number;
  className?: string;
  style?: CSSProperties;
}

/** A glass card standing on a glossy floor: the content is mirrored underneath and fades out, and a highlight slides across the glass with the pointer (and drifts on its own when nothing points at it). The mirror is a decorative, inert copy. */
export default function ReflectiveCard({ children, reflection = 72, strength = 0.42, className, style }: ReflectiveCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => { if (ref.current) setPointerVars(ref.current, e.clientX, e.clientY); };
  const face = (
    <div className="ui-reflective-card-face">
      <span className="ui-reflective-card-glare" aria-hidden="true" />
      <div className="ui-reflective-card-content">{children}</div>
    </div>
  );
  return (
    <div ref={ref} className={`ui-reflective-card-root ${className ?? ''}`} style={{ '--rc-h': reflection + 'px', '--rc-s': strength, ...style } as CSSProperties} onPointerMove={move} onPointerLeave={() => ref.current?.style.removeProperty('--px')}>
      {face}
      <div className="ui-reflective-card-mirror" aria-hidden="true" inert>
        <div className="ui-reflective-card-flip">{face}</div>
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-reflective-card-demo">
      <ReflectiveCard>
        <div className="ui-reflective-card-art"><Scene index={1} /></div>
        <div className="ui-reflective-card-text">
          <span className="ui-reflective-card-kicker">Limited run</span>
          <strong>Orbit Series</strong>
          <p>Glass finish, numbered edition.</p>
        </div>
      </ReflectiveCard>
    </div>
  );
}
