'use client';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useControlled, useReducedMotion } from './_c2';

export interface NavTabItem { id: string; label: string; icon?: ReactNode; panel?: ReactNode }
export interface NavTabsProps {
  items?: NavTabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  variant?: 'pill' | 'underline';
  label?: string;
  compact?: boolean;
  className?: string;
}

const DEFAULT_ITEMS: NavTabItem[] = [
  { id: 'overview', label: 'Overview', panel: 'A quick summary of how the site is doing.' },
  { id: 'pages', label: 'Pages', panel: 'Every page, its status and last edit.' },
  { id: 'media', label: 'Media', panel: 'Images and files used across pages.' },
  { id: 'settings', label: 'Settings', panel: 'Domain, theme and publishing options.' },
];

interface Box { x: number; w: number }

export default function NavTabs({ items = DEFAULT_ITEMS, value, defaultValue, onChange, variant = 'pill', label = 'Sections', compact = false, className = '' }: NavTabsProps) {
  const uid = useId().replace(/:/g, '');
  const reduced = useReducedMotion();
  const [active, setActive] = useControlled<string>(value, defaultValue ?? items[0]?.id ?? '', onChange);
  const [hover, setHover] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [ready, setReady] = useState(false);
  const [fade, setFade] = useState({ l: false, r: false });
  const scroller = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const current = items.find((i) => i.id === active) ? active : items[0]?.id ?? '';
  const target = hover && hover !== current ? hover : current;

  const measure = useCallback(() => {
    const el = refs.current[target];
    if (el) setBox({ x: el.offsetLeft, w: el.offsetWidth });
  }, [target]);

  useLayoutEffect(() => { measure(); }, [measure, items]);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    const ro = typeof ResizeObserver !== 'undefined' && list.current ? new ResizeObserver(measure) : null;
    if (ro && list.current) ro.observe(list.current);
    return () => { clearTimeout(t); ro?.disconnect(); };
  }, [measure]);

  const updateFade = useCallback(() => {
    const s = scroller.current;
    if (!s) return;
    setFade({ l: s.scrollLeft > 2, r: s.scrollLeft + s.clientWidth < s.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    updateFade();
    const s = scroller.current;
    if (!s) return;
    s.addEventListener('scroll', updateFade, { passive: true });
    window.addEventListener('resize', updateFade);
    return () => { s.removeEventListener('scroll', updateFade); window.removeEventListener('resize', updateFade); };
  }, [updateFade, items]);

  useEffect(() => {
    const el = refs.current[current];
    const s = scroller.current;
    if (!el || !s) return;
    const left = el.offsetLeft - 24;
    const right = el.offsetLeft + el.offsetWidth + 24;
    if (left < s.scrollLeft) s.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
    else if (right > s.scrollLeft + s.clientWidth) s.scrollTo({ left: right - s.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
  }, [current, reduced]);

  const go = (id: string) => { refs.current[id]?.focus(); setActive(id); };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex((t) => t.id === current);
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = items.length - 1;
    if (n < 0) return;
    e.preventDefault();
    const it = items[n];
    if (it) go(it.id);
  };

  const hasPanels = items.some((i) => i.panel !== undefined);
  const animate = ready && !reduced;
  const cls = ['ui-nav-tabs', `ui-nav-tabs-${variant}`, fade.l ? 'is-fade-l' : '', fade.r ? 'is-fade-r' : '', compact ? 'is-compact' : '', className].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <div className="ui-nav-tabs-scroll" ref={scroller}>
        <div className="ui-nav-tabs-list" role="tablist" aria-label={label} ref={list} onKeyDown={onKey} onMouseLeave={() => setHover(null)}>
          {box && (
            <span
              className={`ui-nav-tabs-ind${hover && hover !== current ? ' is-preview' : ''}`}
              aria-hidden="true"
              style={{ width: box.w, transform: `translateX(${box.x}px)`, transition: animate ? undefined : 'none' }}
            />
          )}
          {items.map((it) => {
            const sel = it.id === current;
            return (
              <button
                key={it.id}
                ref={(el) => { refs.current[it.id] = el; }}
                type="button"
                role="tab"
                id={`${uid}-t-${it.id}`}
                aria-selected={sel}
                aria-controls={hasPanels ? `${uid}-p-${it.id}` : undefined}
                tabIndex={sel ? 0 : -1}
                className={`ui-nav-tabs-tab${sel ? ' is-active' : ''}${focusId === it.id ? ' is-kb' : ''}`}
                onClick={() => setActive(it.id)}
                onMouseEnter={() => setHover(it.id)}
                onFocus={(e) => setFocusId(e.currentTarget.matches(':focus-visible') ? it.id : null)}
                onBlur={() => setFocusId(null)}
              >
                {it.icon && <span className="ui-nav-tabs-icon" aria-hidden="true">{it.icon}</span>}
                <span>{it.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {hasPanels && (
        <div className="ui-nav-tabs-panels">
          {items.map((it) => (
            <div
              key={it.id}
              role="tabpanel"
              id={`${uid}-p-${it.id}`}
              aria-labelledby={`${uid}-t-${it.id}`}
              hidden={it.id !== current}
              tabIndex={0}
              className="ui-nav-tabs-panel"
            >
              {it.panel}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ width: '100%', maxWidth: 260 }}>
      <NavTabs
        compact
        label="Site sections"
        items={[
          { id: 'a', label: 'Overview', panel: 'Visits are up 12% this week.' },
          { id: 'b', label: 'Pages', panel: '14 pages, 2 drafts waiting.' },
          { id: 'c', label: 'Media', panel: '86 files, 41 MB used.' },
          { id: 'd', label: 'Setup', panel: 'Domain and theme options.' },
        ]}
      />
    </div>
  );
}
