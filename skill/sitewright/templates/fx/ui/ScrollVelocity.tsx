'use client';
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { scrollSource, useReducedMotion, watchLive } from './_text-b';

export interface ScrollVelocityProps {
  /** One string per row; rows alternate direction. */
  rows?: string[];
  /** Resting drift speed in px per second. */
  speed?: number;
  /** How strongly scrolling speeds the rows up (and decides their direction). */
  gain?: number;
  /** Scroll container to follow; defaults to the nearest scrolling ancestor, else the page. */
  scroller?: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Rows of big type that drift sideways at a calm pace and surge, skew and reverse with scroll speed and direction. Static with reduced motion. */
export default function ScrollVelocity({ rows = ['Scroll faster', 'Move with the page'], speed = 36, gain = 0.55, scroller, className, style }: ScrollVelocityProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [copies, setCopies] = useState(3);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>('.ui-scroll-velocity-item:first-child'));
    const tracks = Array.from(el.querySelectorAll<HTMLElement>('.ui-scroll-velocity-track'));
    const measure = () => {
      const w = Math.max(1, ...items.map((i) => i.offsetWidth));
      setCopies(Math.min(12, Math.ceil(el.clientWidth / w) + 2));
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    items.forEach((i) => ro?.observe(i));
    if (reduced) { tracks.forEach((t) => { t.style.transform = ''; }); return () => ro?.disconnect(); }

    const src = scrollSource(el, scroller?.current);
    const x = tracks.map(() => 0);
    let live = true, raf = 0, last = 0, lastPos = src.pos(), vel = 0, dir = 1;
    const frame = (now: number) => {
      raf = 0;
      if (!live) return;
      const dt = Math.min(64, now - (last || now - 16)) / 1000;
      last = now;
      const pos = src.pos();
      const inst = dt > 0 ? (pos - lastPos) / dt : 0;
      lastPos = pos;
      vel += (inst - vel) * Math.min(1, dt * 7);
      if (Math.abs(vel) > 40) dir = vel > 0 ? 1 : -1;
      const boost = Math.abs(vel) * gain;
      tracks.forEach((t, i) => {
        const item = t.firstElementChild as HTMLElement | null;
        const w = item ? item.offsetWidth : 0;
        if (!w) return;
        const sign = (i % 2 ? 1 : -1) * dir;
        let nx = ((x[i] ?? 0) + sign * (speed + boost) * dt) % w;
        if (nx > 0) nx -= w;
        x[i] = nx;
        t.style.transform = `translate3d(${nx.toFixed(2)}px,0,0) skewX(${clamp(-vel / 90, -14, 14).toFixed(2)}deg)`;
      });
      raf = requestAnimationFrame(frame);
    };
    const off = watchLive(el, (v) => { live = v; if (v && !raf) { last = 0; raf = requestAnimationFrame(frame); } });
    return () => { off(); if (raf) cancelAnimationFrame(raf); ro?.disconnect(); };
  }, [reduced, scroller, speed, gain, rows]);

  return (
    <div ref={root} className={`ui-scroll-velocity-root${className ? ` ${className}` : ''}`} style={style} role="group" aria-label={rows.join(', ')}>
      {rows.map((text, r) => (
        <div key={r} className="ui-scroll-velocity-row" data-alt={r % 2 === 1}>
          <div className="ui-scroll-velocity-track" aria-hidden="true">
            {Array.from({ length: copies }, (_, c) => (
              <span key={c} className="ui-scroll-velocity-item">{text}<i className="ui-scroll-velocity-dot" /></span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-scroll-velocity-demo" tabIndex={0} role="region" aria-label="Scroll to speed up the ticker rows">
      <div className="ui-scroll-velocity-hint" aria-hidden="true">Scroll fast</div>
      <ScrollVelocity rows={['Scroll faster', 'Move with the page', 'Feel the speed']} />
      <div className="ui-scroll-velocity-tail" aria-hidden="true" />
    </div>
  );
}
