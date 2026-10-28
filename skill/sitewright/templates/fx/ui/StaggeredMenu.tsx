'use client';
import { useCallback, useEffect, useId, useRef, type CSSProperties, type MouseEvent } from 'react';
import { Stage, useControlled, useDismiss } from './_menus-kit';

export interface StaggeredItem { label: string; href?: string; onSelect?: () => void }
export interface StaggeredMenuProps {
  items?: StaggeredItem[];
  /** Small links at the bottom of the panel. */
  socials?: StaggeredItem[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: 'right' | 'left';
  /** Cover the whole viewport (position: fixed). Off by default: the panel stays inside its container. */
  fullscreen?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}
const ITEMS: StaggeredItem[] = [{ label: 'Home', href: '#home' }, { label: 'Projects', href: '#projects' }, { label: 'Studio', href: '#studio' }, { label: 'Journal', href: '#journal' }, { label: 'Contact', href: '#contact' }];
const SOCIALS: StaggeredItem[] = [{ label: 'Newsletter', href: '#news' }, { label: 'Showreel', href: '#reel' }, { label: 'Press', href: '#press' }];

/** A slide-in menu: two colour layers sweep in first, then the panel, then each link rises into place with a stagger.
 *  The toggle shows Menu/Close with aria-expanded; the closed panel is inert, Escape closes and returns focus, focus moves to the first link on open.
 *  Contained in its parent (which should be position: relative) unless `fullscreen` is set. */
export default function StaggeredMenu({ items = ITEMS, socials = SOCIALS, open, defaultOpen = false, onOpenChange, side = 'right', fullscreen = false, label = 'Main menu', className = '', style }: StaggeredMenuProps) {
  const [isOpen, setOpen] = useControlled<boolean>(open, defaultOpen, onOpenChange);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLAnchorElement>(null);
  const was = useRef(isOpen);
  const close = useCallback((ret: boolean) => { setOpen(false); if (ret) btn.current?.focus(); }, [setOpen]);
  useDismiss(isOpen, close, root);
  useEffect(() => {
    if (isOpen && !was.current) { const t = setTimeout(() => first.current?.focus({ preventScroll: true }), 380); was.current = true; return () => clearTimeout(t); }
    was.current = isOpen;
  }, [isOpen]);
  const go = (it: StaggeredItem) => (e: MouseEvent) => { if (!it.href || it.href === '#') e.preventDefault(); it.onSelect?.(); close(true); };
  return (
    <div ref={root} className={`ui-staggered-menu-root is-${side}${fullscreen ? ' is-fixed' : ''}${isOpen ? ' is-open' : ''} ${className}`} style={style}>
      <div className="ui-staggered-menu-scrim" aria-hidden="true" onClick={() => close(false)} />
      <button ref={btn} type="button" className="ui-staggered-menu-toggle" aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(!isOpen)}>
        <span className="ui-staggered-menu-word" aria-hidden="true"><span>Menu</span><span>Close</span></span>
        <span className="ui-staggered-menu-sr">{isOpen ? 'Close menu' : 'Open menu'}</span>
        <span className="ui-staggered-menu-plus" aria-hidden="true" />
      </button>
      <i className="ui-staggered-menu-layer l1" aria-hidden="true" />
      <i className="ui-staggered-menu-layer l2" aria-hidden="true" />
      <aside id={id} className="ui-staggered-menu-panel" aria-label={label} {...(!isOpen ? { inert: true } : {})}>
        <nav aria-label={label}>
          <ol className="ui-staggered-menu-list">
            {items.map((it, i) => (
              <li key={it.label} className="ui-staggered-menu-li" style={{ ['--i' as string]: i }}>
                <a ref={i === 0 ? first : undefined} className="ui-staggered-menu-link" href={it.href ?? '#'} onClick={go(it)} data-n={String(i + 1).padStart(2, '0')}><span>{it.label}</span></a>
              </li>
            ))}
          </ol>
        </nav>
        {socials.length ? (
          <div className="ui-staggered-menu-socials" style={{ ['--i' as string]: items.length }}>
            <h2 className="ui-staggered-menu-h">Follow</h2>
            <ul>{socials.map((s) => <li key={s.label}><a className="ui-staggered-menu-soc" href={s.href ?? '#'} onClick={go(s)}>{s.label}</a></li>)}</ul>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

export function Demo() {
  return <Stage align="stretch"><StaggeredMenu /></Stage>;
}
