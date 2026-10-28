'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { readPalette, useReducedMotion, watchLive, watchPalette } from './_text-c';
import { TILE_KINDS, TILE_W, TILE_H, paintTile } from './_text-c-tiles';

export interface GalleryItem { title: string; note?: string }
export interface GalleryHeadingProps {
  /** One tile and heading per item (3 to 8 work best). */
  items?: GalleryItem[];
  /** Controlled index. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Turn by itself (default true; off under reduced motion). */
  autoplay?: boolean;
  /** Milliseconds per slide (default 4200). */
  interval?: number;
  className?: string;
  style?: CSSProperties;
}

const DEFAULTS: GalleryItem[] = [
  { title: 'Field notes', note: 'Flat colour' }, { title: 'Quiet hours', note: 'Film grain' }, { title: 'Open studio', note: 'Ordered dither' },
  { title: 'After rain', note: 'Halftone dots' }, { title: 'Low tide', note: 'Signal glitch' }, { title: 'Night shift', note: 'Heavy noise' },
];
const mod = (a: number, n: number) => ((a % n) + n) % n;

/**
 * A heading over a 3D ring of generated print-style tiles (flat, grain, dither, halftone, glitch, noise drawn on Canvas2D). The ring turns to
 * each slide and the heading re-appears with a short glitch. Buttons, dots, arrow keys and dragging all work; it pauses on hover and focus.
 */
export default function GalleryHeading({ items = DEFAULTS, index, defaultIndex = 0, onIndexChange, autoplay = true, interval = 4200, className, style }: GalleryHeadingProps) {
  const n = items.length;
  const reduced = useReducedMotion();
  const [inner, setInner] = useState(defaultIndex);
  const cur = mod(index ?? inner, n);
  const [playing, setPlaying] = useState(autoplay);
  const [hold, setHold] = useState(false);
  const [live, setLive] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tiles = useRef<(HTMLCanvasElement | null)[]>([]);
  const m = useRef({ a: 0, pos: 0, raf: 0, drag: false, lx: 0, reduced });
  const step = 360 / n;
  const curRef = useRef(cur);
  useEffect(() => { curRef.current = cur; m.current.reduced = reduced; });

  const apply = useCallback(() => { if (ring.current) ring.current.style.setProperty('--a', `${m.current.a.toFixed(2)}deg`); }, []);
  const tick = useCallback(() => {
    const s = m.current;
    s.raf = 0;
    const goal = -s.pos * (360 / n);
    s.a = s.reduced ? goal : s.a + (goal - s.a) * 0.11;
    if (Math.abs(goal - s.a) < 0.05) s.a = goal;
    apply();
    if (s.a !== goal && !s.drag) s.raf = requestAnimationFrame(tick);
  }, [apply, n]);
  const kick = useCallback(() => { if (!m.current.raf) m.current.raf = requestAnimationFrame(tick); }, [tick]);

  useEffect(() => {
    const s = m.current;
    const d = mod(cur - s.pos + Math.floor(n / 2), n) - Math.floor(n / 2);
    if (d !== 0) { s.pos += d; kick(); }
  }, [cur, n, kick]);
  useEffect(() => { kick(); const s = m.current; return () => { if (s.raf) cancelAnimationFrame(s.raf); }; }, [kick]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const paint = () => {
      const pal = readPalette(el);
      tiles.current.forEach((cv, i) => { if (cv) paintTile(cv, TILE_KINDS[i % TILE_KINDS.length]!, i + 1, pal); });
    };
    const off = watchPalette(el, paint);
    const offLive = watchLive(el, setLive);
    const st = stage.current;
    const size = () => { if (st && ring.current) { const tw = Math.max(64, Math.min((st.clientHeight - 24) * 0.58, st.clientWidth * 0.36, 260)); const r = (tw / 2) / Math.tan(Math.PI / n) + 8; ring.current.style.setProperty('--tw', `${tw.toFixed(1)}px`); ring.current.style.setProperty('--r', `${r.toFixed(1)}px`); } };
    size();
    const ro = new ResizeObserver(size);
    if (st) ro.observe(st);
    return () => { off(); offLive(); ro.disconnect(); };
  }, [n, items.length]);

  const go = useCallback((i: number) => {
    const next = mod(i, n);
    if (index === undefined) setInner(next);
    onIndexChange?.(next);
  }, [n, index, onIndexChange]);

  const run = playing && !hold && live && !reduced;
  useEffect(() => {
    if (!run) return;
    const id = window.setInterval(() => go(curRef.current + 1), interval);
    return () => window.clearInterval(id);
  }, [run, interval, go]);

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const s = m.current; s.drag = true; s.lx = e.clientX; e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = m.current;
    if (!s.drag) return;
    s.a += (e.clientX - s.lx) * 0.35; s.lx = e.clientX; apply();
  };
  const up = () => {
    const s = m.current;
    if (!s.drag) return;
    s.drag = false;
    s.pos = Math.round(-s.a / step);
    go(s.pos); kick();
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') go(cur + 1); else if (e.key === 'ArrowLeft') go(cur - 1);
    else if (e.key === 'Home') go(0); else if (e.key === 'End') go(n - 1); else return;
    e.preventDefault();
  };
  const item = items[cur] ?? DEFAULTS[0]!;

  return (
    <div ref={root} className={`ui-gallery-heading-root ${className ?? ''}`} style={style} role="group" aria-roledescription="carousel" aria-label="Gallery"
      onKeyDown={onKey} onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHold(true); }} onPointerLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
      <div ref={stage} className="ui-gallery-heading-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-hidden="true">
        <div ref={ring} className="ui-gallery-heading-ring" style={{ ['--n' as string]: n, ['--step' as string]: `${step}deg` }}>
          {items.map((it, i) => (
            <div key={i} className="ui-gallery-heading-tile" data-on={i === cur ? '' : undefined} style={{ ['--i' as string]: i }}>
              <canvas ref={(el) => { tiles.current[i] = el; }} width={TILE_W} height={TILE_H} />
            </div>
          ))}
        </div>
      </div>
      <div className="ui-gallery-heading-dots">
        {items.map((it, i) => <button key={i} type="button" className="ui-gallery-heading-dot" aria-label={`Show ${it.title}`} aria-current={i === cur ? 'true' : undefined} onClick={() => go(i)} />)}
      </div>
      <div className="ui-gallery-heading-foot">
        <div className="ui-gallery-heading-copy" aria-live={playing ? 'off' : 'polite'}>
          <span className="ui-gallery-heading-kicker">{String(cur + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}{item.note ? ` · ${item.note}` : ''}</span>
          <h2 key={cur} className="ui-gallery-heading-title" data-text={item.title}>{item.title}</h2>
        </div>
        <div className="ui-gallery-heading-ctl">
          <button type="button" className="ui-gallery-heading-btn" aria-label="Previous slide" onClick={() => go(cur - 1)}>‹</button>
          {autoplay && !reduced ? <button type="button" className="ui-gallery-heading-btn" aria-label={playing ? 'Pause slideshow' : 'Play slideshow'} aria-pressed={!playing} onClick={() => setPlaying((p) => !p)}>{playing ? '❚❚' : '▶'}</button> : null}
          <button type="button" className="ui-gallery-heading-btn" aria-label="Next slide" onClick={() => go(cur + 1)}>›</button>
        </div>
      </div>
    </div>
  );
}

export function Demo() {
  return <div className="ui-gallery-heading-demo"><GalleryHeading /></div>;
}
