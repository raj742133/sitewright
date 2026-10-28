'use client';
import { useId, useState, type CSSProperties } from 'react';

export interface JellyRadioOption {
  value: string;
  label: string;
  /** Optional second line. */
  hint?: string;
  disabled?: boolean;
}

export interface JellyRadioProps {
  options?: JellyRadioOption[];
  /** Controlled value. */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Accessible name of the group. */
  label?: string;
  /** Form field name (defaults to a generated one). */
  name?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULTS: JellyRadioOption[] = [
  { value: 'solo', label: 'Solo', hint: 'One seat, free forever' },
  { value: 'team', label: 'Team', hint: 'Up to 12 seats, shared boards' },
  { value: 'studio', label: 'Studio', hint: 'Unlimited seats, priority help' },
];

/** A radio group whose selection dot wobbles like jelly when chosen. Native radio inputs underneath: arrow keys, Tab, forms and screen readers all work. */
export default function JellyRadio({ options = DEFAULTS, value, defaultValue, onChange, label = 'Plan', name, className = '', style }: JellyRadioProps) {
  const uid = useId();
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? '');
  const current = value ?? inner;
  const pick = (v: string) => { if (value === undefined) setInner(v); onChange?.(v); };
  return (
    <div role="radiogroup" aria-label={label} className={`ui-jelly-radio ${className}`.trim()} style={style}>
      {options.map((o) => (
        <label key={o.value} className="ui-jelly-radio-opt" data-checked={current === o.value || undefined} data-disabled={o.disabled || undefined}>
          <input type="radio" className="ui-jelly-radio-input" name={name ?? `jr${uid}`} value={o.value} checked={current === o.value} disabled={o.disabled} onChange={() => pick(o.value)} />
          <span className="ui-jelly-radio-dot" aria-hidden="true"><span className="ui-jelly-radio-blob" /></span>
          <span className="ui-jelly-radio-text">
            <span className="ui-jelly-radio-label">{o.label}</span>
            {o.hint && <span className="ui-jelly-radio-hint">{o.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-jelly-radio-stage">
      <JellyRadio />
    </div>
  );
}
