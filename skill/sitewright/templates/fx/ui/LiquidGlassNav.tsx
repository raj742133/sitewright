'use client';
import { useRef, useState } from 'react';
import { useEdgeSprings, useReduced } from './_d3';

export interface LiquidGlassNavProps {
  items?: string[];
  value?: number;
  onChange?: (index: number, label: string) => void;
  /** colour of the active label (default neon mint, readable on the dark glass track) */
  accent?: string;
  label?: string;
  className?: string;
}
const DEFAULT_ITEMS = ['Home', 'Menu', 'Journal', 'Visit', 'Shop'];

export default function LiquidGlassNav({ items = DEFAULT_ITEMS, value, onChange, accent = '#5ef2c0', label = 'Section navigation', className = '' }: LiquidGlassNavProps) {
  const [inner, setInner] = useState(0);
  const active = Math.min(value ?? inner, items.length - 1);
  const [focusIdx, setFocusIdx] = useState(active);
  const reduced = useReduced();
  const pill = useRef<HTMLSpanElement>(null);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);

  useEdgeSprings(pill, () => {
    const b = btns.current[active];
    return b ? { l: b.offsetLeft, r: b.offsetLeft + b.offsetWidth } : null;
  }, active + ':' + items.length, reduced);

  const select = (i: number) => { setInner(i); setFocusIdx(i); onChange?.(i, items[i] ?? ''); };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    let n = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = items.length - 1;
    else return;
    e.preventDefault();
    setFocusIdx(n);
    btns.current[n]?.focus();
  };

  return (
    <nav className={`ui-liquid-glass-nav ${className}`.trim()} aria-label={label} style={{ ['--ui-lgn-accent' as string]: accent }}>
      <span className="ui-liquid-glass-nav-blob ui-liquid-glass-nav-blob-a" aria-hidden="true" />
      <span className="ui-liquid-glass-nav-blob ui-liquid-glass-nav-blob-b" aria-hidden="true" />
      <div className="ui-liquid-glass-nav-track">
        <span ref={pill} className="ui-liquid-glass-nav-pill" aria-hidden="true" />
        <ul className="ui-liquid-glass-nav-list">
        {items.map((it, i) => (
          <li key={it + i}>
            <button
              ref={(el) => { btns.current[i] = el; }}
              type="button"
              className={`ui-liquid-glass-nav-item ${i === active ? 'is-active' : ''}`}
              aria-current={i === active ? 'page' : undefined}
              tabIndex={i === focusIdx ? 0 : -1}
              onClick={() => select(i)}
              onKeyDown={(e) => onKey(e, i)}
              onFocus={() => setFocusIdx(i)}
            >{it}</button>
          </li>
        ))}
        </ul>
      </div>
    </nav>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 150, padding: 8 }}>
      <LiquidGlassNav items={['Home', 'Menu', 'Visit', 'Shop']} />
    </div>
  );
}
