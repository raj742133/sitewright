'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useReducedMotion } from './_t2';
import { Artwork, DEMO_ITEMS, clamp, wrap, type GalleryItem } from './_galleries-data';
import { ArrowButton, PlayPauseButton } from './_galleries-ui';
import { useIsoLayoutEffect, useLive, usePointerDrag, useSize } from './_galleries-hooks';

export interface InfiniteSpiralProps {
  /** Pictures along the spiral. They repeat so it always looks full. */
  items?: GalleryItem[];
  /** Controlled index of the front picture. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Pictures per second the spiral turns on its own; 0 turns it off. Pauses on hover and focus, never runs under reduced motion. Default 0.25. */
  autoplay?: number;
  /** Let the mouse wheel move the spiral while the pointer is over it (off by default so the page still scrolls). */
  wheel?: boolean;
  label?: string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

const TURNS = 1.6;

/** Pictures laid along a spiral that winds into the centre. They flow outward and grow as they near you, forever: drag, use the buttons or arrow keys, click one to bring it forward. */
export default function InfiniteSpiral({ items = DEMO_ITEMS, index, defaultIndex = 0, onIndexChange, autoplay = 0.25, wheel = false, label = 'Spiral gallery', height, className, style }: InfiniteSpiralProps) {
  const n = items.length;
  const M = n * Math.ceil(12 / n);
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const live = useLive(root);
  const size = useSize(view);
  const [paused, setPaused] = useState(false);
  const [hot, setHot] = useState(false);
  const [front, setFront] = useState(wrap(index ?? defaultIndex, n));
  const spin = autoplay > 0 && !reduced && !paused && !hot && live;

  const w = size.w || 600, h = size.h || 300;
  const iw = clamp(Math.min(w * 0.15, h * 0.26), 48, 150);
  const ih = iw * 1.25;
  const k = Math.log(9) / (M - 1.5);
  const rx = clamp((w - iw) * 0.42, 60, 560), ry = Math.max(30, (h - ih) * 0.44);
  const pt = useCallback((p: number) => {
    const e = Math.exp(-k * p);
    const ang = Math.PI / 2 + p * ((2 * Math.PI * TURNS) / M);
    return { e, x: w / 2 + Math.cos(ang) * rx * e, y: h / 2 + Math.sin(ang) * ry * e };
  }, [k, M, w, h, rx, ry]);
  const guide = Array.from({ length: 90 }, (_, i) => { const q = pt(-1.2 + (i * (M - 0.3)) / 89); return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join('');

  const st = useRef({ pos: index ?? defaultIndex, target: null as number | null, vel: 0, dragging: false, raf: 0, last: 0, spin: false, front: -1, base: 0 });
  const cbs = useRef(onIndexChange);
  useEffect(() => { cbs.current = onIndexChange; });

  const paint = useCallback(() => {
    const s = st.current;
    let best = 0, bestD = 99;
    for (let i = 0; i < M; i++) {
      const el = els.current[i];
      const p = wrap(i - s.pos + 1.5, M) - 1.5;
      const q = pt(p);
      if (Math.abs(p) < bestD) { bestD = Math.abs(p); best = i; }
      if (!el) continue;
      const o = clamp((p + 1.5) / 1.2, 0, 1) * clamp((M - 1.5 - p) / 3, 0, 1);
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o < 0.01 ? 'hidden' : '';
      el.style.zIndex = String(Math.round(1000 - p * 20));
      el.style.transform = `translate3d(${(q.x - iw / 2).toFixed(1)}px, ${(q.y - ih / 2).toFixed(1)}px, 0) scale(${Math.pow(q.e, 0.85).toFixed(3)})`;
    }
    const f = best % n;
    if (f !== s.front) { s.front = f; setFront(f); }
  }, [M, n, pt, iw, ih]);

  const tickRef = useRef<(t: number) => void>(() => {});
  const loop = useCallback((t: number) => tickRef.current(t), []);
  const tick = useCallback((now: number) => {
    const s = st.current;
    s.raf = 0;
    const dt = Math.min(0.05, s.last ? (now - s.last) / 1000 : 0.016);
    s.last = now;
    let more = false;
    if (s.dragging) more = true;
    else if (s.target !== null) {
      const d = s.target - s.pos;
      if (Math.abs(d) < 0.004) { s.pos = s.target; s.target = null; } else { s.pos += d * Math.min(1, dt * 6.5); more = true; }
    } else if (Math.abs(s.vel) > 0.15) {
      s.pos += s.vel * dt; s.vel *= Math.pow(0.05, dt); more = true;
      if (Math.abs(s.vel) <= 0.15) { s.vel = 0; s.target = Math.round(s.pos); }
    } else if (s.spin) { s.pos += autoplay * dt; more = true; }
    paint();
    if (more || s.spin) s.raf = requestAnimationFrame(loop); else s.last = 0;
  }, [autoplay, paint]);
  useEffect(() => { tickRef.current = tick; });
  const kick = useCallback(() => { const s = st.current; if (!s.raf && live) { s.last = 0; s.raf = requestAnimationFrame(loop); } }, [loop, live]);

  useIsoLayoutEffect(() => { paint(); view.current?.setAttribute('data-ready', ''); }, [paint]);
  useEffect(() => { st.current.spin = spin; if (spin) kick(); }, [spin, kick]);
  useEffect(() => { if (!live && st.current.raf) { cancelAnimationFrame(st.current.raf); st.current.raf = 0; } else if (live) kick(); }, [live, kick]);
  useEffect(() => () => cancelAnimationFrame(st.current.raf), []);
  useEffect(() => { if (index !== undefined && wrap(Math.round(st.current.pos), n) !== wrap(index, n)) goTo(index); });
  useEffect(() => { cbs.current?.(front); }, [front]);

  const goTo = (target: number) => {
    const s = st.current;
    const cur = Math.round(s.pos);
    const d = wrap(target - cur + Math.floor(n / 2), n) - Math.floor(n / 2);
    s.vel = 0; s.target = cur + d;
    if (reduced) { s.pos = s.target; s.target = null; paint(); } else kick();
  };
  const by = (d: number) => { const s = st.current; goTo((s.target ?? Math.round(s.pos)) + d); };

  usePointerDrag(view, {
    onStart: () => { const s = st.current; s.dragging = true; s.target = null; s.vel = 0; kick(); },
    onMove: (_dx, _dy, ix, iy) => { const s = st.current; s.pos -= (ix - iy) / (iw * 0.9); paint(); },
    onEnd: (vx, vy) => {
      const s = st.current;
      s.dragging = false;
      s.vel = reduced ? 0 : clamp(-((vx - vy) * 1000) / (iw * 0.9), -6, 6);
      if (Math.abs(s.vel) <= 0.15) { s.vel = 0; s.target = Math.round(s.pos); if (reduced) { s.pos = s.target; s.target = null; paint(); } }
      kick();
    },
  });
  useEffect(() => {
    const el = view.current;
    if (!wheel || !el) return;
    let acc = 0;
    const on = (e: WheelEvent) => { e.preventDefault(); acc += e.deltaY; if (Math.abs(acc) > 60) { by(acc > 0 ? 1 : -1); acc = 0; } };
    el.addEventListener('wheel', on, { passive: false });
    return () => el.removeEventListener('wheel', on);
  });

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') by(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') by(-1);
    else if (e.key === 'Home') goTo(0);
    else if (e.key === 'End') goTo(n - 1);
    else return;
    e.preventDefault();
  };

  const it = items[front];
  return (
    <section ref={root} className={`ui-infinite-spiral-root ${className ?? ''}`} style={{ height: height ?? '100%', ...style }} aria-roledescription="carousel" aria-label={label} onKeyDown={onKey}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHot(true); }} onPointerLeave={() => setHot(false)}
      onFocus={() => setHot(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHot(false); }}>
      <div ref={view} className="ui-infinite-spiral-view" style={{ '--w': `${iw}px`, '--h': `${ih}px` } as CSSProperties}>
        <svg className="ui-infinite-spiral-guide" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false"><path d={guide} /></svg>
        {Array.from({ length: M }, (_, i) => {
          const x = items[i % n]!;
          const dup = i >= n;
          return (
            <div key={i} ref={(el) => { els.current[i] = el; }} className="ui-infinite-spiral-tile" data-front={!dup && i === front ? '' : undefined} {...(dup ? { 'aria-hidden': true } : { role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${i + 1} of ${n}` })}>
              <Artwork item={x} index={i % n} />
              {dup ? null : <button type="button" className="ui-infinite-spiral-hit" tabIndex={i === front ? 0 : -1} aria-label={`${x.title}${x.subtitle ? ', ' + x.subtitle : ''}`} aria-current={i === front ? 'true' : undefined}
                onClick={() => { if (i === front && x.href) window.location.assign(x.href); else goTo(i); }} />}
              {dup ? <span className="ui-infinite-spiral-hit" onClick={() => goTo(i)} /> : null}
            </div>
          );
        })}
      </div>
      <div className="ui-infinite-spiral-bar">
        <ArrowButton dir="prev" label="Previous picture" className="ui-infinite-spiral-btn" onClick={() => by(-1)} />
        <div className="ui-infinite-spiral-cap" aria-live={spin ? 'off' : 'polite'}><strong>{it?.title}</strong>{it?.subtitle ? <span>{it.subtitle}</span> : null}</div>
        <ArrowButton dir="next" label="Next picture" className="ui-infinite-spiral-btn" onClick={() => by(1)} />
        {autoplay > 0 && !reduced ? <PlayPauseButton playing={!paused} onToggle={() => setPaused((p) => !p)} className="ui-infinite-spiral-btn" /> : null}
      </div>
    </section>
  );
}

export function Demo() {
  return <InfiniteSpiral label="Featured places" />;
}
