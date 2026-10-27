'use client';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

export interface CubeFace { title: string; text: string }
export interface CubeCarouselProps {
  /** 3 to 8 faces; 4-6 looks best. */
  items?: CubeFace[];
  className?: string;
  /** CSS height (default fills parent, min 140px). */
  height?: number | string;
}
const DEFAULTS: CubeFace[] = [
  { title: 'Plan', text: 'Sketch the route and the stops.' },
  { title: 'Build', text: 'Ship small pieces, often.' },
  { title: 'Review', text: 'Two pairs of eyes on every change.' },
  { title: 'Launch', text: 'Roll out to a few, then everyone.' },
  { title: 'Learn', text: 'Read the numbers, adjust.' },
];
const DEG_PER_PX = 0.45;

/** A rotating 3D prism of content faces. Drag or swipe to rotate and snap; buttons and arrow keys also step. */
export default function CubeCarousel({ items = DEFAULTS, className, height }: CubeCarouselProps) {
  const n = Math.max(3, items.length);
  const step = 360 / n;
  const [idx, setIdx] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const view = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, x: 0, lx: 0, lt: 0, v: 0, deg: 0 });
  const idxRef = useRef(0);
  const faceW = Math.max(100, Math.min(size.w * 0.74, 260));
  const radius = faceW / 2 / Math.tan(Math.PI / n);

  const paint = useCallback((deg: number, animate: boolean) => {
    const el = stage.current;
    if (!el) return;
    el.style.transition = animate ? '' : 'none';
    el.style.transform = `translateZ(${-radius}px) rotateY(${-idxRef.current * step + deg}deg)`;
  }, [radius, step]);

  useEffect(() => { idxRef.current = idx; paint(0, true); }, [idx, paint]);
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = (d: number) => setIdx((i) => i + d);
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    Object.assign(drag.current, { on: true, x: e.clientX, lx: e.clientX, lt: e.timeStamp, v: 0, deg: 0 });
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.on) return;
    const dt = Math.max(1, e.timeStamp - d.lt);
    d.v = d.v * 0.6 + ((e.clientX - d.lx) / dt) * 0.4;
    d.lx = e.clientX; d.lt = e.timeStamp;
    d.deg = (e.clientX - d.x) * DEG_PER_PX;
    paint(d.deg, false);
  };
  const up = () => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    const total = d.deg + d.v * 160 * DEG_PER_PX;
    const steps = Math.max(-2, Math.min(2, Math.round(-total / step)));
    if (steps) go(steps); else paint(0, true);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1);
    else if (e.key === 'Home') setIdx((i) => i - (((i % n) + n) % n));
    else return;
    e.preventDefault();
  };
  const cur = ((idx % n) + n) % n;
  const faces = Array.from({ length: n }, (_, i) => items[i] ?? { title: `Face ${i + 1}`, text: '' });
  return (
    <div className={`ui-cube-carousel-root ${className ?? ''}`} style={{ height: height ?? '100%' }} tabIndex={0} role="group" aria-roledescription="carousel"
      aria-label="3D carousel. Drag, or use the arrow keys." onKeyDown={key}>
      <button type="button" className="ui-cube-carousel-btn" aria-label="Previous face" onClick={() => go(-1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <div ref={view} className="ui-cube-carousel-view" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div ref={stage} className="ui-cube-carousel-stage">
          {faces.map((f, i) => (
            <div key={i} className="ui-cube-carousel-face" aria-hidden={i !== cur} inert={i !== cur}
              style={{ width: faceW, marginLeft: -faceW / 2, transform: `rotateY(${i * step}deg) translateZ(${radius}px)`, ['--mix' as string]: `${25 + (i * 60) / n}%` }}>
              <strong>{f.title}</strong><span>{f.text}</span>
              <em>{i + 1} / {n}</em>
            </div>
          ))}
        </div>
      </div>
      <button type="button" className="ui-cube-carousel-btn" aria-label="Next face" onClick={() => go(1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </button>
      <span className="ui-cube-carousel-sr" aria-live="polite">{`Face ${cur + 1} of ${n}: ${faces[cur]?.title ?? ''}. ${faces[cur]?.text ?? ''}`}</span>
    </div>
  );
}

export function Demo() {
  return <CubeCarousel />;
}
