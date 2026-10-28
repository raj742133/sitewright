'use client';
import { useId, useRef, useState, type CSSProperties } from 'react';

export interface RubberSegmentOption { value: string; label: string; disabled?: boolean }

export interface RubberSegmentProps {
  options?: (RubberSegmentOption | string)[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Accessible name of the group. */
  label?: string;
  name?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULTS = ['Day', 'Week', 'Month', 'Year'];

/** A segmented control whose highlight is a rubber band: the leading edge snaps ahead and overshoots, the trailing edge is dragged after it. Native radios give arrow-key operation. */
export default function RubberSegment({ options = DEFAULTS, value, defaultValue, onChange, label = 'View', name, className = '', style }: RubberSegmentProps) {
  const uid = useId();
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const [inner, setInner] = useState(defaultValue ?? opts[0]?.value ?? '');
  const current = value ?? inner;
  const idx = Math.max(0, opts.findIndex((o) => o.value === current));
  const prev = useRef(idx);
  const dir = useRef<'fwd' | 'back'>('fwd');
  if (prev.current !== idx) { dir.current = idx > prev.current ? 'fwd' : 'back'; prev.current = idx; }
  const pick = (v: string) => { if (value === undefined) setInner(v); onChange?.(v); };
  return (
    <div role="radiogroup" aria-label={label} className={`ui-rubber-segment ${className}`.trim()} data-dir={dir.current}
      style={{ ...style, ['--i' as string]: idx, ['--n' as string]: opts.length }}>
      <span className="ui-rubber-segment-band" aria-hidden="true" />
      {opts.map((o) => (
        <label key={o.value} className="ui-rubber-segment-opt" data-checked={current === o.value || undefined} data-disabled={o.disabled || undefined}>
          <input type="radio" className="ui-rubber-segment-input" name={name ?? `rs${uid}`} value={o.value} checked={current === o.value} disabled={o.disabled} onChange={() => pick(o.value)} />
          <span className="ui-rubber-segment-text">{o.label}</span>
        </label>
      ))}
    </div>
  );
}

export function Demo() {
  const [v, setV] = useState('Week');
  return (
    <div className="ui-rubber-segment-stage">
      <RubberSegment value={v} onChange={setV} />
      <p className="ui-rubber-segment-note" aria-live="polite">Showing the past {v.toLowerCase()}</p>
    </div>
  );
}
