'use client';
import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Artwork, DEMO_ITEMS, clamp, itemKey, wrap, type GalleryItem } from './_galleries-data';
import { ArrowButton } from './_galleries-ui';
import { useIndexState, usePointerDrag } from './_galleries-hooks';

export interface DepthCarouselProps {
  /** Cards. The current one sits in front; the next few recede behind it. */
  items?: GalleryItem[];
  /** Controlled index of the front card. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** How many cards behind the front one stay visible. Default 3. */
  depth?: number;
  label?: string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

/** Position of a card whose distance from the front is `d` (0 front, 1 first behind, negative = already passed). */
function pose(d: number, depth: number) {
  if (d < 0) {
    const t = clamp(-d, 0, 1);
    return { tf: `translate3d(${-t * 62}%, 0, ${-t * 40}px) rotateY(${t * 26}deg) scale(${1 - t * 0.05})`, op: 1 - t, blur: 0, shade: t * 0.3 };
  }
  const k = Math.min(d, depth + 1);
  return { tf: `translate3d(${k * 17}%, ${k * -1.5}%, ${-k * 90}px) scale(${1 - k * 0.04})`, op: d > depth ? 0 : 1 - Math.max(0, d - depth + 1) * 0.6, blur: d * 1.1, shade: Math.min(0.55, d * 0.17) };
}

/** A deck of cards in 3D: the front card is sharp, the ones behind step back, shrink and soften. Swipe, click a card behind, use the buttons or arrow/Home/End keys. */
export default function DepthCarousel({ items = DEMO_ITEMS.slice(0, 8), index, defaultIndex = 0, onIndexChange, depth = 3, label = 'Deck', height, className, style }: DepthCarouselProps) {
  const n = items.length;
  const [raw, setIdx] = useIndexState(index, defaultIndex, onIndexChange);
  const cur = wrap(raw, n);
  const [p, setP] = useState(0);
  const [dragging, setDragging] = useState(false);
  const view = useRef<HTMLDivElement>(null);
  const go = (i: number) => setIdx(wrap(i, n));

  usePointerDrag(view, {
    axis: 'x',
    onStart: () => setDragging(true),
    onMove: (dx) => setP(clamp(-dx / ((view.current?.clientWidth ?? 300) * 0.4), -1, 1)),
    onEnd: (vx, _vy, dx) => {
      setDragging(false); setP(0);
      const proj = dx + vx * 200;
      if (Math.abs(proj) > 50) go(cur + (proj < 0 ? 1 : -1));
    },
  });

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(cur + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(cur - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(n - 1);
    else return;
    e.preventDefault();
  };

  return (
    <section className={`ui-depth-carousel-root ${className ?? ''}`} style={{ height: height ?? '100%', ...style }} aria-roledescription="carousel" aria-label={label} onKeyDown={onKey}>
      <div ref={view} className="ui-depth-carousel-view" data-drag={dragging ? '' : undefined}>
        <div className="ui-depth-carousel-stage" aria-live="polite">
          {items.map((it, i) => {
            const d = wrap(i - cur + 1, n) - 1;
            const de = d - p;
            const ps = pose(de, depth);
            const front = d === 0;
            const body = (
              <>
                <Artwork item={it} index={i} />
                <span className="ui-depth-carousel-shade" style={{ opacity: ps.shade }} aria-hidden="true" />
                <span className="ui-depth-carousel-cap"><strong>{it.title}</strong>{it.subtitle ? <span>{it.subtitle}</span> : null}</span>
              </>
            );
            return (
              <figure key={itemKey(it, i)} className="ui-depth-carousel-card" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${n}: ${it.title}`} aria-hidden={front ? undefined : true}
                data-front={front ? '' : undefined} onClick={() => { if (!front && d > 0 && d <= depth) go(i); }}
                style={{ transform: ps.tf, opacity: ps.op, filter: ps.blur > 0.05 ? `blur(${ps.blur.toFixed(2)}px)` : undefined, zIndex: de < 0 ? 100 : 100 - Math.round(de * 2), visibility: ps.op <= 0.01 && !dragging ? 'hidden' : undefined, pointerEvents: d > depth || d < 0 ? 'none' : undefined }}>
                {it.href && front ? <a className="ui-depth-carousel-link" href={it.href} draggable={false}>{body}</a> : body}
              </figure>
            );
          })}
        </div>
      </div>
      <div className="ui-depth-carousel-bar">
        <ArrowButton dir="prev" label="Previous card" className="ui-depth-carousel-btn" onClick={() => go(cur - 1)} />
        <span className="ui-depth-carousel-count" aria-hidden="true">{cur + 1} / {n}</span>
        <ArrowButton dir="next" label="Next card" className="ui-depth-carousel-btn" onClick={() => go(cur + 1)} />
      </div>
    </section>
  );
}

export function Demo() {
  return <DepthCarousel label="Featured places" />;
}
