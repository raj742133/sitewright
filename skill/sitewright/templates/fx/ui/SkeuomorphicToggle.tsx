'use client';
import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ToggleVariant = 'groove' | 'rocker' | 'flat' | 'segment';
export interface SkeuomorphicToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'role' | 'children'> {
  /** `groove` (a metal knob in a recessed slot with an LED) and `rocker` (a tilting paddle) are tactile; `flat` and `segment` are flat. */
  variant?: ToggleVariant;
  /** Controlled value. */
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Visible label shown beside the switch. Without it, pass `aria-label`. */
  label?: ReactNode;
}

/** A real switch (`<button role="switch" aria-checked>`): Space and Enter toggle it, the whole row is the hit area, and the four variants share one behaviour. Controlled or uncontrolled. */
export default function SkeuomorphicToggle({ variant = 'groove', checked, defaultChecked = false, onCheckedChange, label, className, onClick, disabled, type = 'button', ...rest }: SkeuomorphicToggleProps) {
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;
  const lid = useId();
  return (
    <button
      {...rest}
      type={type}
      role="switch"
      aria-checked={on}
      aria-labelledby={label !== undefined && !rest['aria-label'] ? lid : undefined}
      disabled={disabled}
      data-on={on ? 'true' : 'false'}
      className={`ui-skeuomorphic-toggle-b ui-skeuomorphic-toggle-${variant} ${className ?? ''}`}
      onClick={(e) => { const n = !on; if (checked === undefined) setInner(n); onCheckedChange?.(n); onClick?.(e); }}
    >
      {variant === 'groove' && <span className="ui-skeuomorphic-toggle-track" aria-hidden="true"><i className="ui-skeuomorphic-toggle-led" /><i className="ui-skeuomorphic-toggle-knob" /></span>}
      {variant === 'rocker' && <span className="ui-skeuomorphic-toggle-bezel" aria-hidden="true"><span className="ui-skeuomorphic-toggle-paddle"><i className="ui-skeuomorphic-toggle-mark-i" /><i className="ui-skeuomorphic-toggle-mark-o" /></span></span>}
      {variant === 'flat' && <span className="ui-skeuomorphic-toggle-track" aria-hidden="true"><i className="ui-skeuomorphic-toggle-knob" /></span>}
      {variant === 'segment' && <span className="ui-skeuomorphic-toggle-seg" aria-hidden="true"><i className="ui-skeuomorphic-toggle-pill" /><span>Off</span><span>On</span></span>}
      {label !== undefined && <span id={lid} className="ui-skeuomorphic-toggle-label">{label}</span>}
    </button>
  );
}

const ITEMS: { v: ToggleVariant; label: string; on: boolean; hint: string }[] = [
  { v: 'groove', label: 'Wi-Fi', on: true, hint: 'Metal slider' },
  { v: 'rocker', label: 'Dark', on: false, hint: 'Rocker' },
  { v: 'flat', label: 'Alerts', on: true, hint: 'Flat pill' },
  { v: 'segment', label: 'Sync', on: false, hint: 'Segmented' },
];

export function Demo() {
  return (
    <div className="ui-skeuomorphic-toggle-demo">
      {ITEMS.map((it) => (
        <div key={it.v} className={`ui-skeuomorphic-toggle-cell ui-skeuomorphic-toggle-cell-${it.v}`}>
          <span className="ui-skeuomorphic-toggle-hint">{it.hint}</span>
          <SkeuomorphicToggle variant={it.v} defaultChecked={it.on} label={it.label} />
        </div>
      ))}
    </div>
  );
}
