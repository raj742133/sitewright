'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { useReducedMotion } from './_t2';
import { Artwork, DEMO_ITEMS, clamp, wrap, type GalleryItem } from './_galleries-data';
import { ArrowButton, PlayPauseButton } from './_galleries-ui';
import { useIsoLayoutEffect, useLive, useSize } from './_galleries-hooks';

export interface FlyingPostersProps {
  /** Posters; they repeat to fill the tunnel (about 12 are on screen). */
  items?: GalleryItem[];
  /** Starting speed step, 0 to 3. Default 1. */
  speed?: 0 | 1 | 2 | 3;
  label?: string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

const SPEEDS = [0.5, 1, 1.9, 3.4];
const BASE = 0.045;

/** Posters fly out of the distance toward the viewer through a 3D tunnel. The mouse (or a finger, or the left/right keys) steers the view; hovering a poster freezes the tunnel; up/down keys or the buttons change speed. Under reduced motion it holds still and the buttons step the posters instead. */
export default function FlyingPosters({ items = DEMO_ITEMS, speed = 1, label = 'Posters flying toward you', height, className, style }: FlyingPostersProps) {
  const n = items.length;
  const count = clamp(Math.max(n, 10), 10, 16);
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const live = useLive(root);
  const size = useSize(view);
  const [level, setLevel] = useState<number>(speed);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [near, setNear] = useState(0);
  const run = !reduced && !paused && hover === null && !focused && live && level >= 0;

  const st = useRef({ t: 0.37, cx: 0, cy: 0, tx: 0, ty: 0, raf: 0, last: 0, run: false, level, near: -1, w: 600, h: 300, pointer: false });
  useEffect(() => { st.current.level = level; });
  const pw = clamp(Math.min(size.w, size.h * 1.35) * 0.3, 70, 240);
  const ph = pw * 1.32;

  const paint = useCallback(() => {
    const s = st.current;
    const w = s.w, h = s.h;
    let bestZ = -1, best = 0;
    for (let i = 0; i < count; i++) {
      const el = els.current[i];
      if (!el) continue;
      const a = i * 2.399963;
      const r = 0.34 + 0.66 * ((i * 0.618034) % 1);
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.82;
      const z = (((i / count + s.t) % 1) + 1) % 1;
      const p = Math.pow(z, 2.1);
      const f = 0.06 + p * 1.55;
      const sc = 0.1 + p * 1.1;
      const px = w / 2 + (x * f - s.cx * 0.22 * p) * (w * 0.5);
      const py = h / 2 + (y * f - s.cy * 0.22 * p) * (h * 0.62);
      const tilt = (((i * 37) % 11) - 5) * 1.6 * (1 - p * 0.6);
      const o = Math.min(1, z / 0.12) * Math.min(1, (1 - z) / 0.1);
      el.style.opacity = o.toFixed(3);
      el.style.zIndex = String(Math.round(z * 1000));
      el.style.transform = `translate3d(${(px - pw / 2).toFixed(1)}px, ${(py - ph / 2).toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      if (z < 0.85 && z > bestZ) { bestZ = z; best = i; }
    }
    if (best !== s.near) { s.near = best; setNear(best); }
  }, [count, pw, ph]);

  const tick = useCallback((now: number) => {
    const s = st.current;
    s.raf = 0;
    const dt = Math.min(0.05, s.last ? (now - s.last) / 1000 : 0.016);
    s.last = now;
    if (s.run) {
      s.t += BASE * (SPEEDS[s.level] ?? 1) * dt;
      if (!s.pointer) s.tx = Math.sin(now / 2600) * 0.35;
    }
    s.cx += (s.tx - s.cx) * Math.min(1, dt * 4);
    s.cy += (s.ty - s.cy) * Math.min(1, dt * 4);
    paint();
    const settled = Math.abs(s.tx - s.cx) < 0.002 && Math.abs(s.ty - s.cy) < 0.002;
    if (s.run || !settled) s.raf = requestAnimationFrame(tick); else s.last = 0;
  }, [paint]);
  const kick = useCallback(() => { const s = st.current; if (!s.raf && live && !reduced) { s.last = 0; s.raf = requestAnimationFrame(tick); } }, [tick, live, reduced]);

  useIsoLayoutEffect(() => { st.current.w = size.w || 600; st.current.h = size.h || 300; paint(); view.current?.setAttribute('data-ready', ''); }, [paint, size.w, size.h]);
  useEffect(() => { st.current.run = run; if (run) kick(); }, [run, kick]);
  useEffect(() => { if (!live && st.current.raf) { cancelAnimationFrame(st.current.raf); st.current.raf = 0; } }, [live]);
  useEffect(() => () => cancelAnimationFrame(st.current.raf), []);

  const steer = (nx: number, ny: number) => { const s = st.current; s.pointer = true; s.tx = clamp(nx, -1, 1); s.ty = clamp(ny, -1, 1); if (reduced) { s.cx = s.tx; s.cy = s.ty; paint(); } else kick(); };
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (!view.current) return;
    const r = view.current.getBoundingClientRect();
    steer(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onLeave = () => { const s = st.current; s.pointer = false; s.tx = 0; s.ty = 0; setHover(null); if (reduced) { s.cx = 0; s.cy = 0; paint(); } else kick(); };
  const nudge = (d: number) => {
    if (reduced) { st.current.t = (st.current.t + d * 0.07 + 1) % 1; paint(); }
    else setLevel((l) => clamp(l + d, 0, SPEEDS.length - 1));
  };
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const s = st.current;
    if (e.key === 'ArrowUp') nudge(1);
    else if (e.key === 'ArrowDown') nudge(-1);
    else if (e.key === 'ArrowLeft') steer(s.tx - 0.5, s.ty);
    else if (e.key === 'ArrowRight') steer(s.tx + 0.5, s.ty);
    else if (e.key === 'Home') steer(0, 0);
    else if (e.key === ' ' && e.target === view.current && !reduced) setPaused((p) => !p);
    else return;
    e.preventDefault();
  };

  const shown = items[wrap(hover ?? near, count) % n];
  return (
    <section ref={root} className={`ui-flying-posters-root ${className ?? ''}`} style={{ height: height ?? '100%', ...style }} aria-label={label} onPointerMove={onMove} onPointerLeave={onLeave} onKeyDown={onKey}
      onFocus={() => setFocused(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}>
      <div ref={view} className="ui-flying-posters-view" style={{ '--w': `${pw}px`, '--h': `${ph}px` } as CSSProperties} tabIndex={0} role="group"
        aria-label={`${label}. Up and down arrows change speed, left and right arrows steer, space pauses.`}>
        <div className="ui-flying-posters-glow" aria-hidden="true" />
        {Array.from({ length: count }, (_, i) => {
          const it = items[i % n]!;
          return (
            <div key={i} ref={(el) => { els.current[i] = el; }} className="ui-flying-posters-poster" data-hover={hover === i ? '' : undefined} aria-hidden="true" onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(i); }} onPointerLeave={() => setHover(null)}
              onClick={() => { if (it.href) window.location.assign(it.href); }}>
              <Artwork item={it} index={i % n} />
              <span className="ui-flying-posters-name">{it.title}</span>
            </div>
          );
        })}
      </div>
      <ul className="ui-flying-posters-sr">{items.map((it, i) => <li key={i}>{it.href ? <a href={it.href}>{it.title}</a> : it.title}{it.subtitle ? `, ${it.subtitle}` : ''}</li>)}</ul>
      <div className="ui-flying-posters-bar">
        <ArrowButton dir="down" label={reduced ? 'Step posters back' : 'Slower'} className="ui-flying-posters-btn" onClick={() => nudge(-1)} disabled={!reduced && level <= 0} />
        <div className="ui-flying-posters-cap" aria-hidden="true"><strong>{shown?.title}</strong>{reduced ? null : <span>{SPEEDS[level]}x speed</span>}</div>
        <ArrowButton dir="up" label={reduced ? 'Step posters forward' : 'Faster'} className="ui-flying-posters-btn" onClick={() => nudge(1)} disabled={!reduced && level >= SPEEDS.length - 1} />
        {reduced ? null : <PlayPauseButton playing={!paused} onToggle={() => setPaused((p) => !p)} className="ui-flying-posters-btn" />}
      </div>
    </section>
  );
}

export function Demo() {
  return <FlyingPosters label="Featured places" />;
}
