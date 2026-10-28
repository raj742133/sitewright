'use client';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { Stage, useControlled, useReducedMotion } from './_menus-kit';

export interface GooeyNavItem { id: string; label: string; href?: string }
export interface GooeyNavProps {
  items?: GooeyNavItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** Number of droplets thrown off when a link is chosen (0 disables them). */
  droplets?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}
const ITEMS: GooeyNavItem[] = [{ id: 'home', label: 'Home' }, { id: 'about', label: 'About' }, { id: 'work', label: 'Work' }, { id: 'notes', label: 'Notes' }, { id: 'contact', label: 'Contact' }];
interface Drop { key: number; x: number; a: number; d: number; s: number }

/** A navigation bar whose active marker is a liquid blob. Two blobs chase each other through an SVG "goo" filter so it stretches and pinches as it moves,
 *  and droplets spray off on selection. Only the marker layer is filtered, so the text stays crisp. Plain links with aria-current; reduced motion snaps and drops the droplets. */
export default function GooeyNav({ items = ITEMS, value, defaultValue, onChange, droplets = 7, label = 'Primary', className = '', style }: GooeyNavProps) {
  const [active, setActive] = useControlled<string>(value, defaultValue ?? items[0]?.id ?? '', onChange);
  const reduced = useReducedMotion();
  const fid = 'g' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const refs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const list = useRef<HTMLUListElement>(null);
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const seq = useRef(0);

  const measure = useCallback(() => {
    const el = refs.current[active];
    if (el) setBox({ x: el.offsetLeft, w: el.offsetWidth });
  }, [active]);
  useLayoutEffect(() => { measure(); }, [measure, items]);
  useEffect(() => {
    const ro = typeof ResizeObserver !== 'undefined' && list.current ? new ResizeObserver(measure) : null;
    if (ro && list.current) ro.observe(list.current);
    return () => ro?.disconnect();
  }, [measure]);
  useEffect(() => {
    if (!drops.length) return;
    const t = setTimeout(() => setDrops([]), 800);
    return () => clearTimeout(t);
  }, [drops]);

  const pick = (it: GooeyNavItem, e: MouseEvent) => {
    if (!it.href || it.href === '#') e.preventDefault();
    if (it.id === active) return;
    const el = refs.current[it.id];
    if (!reduced && droplets > 0 && el) {
      const base = el.offsetLeft + el.offsetWidth / 2;
      setDrops(Array.from({ length: droplets }, (_, i) => ({ key: ++seq.current, x: base, a: -150 + (i / Math.max(1, droplets - 1)) * 120 + (i % 2 ? 6 : -6), d: 26 + (i * 13) % 22, s: 0.55 + ((i * 37) % 10) / 20 })));
    }
    setActive(it.id);
  };

  return (
    <div className={`ui-gooey-nav-root${box ? ' is-ready' : ''} ${className}`} style={style}>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <defs>
          <filter id={fid} x="-20%" y="-60%" width="140%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
            <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" />
          </filter>
        </defs>
      </svg>
      <nav className="ui-gooey-nav-bar" aria-label={label}>
        <div className="ui-gooey-nav-goo" aria-hidden="true" style={{ filter: `url(#${fid})` }}>
          {box ? (
            <>
              <i className={`ui-gooey-nav-blob a${reduced ? ' is-instant' : ''}`} style={{ transform: `translateX(${box.x}px)`, width: box.w }} />
              <i className={`ui-gooey-nav-blob b${reduced ? ' is-instant' : ''}`} style={{ transform: `translateX(${box.x + 4}px)`, width: box.w - 8 }} />
              {drops.map((d) => (
                <i key={d.key} className="ui-gooey-nav-drop" style={{ left: d.x, ['--a' as string]: d.a + 'deg', ['--d' as string]: d.d + 'px', ['--sc' as string]: d.s }} />
              ))}
            </>
          ) : null}
        </div>
        <ul className="ui-gooey-nav-list" ref={list}>
          {items.map((it) => (
            <li key={it.id}>
              <a ref={(el) => { refs.current[it.id] = el; }} className={`ui-gooey-nav-link${active === it.id ? ' is-active' : ''}`} href={it.href ?? '#'} aria-current={active === it.id ? 'page' : undefined} onClick={(e) => pick(it, e)}>{it.label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function Demo() {
  return <Stage><GooeyNav /></Stage>;
}
