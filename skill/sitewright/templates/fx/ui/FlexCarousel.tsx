'use client';
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { Artwork, DEMO_ITEMS, itemKey, wrap, type GalleryItem } from './_galleries-data';
import { ArrowButton } from './_galleries-ui';
import { useIndexState, usePointerDrag } from './_galleries-hooks';

export interface FlexCarouselProps {
  /** Panels (3 to 8 work best). */
  items?: GalleryItem[];
  /** Controlled index of the open panel. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Open a panel when a mouse pointer rests on it (touch and keyboard always need a press). Default true. */
  openOnHover?: boolean;
  label?: string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

/** A row of picture panels in which one is open (wide, captioned) and the rest are slim strips; they swap with flex-grow. Stacks vertically in narrow containers. */
export default function FlexCarousel({ items = DEMO_ITEMS.slice(0, 6), index, defaultIndex = 0, onIndexChange, openOnHover = true, label = 'Gallery', height, className, style }: FlexCarouselProps) {
  const n = items.length;
  const [raw, setIdx] = useIndexState(index, defaultIndex, onIndexChange);
  const cur = wrap(raw, n);
  const list = useRef<HTMLDivElement>(null);
  const hits = useRef<(HTMLButtonElement | null)[]>([]);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const go = (i: number, focus = false) => {
    const t = wrap(i, n);
    setIdx(t);
    if (focus) hits.current[t]?.focus();
  };
  usePointerDrag(list, { axis: 'x', onMove: () => {}, onEnd: (_vx, _vy, dx) => { if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1)); } });

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    const focus = (e.target as Element).closest('.ui-flex-carousel-hit') !== null;
    if (k === 'ArrowRight' || k === 'ArrowDown') go(cur + 1, focus);
    else if (k === 'ArrowLeft' || k === 'ArrowUp') go(cur - 1, focus);
    else if (k === 'Home') go(0, focus);
    else if (k === 'End') go(n - 1, focus);
    else return;
    e.preventDefault();
  };

  return (
    <section className={`ui-flex-carousel-root ${className ?? ''}`} style={{ height: height ?? '100%', ...style }} aria-roledescription="carousel" aria-label={label} onKeyDown={onKey}>
      <div ref={list} className="ui-flex-carousel-list">
        {items.map((it, i) => {
          const on = i === cur;
          return (
            <div key={itemKey(it, i)} className="ui-flex-carousel-panel" data-on={on ? '' : undefined} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${n}`}
              onPointerEnter={(e) => { if (openOnHover && e.pointerType === 'mouse' && i !== cur) { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setIdx(i), 110); } }}
              onPointerLeave={() => window.clearTimeout(timer.current)}>
              <Artwork item={it} index={i} />
              <span className="ui-flex-carousel-strip" aria-hidden="true">{it.title}</span>
              <div className="ui-flex-carousel-cap"><strong>{it.title}</strong>{it.subtitle ? <span>{it.subtitle}</span> : null}</div>
              {it.href && on ? <a className="ui-flex-carousel-go" href={it.href} data-nodrag="">Open {it.title}</a> : null}
              <button ref={(el) => { hits.current[i] = el; }} type="button" className="ui-flex-carousel-hit" tabIndex={on ? 0 : -1} aria-label={`${it.title}${it.subtitle ? ', ' + it.subtitle : ''}`} aria-current={on ? 'true' : undefined} onClick={() => setIdx(i)} />
            </div>
          );
        })}
      </div>
      <div className="ui-flex-carousel-bar">
        <ArrowButton dir="prev" label="Previous panel" className="ui-flex-carousel-btn" onClick={() => go(cur - 1)} />
        <span className="ui-flex-carousel-count" aria-hidden="true">{cur + 1} / {n}</span>
        <ArrowButton dir="next" label="Next panel" className="ui-flex-carousel-btn" onClick={() => go(cur + 1)} />
      </div>
    </section>
  );
}

export function Demo() {
  return <FlexCarousel label="Places to go" />;
}
