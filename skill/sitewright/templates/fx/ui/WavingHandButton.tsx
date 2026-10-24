'use client';
import { useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';

export interface WavingHandButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label?: string;
  hoverLabel?: string;
}

/** A hand glyph waves while the pointer is over (or keyboard focus is on) the button, and the label greets back. Tap waves once. */
export default function WavingHandButton({ label = 'Say hello', hoverLabel = 'Hi there!', onClick, className, ...rest }: WavingHandButtonProps) {
  const [on, setOn] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const tap = () => {
    setOn(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOn(false), 1800);
  };
  return (
    <button
      type="button"
      {...rest}
      className={`ui-waving-hand-button ${className ?? ''}`}
      data-on={on || undefined}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setOn(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOn(false); }}
      onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) setOn(true); }}
      onBlur={() => setOn(false)}
      onClick={(e) => { tap(); onClick?.(e); }}
    >
      <svg className="ui-waving-hand-button-hand" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V10M11 10V4a1.5 1.5 0 0 1 3 0v6M14 10V5.5a1.5 1.5 0 0 1 3 0V13M17 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1.2a6 6 0 0 1-5-2.7L4 14.2a1.6 1.6 0 0 1 2.7-1.7L8 14" />
      </svg>
      <span aria-live="polite">{on ? hoverLabel : label}</span>
    </button>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <WavingHandButton />
    </div>
  );
}
