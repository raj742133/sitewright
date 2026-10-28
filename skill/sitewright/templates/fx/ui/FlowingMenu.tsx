'use client';
import { useRef, useState, type CSSProperties, type FocusEvent, type MouseEvent, type PointerEvent } from 'react';
import { Stage, useReducedMotion } from './_menus-kit';

export interface FlowingItem { label: string; href?: string; /** Short phrase repeated in the ribbon that slides in. Defaults to the label. */ tag?: string; onSelect?: () => void }
export interface FlowingMenuProps {
  items?: FlowingItem[];
  label?: string;
  className?: string;
  style?: CSSProperties;
}
const ITEMS: FlowingItem[] = [
  { label: 'Projects', href: '#projects', tag: 'Selected work' }, { label: 'Process', href: '#process', tag: 'How we build' },
  { label: 'Studio', href: '#studio', tag: 'Meet the team' }, { label: 'Contact', href: '#contact', tag: 'Say hello' },
];

type Dir = 'top' | 'bottom';

/** A stack of large rows. Hovering a row slides a ribbon of scrolling text in from whichever edge the pointer crossed (top or bottom), and back out the same way.
 *  Keyboard focus reveals the ribbon from the top; the ribbon is decorative (aria-hidden) so the link name stays the plain label.
 *  Rows are at least 44px tall, fill their container, and the marquee stops under reduced motion. */
export default function FlowingMenu({ items = ITEMS, label = 'Sections', className = '', style }: FlowingMenuProps) {
  const reduced = useReducedMotion();
  const [state, setState] = useState<Record<number, { on: boolean; dir: Dir }>>({});
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const set = (i: number, on: boolean, dir: Dir) => setState((s) => ({ ...s, [i]: { on, dir } }));
  const edge = (i: number, e: PointerEvent): Dir => {
    const r = rows.current[i]?.getBoundingClientRect();
    return r && e.clientY < r.top + r.height / 2 ? 'top' : 'bottom';
  };
  const click = (it: FlowingItem) => (e: MouseEvent) => { if (!it.href || it.href === '#') e.preventDefault(); it.onSelect?.(); };
  const focus = (i: number, on: boolean) => (e: FocusEvent) => { if (on && !e.currentTarget.matches(':focus-visible')) return; set(i, on, 'top'); };
  return (
    <nav className={`ui-flowing-menu-root ${className}`} aria-label={label} style={style}>
      <ul className="ui-flowing-menu-list">
        {items.map((it, i) => {
          const st = state[i];
          const phrase = it.tag ?? it.label;
          return (
            <li key={it.label} ref={(el) => { rows.current[i] = el; }} className={`ui-flowing-menu-row${st?.on ? ' is-on' : ''} from-${st?.dir ?? 'top'}${reduced ? ' is-still' : ''}`}
              onPointerEnter={(e) => { if (e.pointerType !== 'touch') set(i, true, edge(i, e)); }} onPointerLeave={(e) => { if (e.pointerType !== 'touch') set(i, false, edge(i, e)); }}>
              <a className="ui-flowing-menu-link" href={it.href ?? '#'} onClick={click(it)} onFocus={focus(i, true)} onBlur={focus(i, false)}
                onPointerDown={(e) => { if (e.pointerType === 'touch') set(i, true, edge(i, e)); }}>
                <span className="ui-flowing-menu-label">{it.label}</span>
                <span className="ui-flowing-menu-ribbon" aria-hidden="true">
                  <span className="ui-flowing-menu-track">
                    {Array.from({ length: 12 }, (_, k) => (
                      <span key={k} className="ui-flowing-menu-chunk"><span>{phrase}</span><i className={`ui-flowing-menu-chip c${k % 3}`} /></span>
                    ))}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Demo() {
  return <Stage align="stretch"><FlowingMenu /></Stage>;
}
