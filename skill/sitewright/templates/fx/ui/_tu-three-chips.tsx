'use client';
import { useRef, type KeyboardEvent } from 'react';

/** A compact labelled radio group (roving tabindex, arrow keys) used by the tu-three demos to pick a variant. Class names are `${prefix}-chips` / `${prefix}-chip`. */
export function Chips<T extends string>({ prefix, label, value, options, onChange }: { prefix: string; label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + options.length) % options.length;
    onChange(options[n]!);
    (ref.current?.querySelectorAll<HTMLButtonElement>('button')[n])?.focus();
  };
  return (
    <div ref={ref} className={`${prefix}-chips`} role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button key={o} type="button" role="radio" aria-checked={o === value} tabIndex={o === value ? 0 : -1}
          className={`${prefix}-chip${o === value ? ' is-on' : ''}`} onClick={() => onChange(o)} onKeyDown={(e) => onKey(e, i)}>{o}</button>
      ))}
    </div>
  );
}
/** Shared CSS for chips, to paste with the component prefix (kept in each component's css file). */
