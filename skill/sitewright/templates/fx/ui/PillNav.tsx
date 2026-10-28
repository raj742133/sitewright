'use client';
import { useCallback, useId, useRef, type CSSProperties } from 'react';
import { Icon, Stage, useControlled, useDismiss } from './_menus-kit';

export interface PillNavItem { id: string; label: string; href?: string }
export interface PillNavProps {
  items?: PillNavItem[];
  /** Controlled active id. */
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** Short brand text shown in the round mark at the left. */
  brand?: string;
  /** Accessible name of the navigation. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}
const ITEMS: PillNavItem[] = [{ id: 'home', label: 'Home' }, { id: 'work', label: 'Work' }, { id: 'services', label: 'Services' }, { id: 'about', label: 'About' }, { id: 'contact', label: 'Contact' }];

/** A rounded pill navigation bar. Hovering or focusing a link floods it with a circle that grows from below; the current page carries aria-current.
 *  Below ~520px of its own width the links fold into a menu button with a dropdown inside the component (aria-expanded, Escape, focus return). */
export default function PillNav({ items = ITEMS, value, defaultValue, onChange, brand = 'S', label = 'Primary', className = '', style }: PillNavProps) {
  const [active, setActive] = useControlled<string>(value, defaultValue ?? items[0]?.id ?? '', onChange);
  const [open, setOpen] = useControlled<boolean>(undefined, false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const close = useCallback((ret: boolean) => { setOpen(false); if (ret) btn.current?.focus(); }, [setOpen]);
  useDismiss(open, close, root);
  const link = (it: PillNavItem, inMenu: boolean) => (
    <a key={it.id} className={`ui-pill-nav-link${active === it.id ? ' is-active' : ''}`} href={it.href ?? '#'} aria-current={active === it.id ? 'page' : undefined}
      onClick={(e) => { if (!it.href || it.href === '#') e.preventDefault(); setActive(it.id); if (inMenu) close(true); }}>
      <span className="ui-pill-nav-fill" aria-hidden="true" />
      <span className="ui-pill-nav-text">{it.label}</span>
    </a>
  );
  return (
    <div ref={root} className={`ui-pill-nav-root ${open ? 'is-open' : ''} ${className}`} style={style}>
      <nav className="ui-pill-nav-bar" aria-label={label}>
        <a className="ui-pill-nav-mark" href="#" aria-label={`${brand} home`} onClick={(e) => e.preventDefault()}>{brand}</a>
        <ul className="ui-pill-nav-list">{items.map((it) => <li key={it.id}>{link(it, false)}</li>)}</ul>
        <button ref={btn} type="button" className="ui-pill-nav-burger" aria-expanded={open} aria-controls={id} aria-label="Menu" onClick={() => setOpen(!open)}>
          <Icon name={open ? 'check' : 'grid'} size={20} />
          <span>{open ? 'Close' : 'Menu'}</span>
        </button>
        <ul className="ui-pill-nav-drop" id={id} {...(!open ? { inert: true } : {})}>{items.map((it) => <li key={it.id}>{link(it, true)}</li>)}</ul>
      </nav>
    </div>
  );
}

export function Demo() {
  return <Stage align="top"><PillNav /></Stage>;
}
