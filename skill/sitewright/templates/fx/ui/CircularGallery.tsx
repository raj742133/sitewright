'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useReducedMotion } from './_t2';
import { Artwork, DEMO_ITEMS, clamp, itemKey, wrap, type GalleryItem } from './_galleries-data';
import { ArrowButton, PlayPauseButton } from './_galleries-ui';
import { useIsoLayoutEffect, useLive, usePointerDrag, useSize } from './_galleries-hooks';

export interface CircularGalleryProps {
  /** Panels around the cylinder (6 to 16 work best). */
  items?: GalleryItem[];
  /** Degrees per second of the slow automatic turn; 0 turns it off. Pauses on hover and focus, never runs under reduced motion. Default 8. */
  autoRotate?: number;
  /** Called with the index of the panel that faces the viewer, when it changes. */
  onFrontChange?: (index: number) => void;
  label?: string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

/** A cylinder of picture panels in perspective. It turns slowly by itself; drag to spin with inertia, then it settles on a panel. Buttons and arrow/Home/End keys step one panel. */
export default function CircularGallery({ items = DEMO_ITEMS, autoRotate = 8, onFrontChange, label = 'Gallery cylinder', height, className, style }: CircularGalleryProps) {
  const n = items.length;
  const step = 360 / Math.max(1, n);
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const live = useLive(root);
  const size = useSize(view);
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hot, setHot] = useState(false);
  const auto = autoRotate > 0 && !reduced;
  const spinning = auto && !paused && !hot && live;

  const pw = clamp(Math.min(size.w * 0.27, (size.h * 0.6) / 1.25), 80, 220);
  const ph = pw * 1.25;
  const R = Math.max((n * pw * 1.1) / (2 * Math.PI), pw * 1.2);

  const st = useRef({ rot: 0, vel: 0, target: null as number | null, dragging: false, base: 0, raf: 0, last: 0, spin: false, front: -1 });
  const cb = useRef(onFrontChange);
  useEffect(() => { cb.current = onFrontChange; });

  const paint = useCallback(() => {
    const s = st.current;
    if (ring.current) ring.current.style.transform = `translateZ(${-R}px) rotateY(${s.rot.toFixed(2)}deg)`;
    let best = 0, bestA = 999;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(((((i * step + s.rot) % 360) + 540) % 360) - 180);
      if (d < bestA) { bestA = d; best = i; }
      const el = panels.current[i];
      if (el) el.style.opacity = d > 100 ? '0' : String(clamp(Math.cos((d * Math.PI) / 180) * 1.1 + 0.15, 0.2, 1));
    }
    if (best !== s.front && s.target === null) { s.front = best; setFront(best); cb.current?.(best); }
  }, [n, step, R]);

  const tickRef = useRef<(t: number) => void>(() => {});
  const loop = useCallback((t: number) => tickRef.current(t), []);
  const tick = useCallback((t: number) => {
    const s = st.current;
    s.raf = 0;
    const dt = Math.min(0.05, s.last ? (t - s.last) / 1000 : 0.016);
    s.last = t;
    let more = false;
    if (s.dragging) more = true;
    else if (s.target !== null) {
      const diff = s.target - s.rot;
      if (Math.abs(diff) < 0.04) { s.rot = s.target; s.target = null; } else { s.rot += diff * Math.min(1, dt * 7); more = true; }
    } else if (Math.abs(s.vel) > 12) {
      s.rot += s.vel * dt; s.vel *= Math.pow(0.04, dt); more = true;
      if (Math.abs(s.vel) <= 12) { s.vel = 0; s.target = Math.round(s.rot / step) * step; }
    } else if (s.spin) { s.rot += autoRotate * dt; more = true; }
    paint();
    if (more || s.spin) s.raf = requestAnimationFrame(loop);
    else s.last = 0;
  }, [autoRotate, paint, step]);

  useEffect(() => { tickRef.current = tick; });
  const kick = useCallback(() => { const s = st.current; if (!s.raf && live) { s.last = 0; s.raf = requestAnimationFrame(loop); } }, [loop, live]);

  useIsoLayoutEffect(() => { paint(); }, [paint]);
  useEffect(() => { st.current.spin = spinning; if (spinning || st.current.target !== null) kick(); }, [spinning, kick]);
  useEffect(() => { if (!live && st.current.raf) { cancelAnimationFrame(st.current.raf); st.current.raf = 0; } else if (live) kick(); }, [live, kick]);
  useEffect(() => () => { cancelAnimationFrame(st.current.raf); st.current.raf = 0; }, []);

  const select = (rot: number) => { const i = wrap(Math.round(-rot / step), n); st.current.front = i; setFront(i); cb.current?.(i); };
  const stepBy = (dir: number) => {
    const s = st.current;
    s.vel = 0;
    const base = s.target ?? Math.round(s.rot / step) * step;
    s.target = base - dir * step;
    select(s.target);
    if (reduced) { s.rot = s.target; s.target = null; paint(); } else kick();
  };
  const goHome = (end: boolean) => {
    const s = st.current;
    s.vel = 0;
    const want = -(end ? n - 1 : 0) * step;
    s.target = want + Math.round((s.rot - want) / 360) * 360;
    select(s.target);
    if (reduced) { s.rot = s.target; s.target = null; paint(); } else kick();
  };

  usePointerDrag(view, {
    axis: 'x',
    onStart: () => { const s = st.current; s.dragging = true; s.target = null; s.vel = 0; s.base = s.rot; kick(); },
    onMove: (_dx, _dy, ix) => { const s = st.current; s.rot += (ix / R) * 57.3; paint(); },
    onEnd: (vx) => {
      const s = st.current;
      s.dragging = false;
      if (reduced) { s.target = Math.round(s.rot / step) * step; s.rot = s.target; s.target = null; paint(); return; }
      s.vel = clamp((vx * 1000 / R) * 57.3, -420, 420);
      if (Math.abs(s.vel) <= 12) s.target = Math.round(s.rot / step) * step;
      kick();
    },
  });

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') stepBy(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') stepBy(-1);
    else if (e.key === 'Home') goHome(false);
    else if (e.key === 'End') goHome(true);
    else return;
    e.preventDefault();
    if ((e.target as Element).closest('.ui-circular-gallery-hit')) {
      const s = st.current;
      const t = wrap(Math.round(-(s.target ?? s.rot) / step), n);
      requestAnimationFrame(() => panels.current[t]?.querySelector('button')?.focus());
    }
  };

  const it = items[front];
  return (
    <section ref={root} className={`ui-circular-gallery-root ${className ?? ''}`} style={{ height: height ?? '100%', ...style }} aria-roledescription="carousel" aria-label={label} onKeyDown={onKey}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHot(true); }} onPointerLeave={() => setHot(false)}
      onFocus={() => setHot(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHot(false); }}>
      <div ref={view} className="ui-circular-gallery-view" style={{ '--w': `${pw}px`, '--h': `${ph}px` } as CSSProperties}>
        <div className="ui-circular-gallery-floor" aria-hidden="true" />
        <div ref={ring} className="ui-circular-gallery-ring">
          {items.map((x, i) => (
            <div key={itemKey(x, i)} ref={(el) => { panels.current[i] = el; }} className="ui-circular-gallery-panel" data-front={i === front ? '' : undefined} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${n}`}
              style={{ transform: `rotateY(${i * step}deg) translateZ(${R}px)` }}>
              <Artwork item={x} index={i} />
              <span className="ui-circular-gallery-shine" aria-hidden="true" />
              {i === front ? <button type="button" className="ui-circular-gallery-hit" tabIndex={0} aria-label={`${x.title}${x.subtitle ? ', ' + x.subtitle : ''}`} aria-current="true" onClick={() => { if (x.href) window.location.assign(x.href); }} /> : <span className="ui-circular-gallery-hit" aria-hidden="true" onClick={() => { const d = wrap(i - front + Math.floor(n / 2), n) - Math.floor(n / 2); stepBy(d); }} />}
            </div>
          ))}
        </div>
      </div>
      <div className="ui-circular-gallery-bar">
        <ArrowButton dir="prev" label="Previous panel" className="ui-circular-gallery-btn" onClick={() => stepBy(-1)} />
        <div className="ui-circular-gallery-cap" aria-live={spinning ? 'off' : 'polite'}><strong>{it?.title}</strong>{it?.subtitle ? <span>{it.subtitle}</span> : null}</div>
        <ArrowButton dir="next" label="Next panel" className="ui-circular-gallery-btn" onClick={() => stepBy(1)} />
        {auto ? <PlayPauseButton playing={!paused} onToggle={() => setPaused((p) => !p)} className="ui-circular-gallery-btn" /> : null}
      </div>
    </section>
  );
}

export function Demo() {
  return <CircularGallery label="Featured places" />;
}
