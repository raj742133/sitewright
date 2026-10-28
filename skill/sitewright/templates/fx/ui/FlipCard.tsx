'use client';
import { type CSSProperties, type ReactNode } from 'react';
import { cx, useControlled } from './_micro-a';

export interface FlipCardProps {
  /** Front face. Defaults to a small illustrated title card. */
  front?: ReactNode;
  /** Back face. Faces must not contain interactive elements: the whole card is one button. */
  back?: ReactNode;
  flipped?: boolean;
  defaultFlipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  /** Spin around the vertical (y) or horizontal (x) axis. */
  axis?: 'x' | 'y';
  /** Spoken name for the control, e.g. "Pocket atlas". Faces are read as content. */
  label?: string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

function Art() {
  return (
    <svg viewBox="0 0 160 80" preserveAspectRatio="xMidYMid slice" className="ui-flip-card-art" aria-hidden="true" focusable="false">
      <circle cx="118" cy="30" r="20" className="ui-flip-card-sun" />
      <path d="M0 80V58l30-24 24 18 34-30 40 36 32-14v36z" className="ui-flip-card-hill" />
      <path d="M0 80V66l40-16 30 14 36-18 54 20v14z" className="ui-flip-card-hill2" />
    </svg>
  );
}

/** A card that turns over to reveal a second face. One real button: Enter, Space or a click flips it; the hidden face is removed from the accessibility tree. Under reduced motion it swaps instantly. */
export default function FlipCard({ front, back, flipped, defaultFlipped = false, onFlip, axis = 'y', label = 'Flip card', height, className, style }: FlipCardProps) {
  const [on, setOn] = useControlled(flipped, defaultFlipped, onFlip);
  return (
    <button type="button" className={cx('ui-flip-card', on && 'is-flipped', className)} data-axis={axis} aria-pressed={on} title={label} style={{ ...(height !== undefined ? { height } : null), ...style }} onClick={() => setOn(!on)}>
      <span className="ui-flip-card-inner">
        <span className="ui-flip-card-face is-front" aria-hidden={on || undefined}>
          {front ?? (
            <>
              <Art />
              <span className="ui-flip-card-body"><strong>Pocket atlas</strong><span>Maps for people who wander</span></span>
              <span className="ui-flip-card-cue" aria-hidden="true">Flip <i>↻</i></span>
            </>
          )}
        </span>
        <span className="ui-flip-card-face is-back" aria-hidden={!on || undefined}>
          {back ?? (
            <>
              <strong className="ui-flip-card-h">Inside</strong>
              <span className="ui-flip-card-list"><span>48 hand-drawn city maps</span><span>Waterproof paper</span><span>Fits a back pocket</span></span>
              <span className="ui-flip-card-cue" aria-hidden="true">Back <i>↻</i></span>
            </>
          )}
        </span>
      </span>
    </button>
  );
}

export function Demo() {
  return (
    <div className="ui-flip-card-demo">
      <FlipCard />
    </div>
  );
}
