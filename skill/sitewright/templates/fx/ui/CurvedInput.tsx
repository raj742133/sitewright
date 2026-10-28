'use client';
import { useId, type CSSProperties } from 'react';
import { useControlled } from './_inputs-ui';

export interface CurvedInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  name?: string;
  type?: 'text' | 'email' | 'search' | 'url' | 'tel';
  maxLength?: number;
  /** How strongly the field bows, 0 (flat) to 1. */
  curve?: number;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** A text field shaped like a lens: arched top and bottom edges, with the typed text echoed along an arc above it. A real, labelled input underneath. */
export default function CurvedInput({ value, defaultValue = '', onChange, label = 'Your message', placeholder = 'Type something...', name, type = 'text', maxLength = 40, curve = 0.6, disabled, className, style }: CurvedInputProps) {
  const [v, setV] = useControlled(value, defaultValue, onChange);
  const id = useId();
  const k = Math.max(0, Math.min(1, curve));
  const b = (9 * k).toFixed(2); // bow in viewBox units (box is 100 x 40)
  const shell = `M0 ${b} Q50 ${(-9 * k).toFixed(2)} 100 ${b} L100 ${(40 - 9 * k).toFixed(2)} Q50 ${(40 + 9 * k).toFixed(2)} 0 ${(40 - 9 * k).toFixed(2)} Z`;
  const arc = `M 10 ${(26 - 14 * k).toFixed(1)} Q 160 ${(-8 - 20 * k).toFixed(1)} 310 ${(26 - 14 * k).toFixed(1)}`;
  return (
    <div className={`ui-curved-input-root ${className ?? ''}`} style={style}>
      <svg className="ui-curved-input-arc" viewBox="0 0 320 44" aria-hidden="true" focusable="false">
        <path id={id + 'a'} d={arc} fill="none" />
        <text className={v ? 'ui-curved-input-echo' : 'ui-curved-input-echo is-empty'}><textPath href={`#${id}a`} startOffset="50%" textAnchor="middle">{v || label}</textPath></text>
      </svg>
      <label className="ui-curved-input-field" data-disabled={disabled || undefined}>
        <svg className="ui-curved-input-shell" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d={shell} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="ui-curved-input-sr">{label}</span>
        <input className="ui-curved-input-input" type={type} name={name} value={v} placeholder={placeholder} maxLength={maxLength} disabled={disabled} onChange={(e) => setV(e.target.value)} autoComplete="off" />
      </label>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-curved-input-demo">
      <CurvedInput label="Name your project" placeholder="Type a name..." />
    </div>
  );
}
