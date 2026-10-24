'use client';
import { useRef, useState } from 'react';
import { useEdgeSprings, useReduced } from './_d3';

export interface UnderlineNavItem { label: string; href?: string }
export interface UnderlineNavProps {
  items?: UnderlineNavItem[];
  value?: number;
  onChange?: (index: number) => void;
  label?: string;
  className?: string;
}
const DEFAULT_ITEMS: UnderlineNavItem[] = [{ label: 'Overview' }, { label: 'Pages' }, { label: 'Media' }, { label: 'Settings' }];

export default function UnderlineNav({ items = DEFAULT_ITEMS, value, onChange, label = 'Section', className = '' }: UnderlineNavProps) {
  const [inner, setInner] = useState(0);
  const active = Math.min(value ?? inner, items.length - 1);
  const [hot, setHot] = useState<number | null>(null);
  const reduced = useReduced();
  const bar = useRef<HTMLSpanElement>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const target = hot ?? active;

  useEdgeSprings(bar, () => {
    const a = links.current[target];
    return a ? { l: a.offsetLeft + 4, r: a.offsetLeft + a.offsetWidth - 4 } : null;
  }, target + ':' + items.length, reduced);

  return (
    <nav className={`ui-underline-nav ${className}`.trim()} aria-label={label} onMouseLeave={() => setHot(null)}>
      <div className="ui-underline-nav-wrap">
      <ul className="ui-underline-nav-list">
        {items.map((it, i) => (
          <li key={it.label + i}>
            <a
              ref={(el) => { links.current[i] = el; }}
              href={it.href ?? '#'}
              className={`ui-underline-nav-link ${i === active ? 'is-active' : ''}`}
              aria-current={i === active ? 'page' : undefined}
              onMouseEnter={() => setHot(i)}
              onFocus={() => setHot(i)}
              onBlur={() => setHot(null)}
              onClick={(e) => {
                if (!it.href || it.href.startsWith('#')) e.preventDefault();
                setInner(i); onChange?.(i);
              }}
            >{it.label}</a>
          </li>
        ))}
      </ul>
      <span ref={bar} className="ui-underline-nav-bar" aria-hidden="true" />
      </div>
    </nav>
  );
}

export function Demo() {
  return <div style={{ display: 'grid', placeItems: 'center', minHeight: 150, padding: '0 4px' }}><UnderlineNav items={[{ label: 'Overview' }, { label: 'Pages' }, { label: 'Media' }, { label: 'Setup' }]} /></div>;
}
