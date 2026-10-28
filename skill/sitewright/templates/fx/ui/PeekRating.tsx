'use client';
import { useId, useState, type CSSProperties } from 'react';

export interface PeekRatingProps {
  /** Controlled rating (0 = none). */
  value?: number;
  /** Initial rating when uncontrolled. */
  defaultValue?: number;
  onChange?: (value: number) => void;
  /** Number of stars. */
  max?: number;
  /** One word per star, shown in the peek line. */
  labels?: string[];
  /** Accessible name of the group. */
  label?: string;
  /** Display only: renders an image with the value as its name. */
  readOnly?: boolean;
  name?: string;
  className?: string;
  style?: CSSProperties;
}

const WORDS = ['Poor', 'Fair', 'Good', 'Great', 'Superb'];
const STAR = 'M12 2.9l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.1 6.4 20.2l1.2-6.3L3 9.5l6.3-.8z';

/** A star rating that peeks: hovering or focusing a star previews the rating, lifts its neighbours and names it above the row before you commit. Native radios give arrow-key operation. */
export default function PeekRating({ value, defaultValue = 0, onChange, max = 5, labels = WORDS, label = 'Rating', readOnly, name, className = '', style }: PeekRatingProps) {
  const uid = useId();
  const [inner, setInner] = useState(defaultValue);
  const [peek, setPeek] = useState(0);
  const current = value ?? inner;
  const shown = peek || current;
  const word = (n: number) => labels[n - 1] ?? `${n} of ${max}`;
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  const pick = (n: number) => { if (value === undefined) setInner(n); onChange?.(n); };

  const line = (
    <span className="ui-peek-rating-peek" aria-hidden="true" data-peek={peek > 0 || undefined}>
      {shown > 0 ? <><strong>{word(shown)}</strong><span>{shown}/{max}</span></> : <span>Tap a star</span>}
    </span>
  );
  const star = (n: number) => {
    const d = peek ? Math.abs(n - peek) : 9;
    const lift = peek ? Math.max(0, 1 - d * 0.45) : 0;
    return (
      <svg viewBox="0 0 24 24" className="ui-peek-rating-star" aria-hidden="true" focusable="false" data-on={n <= current || undefined} data-peek={(peek > 0 && n <= peek) || undefined} style={{ ['--lift' as string]: lift.toFixed(2) }}>
        <path d={STAR} />
      </svg>
    );
  };

  if (readOnly) {
    return (
      <div role="img" aria-label={`${label}: ${current} of ${max}`} className={`ui-peek-rating ${className}`.trim()} style={style}>
        <div className="ui-peek-rating-row">{stars.map((n) => <span key={n} className="ui-peek-rating-cell">{star(n)}</span>)}</div>
      </div>
    );
  }
  return (
    <div className={`ui-peek-rating ${className}`.trim()} style={style} onPointerLeave={() => setPeek(0)}>
      {line}
      <div role="radiogroup" aria-label={label} className="ui-peek-rating-row">
        {stars.map((n) => (
          <label key={n} className="ui-peek-rating-cell" onPointerEnter={(e) => { if (e.pointerType !== 'touch') setPeek(n); }}>
            <input type="radio" className="ui-peek-rating-input" name={name ?? `pr${uid}`} value={n} checked={current === n}
              aria-label={`${n} of ${max}, ${word(n)}`} onChange={() => pick(n)} onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) setPeek(n); }} onBlur={() => setPeek(0)} />
            {star(n)}
          </label>
        ))}
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-peek-rating-stage">
      <div className="ui-peek-rating-card">
        <span className="ui-peek-rating-q">How was the walkthrough?</span>
        <PeekRating defaultValue={3} />
      </div>
    </div>
  );
}
