'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Scene, useReducedMotion } from './_d4';

export interface PreviewRow { title: string; meta?: string; scene?: number }
export interface ListImagePreviewProps { rows?: PreviewRow[]; className?: string }

const DEFAULT_ROWS: PreviewRow[] = [
  { title: 'Harbour at dusk', meta: '2024', scene: 0 },
  { title: 'Tidal marsh', meta: '2023', scene: 1 },
  { title: 'Rose quarry', meta: '2023', scene: 2 },
  { title: 'Cedar ridge', meta: '2022', scene: 3 },
];

/** A list of rows; with a mouse a floating picture trails the pointer, with touch or keyboard the picture opens inline under the row. */
export default function ListImagePreview({ rows = DEFAULT_ROWS, className }: ListImagePreviewProps) {
  const root = useRef<HTMLDivElement>(null);
  const float = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const cur = useRef({ x: 0, y: 0 });
  const raf = useRef(0);
  const hovered = useRef(-1);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(-1);
  const [mode, setMode] = useState<'pointer' | 'inline'>('inline');

  const paint = useCallback(() => {
    const el = float.current;
    if (!el) return;
    const k = reduced ? 1 : 0.18;
    cur.current.x += (target.current.x - cur.current.x) * k;
    cur.current.y += (target.current.y - cur.current.y) * k;
    el.style.transform = `translate3d(${cur.current.x}px, ${cur.current.y}px, 0)`;
    const settled = Math.abs(target.current.x - cur.current.x) + Math.abs(target.current.y - cur.current.y) < 0.4;
    raf.current = settled ? 0 : requestAnimationFrame(paint);
  }, [reduced]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => {
    const stop = () => { if (document.hidden) { cancelAnimationFrame(raf.current); raf.current = 0; } };
    document.addEventListener('visibilitychange', stop);
    return () => document.removeEventListener('visibilitychange', stop);
  }, []);

  const follow = (e: React.PointerEvent) => {
    const r = root.current?.getBoundingClientRect();
    if (!r || e.pointerType !== 'mouse') return;
    const w = Math.min(180, r.width * 0.5);
    target.current = { x: Math.max(0, Math.min(r.width - w, e.clientX - r.left + 18)), y: e.clientY - r.top - 60 };
    if (!raf.current) raf.current = requestAnimationFrame(paint);
  };

  return (
    <div ref={root} className={`ui-list-image-preview ${className ?? ''}`} onPointerMove={follow} onPointerLeave={() => { hovered.current = -1; setActive(-1); }}>
      <ul className="ui-list-image-preview-list">
        {rows.map((row, i) => {
          const open = active === i;
          return (
            <li key={row.title} className="ui-list-image-preview-item" data-open={open && mode === 'inline' ? '' : undefined}>
              <button
                type="button"
                className="ui-list-image-preview-row"
                aria-expanded={open && mode === 'inline'}
                onPointerEnter={(e) => {
                  if (e.pointerType !== 'mouse') return;
                  hovered.current = i; setMode('pointer'); setActive(i);
                  const r = root.current?.getBoundingClientRect();
                  if (r && !float.current?.dataset.placed) {
                    cur.current = target.current = { x: Math.max(0, Math.min(r.width - 180, e.clientX - r.left + 18)), y: e.clientY - r.top - 60 };
                    if (float.current) float.current.dataset.placed = '1';
                  }
                }}
                onFocus={() => { if (hovered.current !== i) { setMode('inline'); setActive(i); } }}
                onBlur={() => setActive((a) => (a === i && hovered.current !== i ? -1 : a))}
                onClick={(e) => { if (hovered.current === i && e.detail > 0) return; setMode('inline'); setActive(open ? -1 : i); }}
              >
                <span className="ui-list-image-preview-title">{row.title}</span>
                {row.meta && <span className="ui-list-image-preview-meta">{row.meta}</span>}
              </button>
              <div className="ui-list-image-preview-inline"><div><div className="ui-list-image-preview-pic"><Scene i={row.scene ?? i} /></div></div></div>
            </li>
          );
        })}
      </ul>
      <div ref={float} className="ui-list-image-preview-float" aria-hidden="true" data-show={active >= 0 && mode === 'pointer' ? '' : undefined}>
        <div className="ui-list-image-preview-pic">{active >= 0 && <Scene i={rows[active]?.scene ?? active} />}</div>
      </div>
    </div>
  );
}

export function Demo() {
  return <div style={{ padding: '4px 10px' }}><ListImagePreview rows={DEFAULT_ROWS.slice(0, 3)} /></div>;
}
