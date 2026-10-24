'use client';
import { useState, type ButtonHTMLAttributes, type PointerEvent } from 'react';

export interface ExpandingFillButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label?: string;
}

/** A button whose fill grows from wherever the pointer entered, and shrinks back toward where it left. */
export default function ExpandingFillButton({ label = 'Start building', className, ...rest }: ExpandingFillButtonProps) {
  const [on, setOn] = useState(false);
  const [pt, setPt] = useState({ x: 50, y: 50 });
  const place = (e: PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPt({ x: r.width ? ((e.clientX - r.left) / r.width) * 100 : 50, y: r.height ? ((e.clientY - r.top) / r.height) * 100 : 50 });
  };
  return (
    <button
      type="button"
      {...rest}
      className={`ui-expanding-fill-button ${className ?? ''}`}
      data-on={on || undefined}
      onPointerEnter={(e) => { place(e); setOn(true); }}
      onPointerLeave={(e) => { place(e); setOn(false); }}
      onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) { setPt({ x: 50, y: 50 }); setOn(true); } }}
      onBlur={() => setOn(false)}
    >
      <span className="ui-expanding-fill-button-base">{label}</span>
      <span
        className="ui-expanding-fill-button-over"
        aria-hidden="true"
        style={{ clipPath: `circle(${on ? 150 : 0}% at ${pt.x}% ${pt.y}%)` }}
      >
        {label}
      </span>
    </button>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', gap: 10, alignContent: 'center' }}>
      <ExpandingFillButton />
      <ExpandingFillButton label="Read the docs" />
    </div>
  );
}
