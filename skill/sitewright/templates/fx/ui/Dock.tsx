'use client';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Icon, Stage, useControlled, useCoarsePointer, useProximity, useReducedMotion, useRoving } from './_menus-kit';

export interface DockItem {
  id: string;
  label: string;
  /** Name of a built-in icon (home, search, folder, mail, music, camera, gear, user, chat, star, grid, bolt) or your own node. */
  icon?: string | ReactNode;
  onSelect?: () => void;
}
export interface DockProps {
  items?: DockItem[];
  /** Controlled active item id. */
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** Base size of an icon tile in px. Defaults to 44 (48 on touch screens, smaller in very narrow containers). */
  size?: number;
  /** Scale of the icon under the pointer (1 turns magnification off). */
  magnification?: number;
  /** How far, in px, the magnification reaches along the dock. */
  reach?: number;
  /** Accessible name of the toolbar. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const ITEMS: DockItem[] = [
  { id: 'home', label: 'Home', icon: 'home' }, { id: 'search', label: 'Search', icon: 'search' }, { id: 'files', label: 'Files', icon: 'folder' },
  { id: 'mail', label: 'Mail', icon: 'mail' }, { id: 'music', label: 'Music', icon: 'music' }, { id: 'photos', label: 'Photos', icon: 'camera' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
];

/** A magnifying dock: icons swell with a spring as the pointer (or keyboard focus) nears them, neighbours slide aside, labels appear above.
 *  One tab stop with arrow-key roving (Home/End jump), Enter/Space select. Touch screens skip magnification and get larger press targets. */
export default function Dock({ items = ITEMS, value, defaultValue, onChange, size, magnification = 1.65, reach = 130, label = 'Dock', className = '', style }: DockProps) {
  const [active, setActive] = useControlled<string>(value, defaultValue ?? '', onChange);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const rowRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const cells = useRef<(HTMLElement | null)[]>([]);
  const [bounce, setBounce] = useState('');
  useEffect(() => { if (!bounce) return; const t = setTimeout(() => setBounce(''), 520); return () => clearTimeout(t); }, [bounce]);
  const rov = useRoving(items.length, 'horizontal');
  const peak = coarse ? 1 : Math.max(1, magnification);
  const prox = useProximity(rowRef, {
    items: cells, radius: reach, peak, instant: reduced,
    frame: (g) => barRef.current?.style.setProperty('--grow', g.toFixed(1) + 'px'),
    apply: (i, s, dx) => { const c = cells.current[i]; if (c) { c.style.setProperty('--s', s.toFixed(3)); c.style.setProperty('--dx', dx.toFixed(1) + 'px'); } },
  });

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || !rowRef.current) return;
    prox.point(e.clientX - rowRef.current.getBoundingClientRect().left);
  };
  const pick = (it: DockItem) => {
    setActive(it.id);
    it.onSelect?.();
    if (!reduced) setBounce(it.id);
  };

  return (
    <div className={`ui-dock-root ${className}`} style={size ? { ['--size' as string]: size + 'px', ...style } : style} onPointerMove={onMove} onPointerLeave={() => prox.point(null)}>
      <div className="ui-dock-bar" ref={barRef} role="toolbar" aria-label={label} aria-orientation="horizontal" onKeyDown={rov.onKeyDown}>
        <span className="ui-dock-bg" aria-hidden="true" />
        <div className="ui-dock-row" ref={rowRef} >
          {items.map((it, i) => {
            const isActive = active === it.id;
            return (
              <div key={it.id} className="ui-dock-cell" ref={(el) => { cells.current[i] = el; }}>
                <span className="ui-dock-tip" aria-hidden="true">{it.label}</span>
                <button type="button" className={`ui-dock-item${isActive ? ' is-active' : ''}${bounce === it.id ? ' is-bounce' : ''}`}
                  {...rov.item(i)} aria-label={it.label} aria-current={isActive ? 'true' : undefined}
                  onFocus={(e) => { rov.item(i).onFocus(); if (e.currentTarget.matches(':focus-visible')) prox.focus(i); }}
                  onBlur={() => prox.focus(null)}
                  onClick={() => pick(it)}>
                  {typeof it.icon === 'string' || it.icon == null ? <Icon name={(it.icon as string) ?? 'star'} size={22} /> : it.icon}
                </button>
                <i className="ui-dock-dot" aria-hidden="true" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Demo() {
  const [last, setLast] = useState('Home');
  return (
    <Stage align="bottom">
      <div className="ui-dock-demo">
        <p className="ui-dock-demo-note" aria-live="polite">Opened: {last}</p>
        <Dock defaultValue="home" onChange={(id) => setLast(ITEMS.find((i) => i.id === id)?.label ?? id)} />
      </div>
    </Stage>
  );
}
