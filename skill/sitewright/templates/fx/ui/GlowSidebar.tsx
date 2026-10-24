'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { useControlled, useFinePointer, useReducedMotion } from './_c2';

export interface GlowSidebarItem { id: string; label: string; icon: ReactNode; badge?: string | number }
export interface GlowSidebarProps {
  items?: GlowSidebarItem[];
  active?: string;
  defaultActive?: string;
  onSelect?: (id: string) => void;
  defaultCollapsed?: boolean;
  compact?: boolean;
  label?: string;
  className?: string;
}

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const ICONS = {
  home: svg(<><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /></>),
  pages: svg(<><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></>),
  media: svg(<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M21 16l-5-4-9 7" /></>),
  settings: svg(<><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>),
};
const DEFAULT_ITEMS: GlowSidebarItem[] = [
  { id: 'home', label: 'Home', icon: ICONS.home },
  { id: 'pages', label: 'Pages', icon: ICONS.pages, badge: 3 },
  { id: 'media', label: 'Media', icon: ICONS.media },
  { id: 'settings', label: 'Settings', icon: ICONS.settings },
];

export default function GlowSidebar({ items = DEFAULT_ITEMS, active, defaultActive, onSelect, defaultCollapsed = false, compact = false, label = 'Main navigation', className = '' }: GlowSidebarProps) {
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [cur, setCur] = useControlled<string>(active, defaultActive ?? items[0]?.id ?? '', onSelect);
  const [bar, setBar] = useState<{ y: number; h: number } | null>(null);
  const [ready, setReady] = useState(false);
  const root = useRef<HTMLElement>(null);
  const glow = useRef<HTMLSpanElement>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const raf = useRef(0);

  const measure = useCallback(() => {
    const el = refs.current[cur];
    const li = el?.parentElement;
    if (el && li) setBar({ y: li.offsetTop, h: el.offsetHeight });
  }, [cur]);
  useLayoutEffect(() => { measure(); }, [measure, items, compact]);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    const ro = typeof ResizeObserver !== 'undefined' && root.current ? new ResizeObserver(measure) : null;
    if (ro && root.current) ro.observe(root.current);
    return () => { clearTimeout(t); ro?.disconnect(); cancelAnimationFrame(raf.current); };
  }, [measure]);

  const move = (e: PointerEvent<HTMLElement>) => {
    if (!fine || reduced || !root.current || !glow.current) return;
    const r = root.current.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const g = glow.current;
      if (!g) return;
      g.style.setProperty('--gx', `${x}px`);
      g.style.setProperty('--gy', `${y}px`);
      g.style.opacity = '1';
    });
  };
  const leave = () => {
    cancelAnimationFrame(raf.current);
    if (glow.current) glow.current.style.opacity = '0';
  };

  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const ids = items.map((i) => i.id);
    const i = ids.indexOf(document.activeElement ? (Object.keys(refs.current).find((k) => refs.current[k] === document.activeElement) ?? '') : '');
    let n = -1;
    if (e.key === 'ArrowDown') n = (i + 1) % ids.length;
    else if (e.key === 'ArrowUp') n = (i - 1 + ids.length) % ids.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = ids.length - 1;
    if (n < 0) return;
    e.preventDefault();
    const id = ids[n];
    if (id) refs.current[id]?.focus();
  };

  const cls = ['ui-glow-sidebar', collapsed ? 'is-collapsed' : '', compact ? 'is-compact' : '', ready && !reduced ? 'is-ready' : '', className].filter(Boolean).join(' ');
  return (
    <nav ref={root} className={cls} aria-label={label} onPointerMove={move} onPointerLeave={leave}>
      <span ref={glow} className="ui-glow-sidebar-glow" aria-hidden="true" />
      <button type="button" className="ui-glow-sidebar-toggle" aria-expanded={!collapsed} aria-label="Toggle sidebar width" onClick={() => setCollapsed((c) => !c)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: collapsed ? 'none' : 'scaleX(-1)', transition: reduced ? 'none' : 'transform .3s' }}>
          <path d="M9 6l6 6-6 6" />
        </svg>
        <span className="ui-glow-sidebar-label">{collapsed ? 'Expand' : 'Collapse'}</span>
      </button>
      <ul className="ui-glow-sidebar-list" onKeyDown={onKey}>
        {bar && <span className="ui-glow-sidebar-bar" aria-hidden="true" style={{ height: bar.h, transform: `translateY(${bar.y}px)` }} />}
        {items.map((it) => {
          const sel = it.id === cur;
          return (
            <li key={it.id} className="ui-glow-sidebar-li">
              <button
                type="button"
                ref={(el) => { refs.current[it.id] = el; }}
                className={`ui-glow-sidebar-item${sel ? ' is-active' : ''}`}
                aria-current={sel ? 'page' : undefined}
                tabIndex={sel ? 0 : -1}
                onClick={() => setCur(it.id)}
              >
                <span className="ui-glow-sidebar-icon">{it.icon}</span>
                <span className="ui-glow-sidebar-label">{it.label}</span>
                {it.badge !== undefined && <span className="ui-glow-sidebar-badge">{it.badge}</span>}
              </button>
              <span className="ui-glow-sidebar-tip" aria-hidden="true">{it.label}</span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Demo() {
  const [cur, setCur] = useState('pages');
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%', maxWidth: 270 }}>
      <GlowSidebar compact active={cur} onSelect={setCur} />
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--muted, #666)', flex: 1, minWidth: 0 }}>
        Viewing <strong style={{ color: 'var(--ink, #111)', textTransform: 'capitalize' }}>{cur}</strong>. Use the arrow button to collapse the rail.
      </p>
    </div>
  );
}
