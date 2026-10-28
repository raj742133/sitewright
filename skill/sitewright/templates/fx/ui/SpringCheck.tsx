'use client';
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';

export interface SpringCheckProps {
  /** Label shown beside the box (also its accessible name). */
  label?: ReactNode;
  /** Controlled checked state. */
  checked?: boolean;
  /** Initial state when uncontrolled. */
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  /** Shows a dash instead of a tick (a partly-selected group); the native input reports `mixed`. */
  indeterminate?: boolean;
  disabled?: boolean;
  name?: string;
  className?: string;
}

/** A native checkbox whose box squashes, springs the tick in with an overshoot and sends out a ring. Fully keyboard and form compatible. */
export default function SpringCheck({ label = 'Remind me tomorrow', checked, defaultChecked = false, onChange, indeterminate = false, disabled, name, className = '' }: SpringCheckProps) {
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;
  const input = useRef<HTMLInputElement>(null);
  const [pulse, setPulse] = useState(0);
  useEffect(() => { if (input.current) input.current.indeterminate = indeterminate; }, [indeterminate]);

  const change = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.checked;
    if (checked === undefined) setInner(v);
    setPulse((p) => p + 1);
    onChange?.(v);
  };
  const state = indeterminate ? 'mixed' : on ? 'on' : 'off';
  return (
    <label className={`ui-spring-check ${className}`.trim()} data-state={state} data-disabled={disabled || undefined}>
      <input ref={input} type="checkbox" className="ui-spring-check-input" checked={on} onChange={change} disabled={disabled} name={name} />
      <span className="ui-spring-check-box" aria-hidden="true">
        <span className="ui-spring-check-ring" key={pulse} data-run={pulse > 0 || undefined} />
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          <path className="ui-spring-check-tick" d="M5.5 12.5 10 17l8.5-9.5" pathLength={1} />
          <path className="ui-spring-check-dash" d="M6.5 12h11" pathLength={1} />
        </svg>
      </span>
      <span className="ui-spring-check-label">{label}</span>
    </label>
  );
}

export function Demo() {
  const [a, setA] = useState(true);
  return (
    <div className="ui-spring-check-stage">
      <div className="ui-spring-check-card">
        <SpringCheck label="Weekly digest" checked={a} onChange={setA} />
        <SpringCheck label="Product updates" />
        <SpringCheck label="Security alerts" defaultChecked />
        <SpringCheck label="Invite only (locked)" disabled />
      </div>
    </div>
  );
}
