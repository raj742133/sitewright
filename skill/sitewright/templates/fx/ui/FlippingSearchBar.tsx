'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useReduced } from './_d3';

export interface FlippingSearchBarProps {
  suggestions?: string[];
  placeholder?: string;
  label?: string;
  onSelect?: (value: string) => void;
  className?: string;
}
const DEFAULTS = ['Opening hours', 'Online booking', 'Menu and prices', 'Contact the team', 'Gift cards', 'Press and media', 'Privacy policy'];

export default function FlippingSearchBar({ suggestions = DEFAULTS, placeholder = 'Search the site', label = 'Search', onSelect, className = '' }: FlippingSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(-1);
  const reduced = useReduced();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const listId = `${id}-list`;

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? suggestions.filter((s) => s.toLowerCase().includes(t)) : suggestions).slice(0, 5);
  }, [q, suggestions]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), reduced ? 0 : 220);
    return () => clearTimeout(t);
  }, [open, reduced]);

  const close = (refocus: boolean) => {
    setOpen(false); setHi(-1);
    if (refocus) btn.current?.focus({ preventScroll: true });
  };
  const pick = (v: string) => { setQ(v); onSelect?.(v); close(true); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (matches.length ? (h + 1) % matches.length : -1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (matches.length ? (h <= 0 ? matches.length - 1 : h - 1) : -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const v = matches[hi] ?? q.trim(); if (v) pick(v); }
  };

  return (
    <div
      ref={root}
      className={`ui-flipping-search-bar ${open ? 'is-open' : ''} ${className}`.trim()}
      onBlur={(e) => { if (open && !root.current?.contains(e.relatedTarget as Node | null)) close(false); }}
    >
      <div className="ui-flipping-search-bar-flip">
        <button ref={btn} type="button" className="ui-flipping-search-bar-face ui-flipping-search-bar-front"
          aria-label={label} aria-expanded={open} aria-hidden={open || undefined} tabIndex={open ? -1 : 0}
          onClick={() => setOpen(true)}>
          <SearchIcon />
          <span>{q || label}</span>
        </button>
        <div className="ui-flipping-search-bar-face ui-flipping-search-bar-back" aria-hidden={!open || undefined}>
          <SearchIcon />
          <input ref={input} type="text" role="combobox" autoComplete="off" spellCheck={false}
            className="ui-flipping-search-bar-input" placeholder={placeholder} aria-label={label}
            aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
            aria-activedescendant={hi >= 0 ? `${id}-o${hi}` : undefined}
            tabIndex={open ? 0 : -1} value={q} onKeyDown={onKey}
            onChange={(e) => { setQ(e.target.value); setHi(-1); }} />
          <button type="button" className="ui-flipping-search-bar-close" aria-label="Close search" tabIndex={open ? 0 : -1} onClick={() => close(true)}>
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></svg>
          </button>
        </div>
      </div>
      <ul id={listId} role="listbox" aria-label="Suggestions" className="ui-flipping-search-bar-list" hidden={!open}>
        {matches.map((s, i) => (
          <li key={s} id={`${id}-o${i}`} role="option" aria-selected={i === hi} className={i === hi ? 'is-active' : ''}
            onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)} onMouseEnter={() => setHi(i)}>{s}</li>
        ))}
        {matches.length === 0 && <li role="presentation" className="ui-flipping-search-bar-empty">No matches</li>}
      </ul>
      <span className="ui-flipping-search-bar-live" role="status" aria-live="polite">{open ? `${matches.length} suggestions` : ''}</span>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="ui-flipping-search-bar-icon">
      <circle cx="8.5" cy="8.5" r="5.2" /><path d="M12.5 12.5L17 17" />
    </svg>
  );
}

export function Demo() {
  return <div style={{ padding: '14px 16px', minHeight: 150 }}><FlippingSearchBar /></div>;
}
