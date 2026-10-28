'use client';
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Scene } from './_cards-art';
import { useControlled } from './_cards-use';

export interface AccordionGalleryItem {
  id: string;
  title: string;
  /** Short line shown when the panel is open. */
  caption?: string;
  /** Any visual for the panel; defaults to a drawn scene. */
  art?: ReactNode;
  /** Extra content revealed under the caption when open (links, buttons). */
  children?: ReactNode;
}

export interface AccordionGalleryProps {
  items?: AccordionGalleryItem[];
  /** Open panel (controlled). */
  active?: string;
  /** Initially open panel when uncontrolled (default: the first). */
  defaultActive?: string;
  onChange?: (id: string) => void;
  /** 'auto' lays panels in a row when the container is wide and stacks them when narrow. */
  orientation?: 'auto' | 'horizontal' | 'vertical';
  /** Open a panel when the pointer rests on it (always opens on click, Enter, Space and arrow keys). */
  openOnHover?: boolean;
  /** Accessible name of the gallery. */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULTS: AccordionGalleryItem[] = [
  { id: 'dunes', title: 'Dune light', caption: 'Long shadows on a quiet afternoon.' },
  { id: 'ring', title: 'Ringed world', caption: 'A slow orbit above the haze.' },
  { id: 'peaks', title: 'High ridge', caption: 'Three summits, one cold sunrise.' },
  { id: 'tide', title: 'Low tide', caption: 'Soft swells and a pale sun.' },
  { id: 'city', title: 'Night blocks', caption: 'Windows lit across the grid.' },
];

/** A row of image panels where one is open and the rest collapse to slim strips. Click, hover or arrow keys change the open one; it stacks vertically in narrow containers. */
export default function AccordionGallery({ items = DEFAULTS, active, defaultActive, onChange, orientation = 'auto', openOnHover = true, label = 'Gallery', className, style }: AccordionGalleryProps) {
  const [cur, setCur] = useControlled<string>(active, defaultActive ?? items[0]?.id ?? '', onChange);
  const uid = useId();
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const last = useRef({ x: -99, y: -99 });
  const idx = Math.max(0, items.findIndex((i) => i.id === cur));

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = items.length;
    let to = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (i + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (i - 1 + n) % n;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = n - 1;
    if (to < 0) return;
    e.preventDefault();
    btns.current[to]?.focus();
    const it = items[to];
    if (it) setCur(it.id);
  };

  return (
    <div className={`ui-accordion-gallery-root ${className ?? ''}`} style={style} data-orientation={orientation} role="group" aria-label={label}>
      <div className="ui-accordion-gallery-row">
        {items.map((it, i) => {
          const open = i === idx;
          return (
            <div key={it.id} className="ui-accordion-gallery-panel" data-open={open ? 'true' : 'false'} onPointerMove={(e) => { const m = Math.hypot(e.clientX - last.current.x, e.clientY - last.current.y) > 2; last.current = { x: e.clientX, y: e.clientY }; if (m && openOnHover && e.pointerType === 'mouse' && !open) setCur(it.id); }}>
              <div className="ui-accordion-gallery-art" aria-hidden={it.art ? undefined : true}>{it.art ?? <Scene index={i} />}</div>
              <div className="ui-accordion-gallery-shade" aria-hidden="true" />
              <button type="button" ref={(el) => { btns.current[i] = el; }} className="ui-accordion-gallery-trigger" aria-expanded={open} aria-controls={`${uid}-${i}`}
                onClick={() => setCur(it.id)} onKeyDown={(e) => onKey(e, i)}>
                <span className="ui-accordion-gallery-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <span className="ui-accordion-gallery-title">{it.title}</span>
              </button>
              <div id={`${uid}-${i}`} className="ui-accordion-gallery-body" role="region" aria-label={it.title} aria-hidden={open ? undefined : true}>
                {it.caption ? <p>{it.caption}</p> : null}
                {open ? it.children : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-accordion-gallery-demo">
      <AccordionGallery items={DEFAULTS.slice(0, 4)} />
    </div>
  );
}
