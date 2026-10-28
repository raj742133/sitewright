'use client';
import { useCallback, useId, useRef, type CSSProperties } from 'react';
import { Stage, useControlled, useDismiss } from './_menus-kit';

export interface BubbleItem { label: string; href?: string; onSelect?: () => void }
export interface BubbleMenuProps {
  items?: BubbleItem[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Which corner of the container the round button sits in. */
  corner?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Accessible name of the navigation landmark and the button. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}
const ITEMS: BubbleItem[] = [{ label: 'Home', href: '#home' }, { label: 'Work', href: '#work' }, { label: 'Journal', href: '#journal' }, { label: 'About', href: '#about' }, { label: 'Contact', href: '#contact' }];

/** A round button that pops a fan of tinted pill "bubbles" with a springy stagger. The bubbles live inside the component's own box (never full-screen).
 *  Button has aria-expanded; Escape closes and returns focus; a press outside closes; Tab leaving the bubbles closes them. */
export default function BubbleMenu({ items = ITEMS, open, defaultOpen = false, onOpenChange, corner = 'top-right', label = 'Menu', className = '', style }: BubbleMenuProps) {
  const [isOpen, setOpen] = useControlled<boolean>(open, defaultOpen, onOpenChange);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const close = useCallback((ret: boolean) => { setOpen(false); if (ret) btn.current?.focus(); }, [setOpen]);
  useDismiss(isOpen, close, root);
  const up = corner.startsWith('bottom');
  const n = items.length;
  return (
    <div ref={root} className={`ui-bubble-menu-root is-${corner} ${isOpen ? 'is-open' : ''} ${className}`} style={style}
      onBlur={(e) => { if (isOpen && !root.current?.contains(e.relatedTarget as Node | null) && e.relatedTarget) setOpen(false); }}>
      <button ref={btn} type="button" className="ui-bubble-menu-btn" aria-expanded={isOpen} aria-controls={id} aria-label={label} onClick={() => setOpen(!isOpen)}>
        <span className="ui-bubble-menu-bars" aria-hidden="true"><i /><i /></span>
      </button>
      <nav id={id} aria-label={label} className="ui-bubble-menu-nav">
        <ul className="ui-bubble-menu-list">
          {items.map((it, k) => {
            const order = up ? n - 1 - k : k;
            return (
              <li key={it.label} className="ui-bubble-menu-li" style={{ ['--i' as string]: order, ['--t' as string]: k % 2 ? 'var(--signal, #f59e0b)' : 'var(--primary, #2563eb)', ['--sway' as string]: (k % 2 ? 1 : -1) * (6 + (k % 3) * 3) + 'px' }}>
                <a className="ui-bubble-menu-link" href={it.href ?? '#'} tabIndex={isOpen ? 0 : -1} onClick={(e) => { if (!it.href || it.href === '#') e.preventDefault(); it.onSelect?.(); close(true); }}>{it.label}</a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function Demo() {
  return <Stage align="stretch"><BubbleMenu /></Stage>;
}
