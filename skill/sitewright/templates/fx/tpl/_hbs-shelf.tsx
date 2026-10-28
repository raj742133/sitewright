'use client';
// A shelf of real 3D books. Each book is a cuboid (spine, cover, pages, back) in CSS 3D. Selecting one swings it a quarter turn
// and pulls it forward so the cover faces you; the row slides (carousel) to keep it centred; the cover tilts toward the pointer.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { MotifArt, type Tool } from './_hbs-data';

const GAP = 6, PAD = 22, EXTRA_L = 34, EXTRA_R = 108;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const pad2 = (n: number) => String(n).padStart(2, '0');

export interface ShelfProps { tools: Tool[]; index: number; onSelect: (i: number) => void; reduced: boolean; owned: string[] }

function Plant() {
  return (
    <svg className="hbs-plant" viewBox="0 0 80 120" aria-hidden="true" focusable="false">
      <path d="M40 84C40 60 38 44 40 22" className="hbs-pl-s" />
      <path d="M40 70C28 66 20 56 20 42C32 44 40 54 40 70ZM40 56C52 52 60 42 58 28C46 30 40 42 40 56ZM40 40C32 36 28 28 30 16C38 18 42 28 40 40Z" className="hbs-pl-l" />
      <path d="M22 84H58L54 112H26Z" className="hbs-pl-p" />
      <path d="M22 84H58" className="hbs-pl-r" />
    </svg>
  );
}

export function Shelf({ tools, index, onSelect, reduced, owned }: ShelfProps) {
  const view = useRef<HTMLDivElement>(null);
  const meas = useRef<HTMLSpanElement>(null);
  const slots = useRef<(HTMLButtonElement | null)[]>([]);
  const drag = useRef<{ x: number; id: number; moved: boolean } | null>(null);
  const [tx, setTx] = useState(0);
  const [ready, setReady] = useState(false);

  const place = useCallback(() => {
    const vw = view.current?.clientWidth ?? 0, H = meas.current?.offsetHeight ?? 0;
    if (!vw || !H) return;
    const widths = tools.map((t, i) => Math.max(44, H * t.thick * 1.25) + (i === index ? H * (t.tall / 100) * 0.72 + 18 : 0));
    const total = EXTRA_L + PAD * 2 + EXTRA_R + widths.reduce((a, b) => a + b, 0) + GAP * (tools.length + 1);
    if (total <= vw) { setTx((vw - total) / 2); return; }
    let left = PAD + EXTRA_L;
    for (let i = 0; i < index; i++) left += widths[i]! + GAP;
    const center = left + widths[index]! / 2;
    setTx(clamp(vw / 2 - center, vw - total, 0));
  }, [tools, index]);
  useLayoutEffect(() => { place(); }, [place]);
  useEffect(() => {
    setReady(true);
    const el = view.current;
    if (!el) return;
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [place]);

  const key = (e: KeyboardEvent) => {
    const n = tools.length;
    const to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (index + 1) % n : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (index - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    onSelect(to);
    slots.current[to]?.focus();
  };

  const tilt = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === 'touch') return;
    const el = slots.current[index];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = clamp((e.clientX - (r.left + r.width * 0.62)) / 420, -1, 1), py = clamp((e.clientY - (r.top + r.height / 2)) / 360, -1, 1);
    el.style.setProperty('--ry', `${(px * 9).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-py * 6).toFixed(2)}deg`);
  };
  const untilt = () => { const el = slots.current[index]; if (el) { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); } };
  const down = (e: PointerEvent<HTMLDivElement>) => { drag.current = { x: e.clientX, id: e.pointerId, moved: false }; };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d && d.id === e.pointerId && !d.moved && e.pointerType !== 'mouse' && Math.abs(e.clientX - d.x) > 56) { d.moved = true; onSelect(clamp(index + (e.clientX < d.x ? 1 : -1), 0, tools.length - 1)); }
    tilt(e);
  };
  const up = () => { window.setTimeout(() => { drag.current = null; }, 0); };

  return (
    <div className="hbs-shelf" data-ready={ready ? 'true' : undefined}>
      <span ref={meas} className="hbs-meas" aria-hidden="true" />
      <div ref={view} className="hbs-view" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={untilt}>
        <ul className="hbs-row" role="listbox" aria-label="Tools on the shelf" aria-orientation="horizontal" onKeyDown={key} style={{ transform: `translateX(${tx.toFixed(1)}px)` }}>
          <li className="hbs-bookend" role="presentation" aria-hidden="true" />
          {tools.map((t, i) => {
            const sel = i === index;
            return (
              <li key={t.id} role="presentation" className="hbs-slot" data-sel={sel ? 'true' : undefined}>
                <button
                  type="button"
                  role="option"
                  aria-selected={sel}
                  aria-label={`${t.title}, ${t.kind}. ${t.line}${owned.includes(t.id) ? '. On your shelf' : ''}`}
                  tabIndex={sel ? 0 : -1}
                  ref={(el) => { slots.current[i] = el; }}
                  className="hbs-book"
                  style={{ '--thick': t.thick, '--tall': t.tall / 100, '--bind': t.bind } as CSSProperties}
                  onClick={() => { if (!drag.current?.moved) onSelect(i); }}
                >
                  <span className="hbs-tilt" aria-hidden="true">
                    <span className="hbs-box">
                      <span className="hbs-face hbs-spine"><i className="hbs-band" /><b>{t.title}</b><small>{t.kind}</small><svg viewBox="0 0 24 24" className="hbs-mark"><path d="M12 3l5 8h-3l4 6H6l4-6H7z" /><path d="M12 17v4" /></svg><i className="hbs-band hbs-band-b" /></span>
                      <span className="hbs-face hbs-cover">
                        <svg viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice" className="hbs-cv-art" focusable="false"><MotifArt kind={t.motif} /></svg>
                        <span className="hbs-cv-top"><i>No. {pad2(i + 1)}</i><i>{t.status}</i></span>
                        <span className="hbs-cv-title"><b>{t.title}</b><em>{t.line}</em></span>
                        <span className="hbs-cv-foot">Marrow &amp; Pine Press</span>
                      </span>
                      <span className="hbs-face hbs-pages" />
                      <span className="hbs-face hbs-back" />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          <li className="hbs-plant-li" role="presentation" aria-hidden="true"><Plant /></li>
        </ul>
      </div>
      <div className="hbs-board" aria-hidden="true"><i /></div>
    </div>
  );
}
