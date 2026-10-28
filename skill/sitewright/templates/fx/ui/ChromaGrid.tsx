'use client';
import { useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent, type ReactNode } from 'react';
import { initials } from './_cards-art';

export interface ChromaGridItem {
  id: string;
  title: string;
  subtitle?: string;
  /** Small mono line, e.g. a handle or location. */
  meta?: string;
  /** Makes the card a link. */
  href?: string;
  /** Any CSS colour; default alternates between the theme primary and signal colours. */
  color?: string;
  /** Replaces the generated avatar. */
  art?: ReactNode;
}

export interface ChromaGridProps {
  items?: ChromaGridItem[];
  /** Minimum card width in px; the grid fits as many columns as the container allows. */
  minWidth?: number;
  /** Radius of the colour spotlight in px. */
  spotlight?: number;
  onSelect?: (id: string) => void;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULTS: ChromaGridItem[] = [
  { id: 'ines', title: 'Ines Duarte', subtitle: 'Design lead', meta: '@ines' },
  { id: 'kofi', title: 'Kofi Mensah', subtitle: 'Frontend', meta: '@kofi' },
  { id: 'lena', title: 'Lena Voss', subtitle: 'Research', meta: '@lena' },
  { id: 'tao', title: 'Tao Nguyen', subtitle: 'Motion', meta: '@tao' },
  { id: 'rhea', title: 'Rhea Patel', subtitle: 'Product', meta: '@rhea' },
  { id: 'sven', title: 'Sven Holm', subtitle: 'Platform', meta: '@sven' },
];

/** A grid of cards, each with its own tint. While the pointer (or keyboard focus) is inside the grid everything outside a soft spotlight fades to grey, so colour follows attention. Cards are links or buttons. */
export default function ChromaGrid({ items = DEFAULTS, minWidth = 150, spotlight = 190, onSelect, label = 'Team', className, style }: ChromaGridProps) {
  const root = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const aim = (x: number, y: number) => { const l = lens.current; if (!l) return; l.style.setProperty('--cg-x', x.toFixed(0) + 'px'); l.style.setProperty('--cg-y', y.toFixed(0) + 'px'); };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = root.current?.getBoundingClientRect();
    if (!r) return;
    aim(e.clientX - r.left, e.clientY - r.top);
    setOn(true);
  };
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const r = root.current?.getBoundingClientRect();
    const t = (e.target as HTMLElement).closest('[data-card]')?.getBoundingClientRect();
    if (!r || !t) return;
    aim(t.left - r.left + t.width / 2, t.top - r.top + t.height / 2);
    setOn(true);
  };
  return (
    <div ref={root} className={`ui-chroma-grid-root ${className ?? ''}`} data-on={on ? 'true' : 'false'} role="list" aria-label={label}
      style={{ '--cg-min': minWidth + 'px', '--cg-r': spotlight + 'px', ...style } as CSSProperties}
      onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setOn(false)} onFocus={onFocus} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOn(false); }}>
      {items.map((it, i) => {
        const tint = it.color ?? `color-mix(in srgb, var(--primary, #2563eb) ${100 - ((i * 37) % 101)}%, var(--signal, #f59e0b))`;
        const inner = (
          <>
            <span className="ui-chroma-grid-ava" aria-hidden="true">{it.art ?? <span>{initials(it.title)}</span>}</span>
            <span className="ui-chroma-grid-txt"><strong>{it.title}</strong>{it.subtitle ? <span>{it.subtitle}</span> : null}{it.meta ? <em>{it.meta}</em> : null}</span>
          </>
        );
        const common = { className: 'ui-chroma-grid-card', 'data-card': '' } as const;
        return (
          <div role="listitem" key={it.id} className="ui-chroma-grid-cell" style={{ '--c': tint } as CSSProperties}>
            {it.href ? <a {...common} href={it.href}>{inner}</a> : <button type="button" {...common} onClick={() => onSelect?.(it.id)}>{inner}</button>}
          </div>
        );
      })}
      <div ref={lens} className="ui-chroma-grid-lens" aria-hidden="true" />
    </div>
  );
}

export function Demo() {
  return <div className="ui-chroma-grid-demo"><ChromaGrid items={DEFAULTS} /></div>;
}
