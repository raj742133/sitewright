'use client';
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { useReducedMotion } from './_t2';
import { Artwork, DEMO_ITEMS, itemKey, type GalleryItem } from './_galleries-data';
import { PlayPauseButton } from './_galleries-ui';
import { useLive, useSize } from './_galleries-hooks';

export interface DriftWallProps {
  /** Tiles; they are dealt across the columns and repeat as needed. */
  items?: GalleryItem[];
  /** Number of columns; by default 2 to 5 depending on the width. */
  columns?: number;
  /** Seconds for one column to scroll one full loop (columns vary around this). Default 44. */
  duration?: number;
  /** Tilt the whole wall in perspective and let the mouse steer it. Default true. */
  tilt?: boolean;
  /** Called when a tile is activated (tiles become buttons). Tiles with `href` are links. */
  onSelect?: (item: GalleryItem, index: number) => void;
  label?: string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

const RATIOS = [1.3, 0.95, 1.5, 1.1, 0.8, 1.25];

/** A wall of tiles whose columns drift up and down at different speeds, endlessly. It stops on hover and keyboard focus, has a pause button and stands still under reduced motion. */
export default function DriftWall({ items = DEMO_ITEMS, columns, duration = 44, tilt = true, onSelect, label = 'Drifting wall of pictures', height, className, style }: DriftWallProps) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const live = useLive(root);
  const { w } = useSize(root);
  const [paused, setPaused] = useState(false);
  const [hot, setHot] = useState(false);
  const cols = columns ?? (w === 0 ? 4 : w < 420 ? 2 : w < 640 ? 3 : w < 980 ? 4 : 5);
  const n = items.length;

  const lanes = useMemo(() => Array.from({ length: cols }, (_, c) => {
    const per = 7;
    return Array.from({ length: per }, (_, k) => { const idx = (c * 3 + k * cols) % n; return { idx, ratio: items[idx]?.ratio ?? RATIOS[(c + k) % RATIOS.length]! }; });
  }), [cols, items, n]);

  const run = !reduced && !paused && !hot && live;
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (!tilt || e.pointerType !== 'mouse' || !root.current) return;
    const r = root.current.getBoundingClientRect();
    root.current.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    root.current.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };
  const reset = () => { root.current?.style.setProperty('--mx', '0'); root.current?.style.setProperty('--my', '0'); };

  return (
    <section ref={root} className={`ui-drift-wall-root ${className ?? ''}`} style={{ height: height ?? '100%', ...style }} data-run={run ? '' : undefined} data-tilt={tilt ? '' : undefined} aria-label={label}
      onPointerMove={onMove} onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHot(true); }} onPointerLeave={() => { setHot(false); reset(); }}
      onFocus={() => setHot(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHot(false); }}>
      <div className="ui-drift-wall-stage" aria-hidden={onSelect || items.some((i) => i.href) ? undefined : true}>
        <div className="ui-drift-wall-wall">
          {lanes.map((lane, c) => (
            <div key={c} className="ui-drift-wall-col" style={{ '--dur': `${duration * (0.8 + ((c * 37) % 5) * 0.12)}s`, '--dir': c % 2 ? 'reverse' : 'normal', '--off': `${(c * 23) % 40}%` } as CSSProperties}>
              <div className="ui-drift-wall-lane">
                {[0, 1].map((copy) => lane.map((t, k) => {
                  const it = items[t.idx]!;
                  const first = copy === 0;
                  const inner = (
                    <>
                      <Artwork item={it} index={t.idx} />
                      <span className="ui-drift-wall-cap">{it.title}</span>
                    </>
                  );
                  const common = { className: 'ui-drift-wall-tile', style: { aspectRatio: `1 / ${t.ratio}` } as CSSProperties };
                  const key = `${copy}-${k}-${itemKey(it, t.idx)}`;
                  if (!first) return <div key={key} {...common} aria-hidden="true">{inner}</div>;
                  if (it.href) return <a key={key} {...common} href={it.href} aria-label={it.title} draggable={false}>{inner}</a>;
                  if (onSelect) return <button key={key} type="button" {...common} aria-label={it.title} onClick={() => onSelect(it, t.idx)}>{inner}</button>;
                  return <div key={key} {...common}>{inner}</div>;
                }))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {!reduced ? <div className="ui-drift-wall-ctl"><PlayPauseButton playing={!paused} onToggle={() => setPaused((p) => !p)} className="ui-drift-wall-btn" /></div> : null}
      <div className="ui-drift-wall-fade" aria-hidden="true" />
    </section>
  );
}

export function Demo() {
  return <DriftWall label="Wall of featured places" />;
}
