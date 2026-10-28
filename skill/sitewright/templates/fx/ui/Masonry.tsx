'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Artwork, DEMO_ITEMS, clamp, itemKey, type GalleryItem } from './_galleries-data';
import { useIsoLayoutEffect, useSize } from './_galleries-hooks';

export interface MasonryProps {
  items?: GalleryItem[];
  /** Fixed number of columns. By default as many as fit `minColumnWidth`. */
  columns?: number;
  /** Narrowest a column may get, in px, when `columns` is not set. Default 150. */
  minColumnWidth?: number;
  /** Space between tiles in px. Default 12. */
  gap?: number;
  /** Called when a tile is activated (tiles become buttons). Tiles with `href` are links. */
  onSelect?: (item: GalleryItem, index: number) => void;
  /** Index of a highlighted tile (e.g. the selected one). */
  selected?: number;
  /** Fade tiles in as they scroll into view. Default true. */
  reveal?: boolean;
  label?: string;
  /** Height of the scrolling frame; by default fills the parent. */
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

/** A masonry layout: tiles of different heights packed into columns, each placed in the currently shortest column, so reading order stays roughly left to right. The frame scrolls on its own. */
export default function Masonry({ items = DEMO_ITEMS, columns, minColumnWidth = 150, gap = 12, onSelect, selected, reveal = true, label = 'Gallery', height, className, style }: MasonryProps) {
  const root = useRef<HTMLDivElement>(null);
  const { w } = useSize(root);
  const cols = columns ?? (w === 0 ? 3 : clamp(Math.floor((w - 24 + gap) / (minColumnWidth + gap)) || 1, 1, 8));
  const [armed, setArmed] = useState(false);

  const lanes = useMemo(() => {
    const heights = Array.from({ length: cols }, () => 0);
    const out: { it: GalleryItem; i: number; ratio: number }[][] = Array.from({ length: cols }, () => []);
    items.forEach((it, i) => {
      let c = 0;
      for (let k = 1; k < cols; k++) if (heights[k]! < heights[c]! - 0.001) c = k;
      const ratio = it.ratio ?? 1;
      out[c]!.push({ it, i, ratio });
      heights[c]! += ratio + 0.2;
    });
    return out;
  }, [items, cols]);

  useIsoLayoutEffect(() => { if (reveal) setArmed(true); }, [reveal]);
  useEffect(() => {
    const el = root.current;
    if (!armed || !el) return;
    const tiles = Array.from(el.querySelectorAll<HTMLElement>('[data-tile]'));
    if (typeof IntersectionObserver === 'undefined') { tiles.forEach((t) => t.setAttribute('data-in', '')); return; }
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target); } });
    }, { root: el, threshold: 0.08 });
    tiles.forEach((t) => { if (!t.hasAttribute('data-in')) io.observe(t); });
    return () => io.disconnect();
  }, [armed, lanes]);

  return (
    <div ref={root} className={`ui-masonry-root ${className ?? ''}`} style={{ height: height ?? '100%', '--gap': `${gap}px`, ...style } as CSSProperties} role="region" aria-label={label} tabIndex={0} data-armed={armed ? '' : undefined}>
      <div className="ui-masonry-grid">
        {lanes.map((lane, c) => (
          <div key={c} className="ui-masonry-col">
            {lane.map(({ it, i, ratio }, k) => {
              const props = { 'data-tile': '', className: 'ui-masonry-tile', 'data-sel': selected === i ? '' : undefined, style: { aspectRatio: `1 / ${ratio}`, '--delay': `${((k * cols + c) % 6) * 50}ms` } as CSSProperties };
              const inner = (
                <>
                  <Artwork item={it} index={i} />
                  <span className="ui-masonry-cap"><strong>{it.title}</strong>{it.subtitle ? <span>{it.subtitle}</span> : null}</span>
                </>
              );
              const key = itemKey(it, i);
              if (it.href) return <a key={key} {...props} href={it.href} draggable={false}>{inner}</a>;
              if (onSelect) return <button key={key} type="button" {...props} aria-pressed={selected === undefined ? undefined : selected === i} onClick={() => onSelect(it, i)}>{inner}</button>;
              return <figure key={key} {...props}>{inner}</figure>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Demo() {
  const [sel, setSel] = useState<number | undefined>(undefined);
  return <Masonry label="Photo wall" selected={sel} onSelect={(_, i) => setSel(i === sel ? undefined : i)} />;
}
