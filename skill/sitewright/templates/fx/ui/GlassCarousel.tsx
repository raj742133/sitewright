'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react';

export interface GlassItem { id: string; title: string; body?: string; tone?: 'primary' | 'signal' | 'ok' | 'critical' }
export interface GlassCarouselProps {
  items?: GlassItem[];
  children?: ReactNode[] | ReactNode;
  index?: number;
  defaultIndex?: number;
  onChange?: (index: number) => void;
  autoplay?: boolean | number;
  height?: number | string;
  label?: string;
}

const DEFAULTS: GlassItem[] = [
  { id: 'a', title: 'Plan', body: 'Sketch the pages and pick a look.', tone: 'primary' },
  { id: 'b', title: 'Build', body: 'Components assemble themselves.', tone: 'signal' },
  { id: 'c', title: 'Publish', body: 'One click and it is live.', tone: 'ok' },
  { id: 'd', title: 'Refine', body: 'Tweak copy and colour any time.', tone: 'primary' },
];

function seed(id: string) {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return h;
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function GlassCarousel({
  items, children, index, defaultIndex = 0, onChange, autoplay = false, height = 260, label = 'Carousel',
}: GlassCarouselProps) {
  const kids = children == null ? null : (Array.isArray(children) ? children : [children]);
  const data = items ?? (kids ? null : DEFAULTS);
  const n = data ? data.length : kids ? kids.length : 0;
  const [inner, setInner] = useState(defaultIndex);
  const cur = clamp(index ?? inner, 0, Math.max(0, n - 1));
  const [frac, setFrac] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef({ x0: 0, step: 200, pts: [] as [number, number][], moved: false, on: false });
  const curRef = useRef(cur);
  curRef.current = cur;

  const go = useCallback((i: number) => {
    const t = clamp(i, 0, n - 1);
    if (index === undefined) setInner(t);
    if (t !== curRef.current) onChange?.(t);
  }, [n, index, onChange]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const f = () => setReduced(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);

  const ms = typeof autoplay === 'number' ? autoplay : 3500;
  useEffect(() => {
    if (!autoplay || reduced || paused || dragging || n < 2) return;
    const t = window.setInterval(() => go(curRef.current >= n - 1 ? 0 : curRef.current + 1), ms);
    return () => window.clearInterval(t);
  }, [autoplay, reduced, paused, dragging, n, ms, go]);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button > 0 || n < 2) return;
    const w = stage.current?.getBoundingClientRect().width ?? 300;
    drag.current = { x0: e.clientX, step: Math.max(80, w * 0.38), pts: [[e.clientX, performance.now()]], moved: false, on: true };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.on) return;
    const dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dx) < 5) return;
    if (!d.moved) { d.moved = true; setDragging(true); }
    d.pts.push([e.clientX, performance.now()]);
    if (d.pts.length > 6) d.pts.shift();
    const raw = cur - dx / d.step;
    setFrac(clamp(raw, -0.4, n - 0.6) - cur);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (d.moved) {
      const first = d.pts[0];
      const last = d.pts[d.pts.length - 1];
      const dt = first && last ? Math.max(1, last[1] - first[1]) : 1;
      const v = first && last ? (last[0] - first[0]) / dt : 0; // px per ms
      const projected = cur + frac - (v * 1000 / d.step) * 0.16;
      go(Math.round(clamp(projected, cur - 2, cur + 2)));
    }
    setFrac(0);
    setDragging(false);
    window.setTimeout(() => { d.moved = false; }, 0);
  };
  const key = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(n - 1); }
  };

  const slides: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const d = i - (cur + frac);
    const ad = Math.abs(d);
    const centre = i === cur;
    const style: CSSProperties = {
      transform: `translateX(${d * 62}%) translateZ(${-ad * 60}px) rotateY(${clamp(-d, -2, 2) * 16}deg) scale(${Math.max(0.5, 1 - ad * 0.17)})`,
      opacity: ad > 2.4 ? 0 : 1 - Math.min(ad, 2) * 0.28,
      zIndex: 20 - Math.round(ad * 4),
      visibility: ad > 2.6 ? 'hidden' : 'visible',
    };
    const s = data?.[i];
    const sd = s ? seed(s.id) : i * 37;
    slides.push(
      <div
        key={s?.id ?? i}
        className={`ui-glass-carousel-slide${centre ? ' is-centre' : ''}`}
        role="group"
        aria-roledescription="slide"
        aria-label={`${i + 1} of ${n}`}
        aria-hidden={centre ? undefined : true}
        inert={!centre}
        tabIndex={centre ? 0 : -1}
        data-tone={s?.tone ?? 'primary'}
        style={style}
        onClick={() => { if (!drag.current.moved && !centre) go(i); }}
      >
        {s ? (
          <>
            <div className="ui-glass-carousel-art" aria-hidden="true" style={{ '--x': `${15 + (sd % 50)}%`, '--y': `${20 + (sd % 37)}%`, '--r': `${(sd % 7) * 12}deg` } as CSSProperties}>
              <i /><i /><i />
            </div>
            <div className="ui-glass-carousel-text">
              <strong>{s.title}</strong>
              {s.body && <span>{s.body}</span>}
            </div>
          </>
        ) : kids?.[i]}
      </div>,
    );
  }

  return (
    <section
      className="ui-glass-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      style={{ height }}
      onKeyDown={key}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="ui-glass-carousel-blobs" aria-hidden="true"><i /><i /></div>
      <div
        ref={stage}
        className={`ui-glass-carousel-stage${dragging ? ' is-dragging' : ''}`}
        aria-live={autoplay && !paused ? 'off' : 'polite'}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {slides}
      </div>
      <div className="ui-glass-carousel-bar">
        <button type="button" className="ui-glass-carousel-arrow" aria-label="Previous slide" disabled={cur <= 0} onClick={() => go(cur - 1)}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="ui-glass-carousel-dots">
          {Array.from({ length: n }, (_, i) => (
            <button key={i} type="button" className={`ui-glass-carousel-dot${i === cur ? ' is-on' : ''}`} aria-label={`Go to slide ${i + 1}`} aria-current={i === cur ? 'true' : undefined} onClick={() => go(i)}><span /></button>
          ))}
        </div>
        <button type="button" className="ui-glass-carousel-arrow" aria-label="Next slide" disabled={cur >= n - 1} onClick={() => go(cur + 1)}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </section>
  );
}

export function Demo() {
  return (
    <div style={{ width: '100%', height: 150 }}>
      <GlassCarousel height={150} label="Workflow steps" autoplay />
    </div>
  );
}
