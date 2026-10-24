'use client';
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

export interface RadialTarget { id: string; label: string; icon?: ReactNode }
export interface RadialShareProps {
  targets?: RadialTarget[];
  label?: string;
  /** Distance of the targets from the button centre, px. */
  radius?: number;
  onSelect?: (id: string) => void;
}

const svg = (d: string) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={d} /></svg>
);
export const DEFAULT_TARGETS: RadialTarget[] = [
  { id: 'link', label: 'Copy link', icon: svg('M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1') },
  { id: 'mail', label: 'Email', icon: svg('M4 6h16v12H4zM4 7l8 6 8-6') },
  { id: 'chat', label: 'Send in chat', icon: svg('M5 5h14v10H10l-4 4v-4H5z') },
  { id: 'download', label: 'Download', icon: svg('M12 4v11M7.5 11 12 15.5 16.5 11M5 19h14') },
  { id: 'more', label: 'More options', icon: svg('M6 12h.01M12 12h.01M18 12h.01') },
];

/** Share button that fans a radial menu of targets around itself: staggered springs, arrow-key roving focus, Escape closes. */
export default function RadialShare({ targets = DEFAULT_TARGETS, label = 'Share', radius = 68, onSelect }: RadialShareProps) {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(0);
  const [said, setSaid] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const n = targets.length;

  const close = (refocus: boolean) => { setOpen(false); if (refocus) trigger.current?.focus(); };
  const openAt = (i: number) => { setCur(i); setOpen(true); };

  useEffect(() => { if (open) items.current[cur]?.focus(); }, [open, cur]);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', down);
    return () => document.removeEventListener('pointerdown', down);
  }, [open]);

  const key = (e: KeyboardEvent) => {
    const k = e.key;
    if (k === 'Escape') { e.preventDefault(); close(true); return; }
    if (k === 'Tab') { setOpen(false); return; }
    const step = k === 'ArrowRight' || k === 'ArrowUp' ? 1 : k === 'ArrowLeft' || k === 'ArrowDown' ? -1 : 0;
    if (step) { e.preventDefault(); setCur((c) => (c + step + n) % n); }
    else if (k === 'Home') { e.preventDefault(); setCur(0); }
    else if (k === 'End') { e.preventDefault(); setCur(n - 1); }
  };
  const pick = (t: RadialTarget) => { onSelect?.(t.id); setSaid(`${t.label} chosen`); close(true); };
  const active = targets[cur];

  return (
    <div ref={root} className="ui-radial-share" data-open={open} style={{ '--ui-radial-share-r': `${radius}px`, '--ui-radial-share-h': `${radius + 70}px` } as CSSProperties}>
      <button
        ref={trigger}
        type="button"
        className="ui-radial-share-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? close(false) : openAt(0))}
        onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); openAt(0); } else if (e.key === 'ArrowLeft') { e.preventDefault(); openAt(n - 1); } }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 11 15.5 7M8.5 13l7 4" /><circle cx="6.5" cy="12" r="2.5" /><circle cx="17.5" cy="6" r="2.5" /><circle cx="17.5" cy="18" r="2.5" /></svg>
        {label}
      </button>
      <div id={menuId} role="menu" aria-label={`${label} to`} className="ui-radial-share-menu" onKeyDown={key}>
        {targets.map((t, i) => {
          const a = ((n === 1 ? 90 : 165 - (i / (n - 1)) * 150) * Math.PI) / 180; // fan spans 150 degrees, centred above the button
          const st = { '--x': `${(Math.cos(a) * radius).toFixed(1)}px`, '--y': `${(-(Math.sin(a) * radius + 26)).toFixed(1)}px`, '--i': i } as CSSProperties;
          return (
            <button
              key={t.id}
              ref={(el) => { items.current[i] = el; }}
              type="button"
              role="menuitem"
              className="ui-radial-share-item"
              style={st}
              tabIndex={open && i === cur ? 0 : -1}
              aria-label={t.label}
              onClick={() => pick(t)}
              onPointerEnter={() => open && setCur(i)}
            >
              {t.icon}
            </button>
          );
        })}
      </div>
      <span className="ui-radial-share-sr" role="status" aria-live="polite">{said}</span>
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
      <RadialShare />
    </div>
  );
}
