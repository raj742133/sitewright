'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useReducedMotion } from './_t2';
import { Artwork, DEMO_ITEMS, clamp, wrap, type GalleryItem } from './_galleries-data';
import { ArrowButton, PlayPauseButton } from './_galleries-ui';
import { useIsoLayoutEffect, useLive, usePointerDrag, useSize } from './_galleries-hooks';

export interface DomeGalleryProps {
  /** Pictures; they repeat to cover the dome. */
  items?: GalleryItem[];
  /** Rows of tiles from the horizon upward. Default 4. */
  rows?: number;
  /** Degrees per second of the idle drift around the dome; 0 turns it off. Pauses on hover and focus, never runs under reduced motion. Default 4. */
  drift?: number;
  label?: string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

interface Tile { r: number; c: number; yaw: number; lat: number; item: number }

/** A gallery on the inside of a dome: you stand at the centre and look around. Drag to look (with inertia), arrow keys move the selection tile to tile, click a tile to bring it to the centre. */
export default function DomeGallery({ items = DEMO_ITEMS, rows = 4, drift = 4, label = 'Dome gallery', height, className, style }: DomeGalleryProps) {
  const n = items.length;
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const live = useLive(root);
  const size = useSize(view);
  const [sel, setSel] = useState<[number, number]>([0, 0]);
  const [paused, setPaused] = useState(false);
  const [hot, setHot] = useState(false);
  const auto = drift > 0 && !reduced;
  const spinning = auto && !paused && !hot && live;

  const tw = clamp((size.w || 600) * 0.15, 54, 136);
  const th = tw * 1.2;
  const R = tw * 3.7;
  const dLat = ((th * 1.1) / R) * 57.2958;
  const grid = useMemo(() => {
    const out: Tile[][] = [];
    for (let r = 0; r < rows; r++) {
      const lat = r * dLat;
      const count = Math.max(6, Math.floor((2 * Math.PI * R * Math.cos((lat * Math.PI) / 180)) / (tw * 1.1)));
      out.push(Array.from({ length: count }, (_, c) => ({ r, c, yaw: (c * 360) / count, lat, item: wrap(c + r * 5, n) })));
    }
    return out;
  }, [rows, dLat, R, tw, n]);
  const maxPitch = (rows - 1) * dLat + 6;

  const st = useRef({ yaw: 0, pitch: dLat * 0.7, vy: 0, vp: 0, ty: null as number | null, tp: null as number | null, dragging: false, raf: 0, last: 0, spin: false });
  const paint = useCallback(() => {
    const s = st.current;
    if (world.current) world.current.style.transform = `translateZ(${R}px) rotateX(${s.pitch.toFixed(2)}deg) rotateY(${s.yaw.toFixed(2)}deg)`;
  }, [R]);

  const tick = useCallback((t: number) => {
    const s = st.current;
    s.raf = 0;
    const dt = Math.min(0.05, s.last ? (t - s.last) / 1000 : 0.016);
    s.last = t;
    let more = false;
    if (s.dragging) more = true;
    else if (s.ty !== null && s.tp !== null) {
      const k = Math.min(1, dt * 6);
      s.yaw += (s.ty - s.yaw) * k; s.pitch += (s.tp - s.pitch) * k;
      if (Math.abs(s.ty - s.yaw) < 0.03 && Math.abs(s.tp - s.pitch) < 0.03) { s.yaw = s.ty; s.pitch = s.tp; s.ty = s.tp = null; } else more = true;
    } else if (Math.abs(s.vy) > 3 || Math.abs(s.vp) > 3) {
      s.yaw += s.vy * dt; s.pitch = clamp(s.pitch + s.vp * dt, -6, maxPitch);
      const f = Math.pow(0.06, dt); s.vy *= f; s.vp *= f; more = true;
    } else if (s.spin) { s.yaw -= drift * dt; more = true; }
    paint();
    if (more || s.spin) s.raf = requestAnimationFrame(tick);
    else s.last = 0;
  }, [drift, maxPitch, paint]);
  const kick = useCallback(() => { const s = st.current; if (!s.raf && live) { s.last = 0; s.raf = requestAnimationFrame(tick); } }, [tick, live]);

  useIsoLayoutEffect(() => { paint(); }, [paint]);
  useEffect(() => { st.current.spin = spinning; if (spinning) kick(); }, [spinning, kick]);
  useEffect(() => { if (!live && st.current.raf) { cancelAnimationFrame(st.current.raf); st.current.raf = 0; } else if (live) kick(); }, [live, kick]);
  useEffect(() => () => cancelAnimationFrame(st.current.raf), []);

  const look = (t: Tile) => {
    const s = st.current;
    const ty = -t.yaw + Math.round((s.yaw + t.yaw) / 360) * 360;
    s.vy = s.vp = 0;
    if (reduced) { s.yaw = ty; s.pitch = t.lat; paint(); } else { s.ty = ty; s.tp = t.lat; kick(); }
  };
  const select = (r: number, c: number, focus = false) => {
    const row = grid[clamp(r, 0, grid.length - 1)]!;
    const tile = row[wrap(c, row.length)]!;
    setSel([tile.r, tile.c]);
    look(tile);
    if (focus) requestAnimationFrame(() => view.current?.querySelector<HTMLElement>(`[data-rc="${tile.r}-${tile.c}"] button`)?.focus());
  };

  usePointerDrag(view, {
    onStart: () => { const s = st.current; s.dragging = true; s.ty = s.tp = null; s.vy = s.vp = 0; kick(); },
    onMove: (_dx, _dy, ix, iy) => { const s = st.current; s.yaw -= (ix / R) * 57.3; s.pitch = clamp(s.pitch + (iy / R) * 57.3, -6, maxPitch); paint(); },
    onEnd: (vx, vy) => {
      const s = st.current;
      s.dragging = false;
      if (!reduced) { s.vy = clamp(-(vx * 1000 / R) * 57.3, -300, 300); s.vp = clamp((vy * 1000 / R) * 57.3, -200, 200); }
      kick();
    },
  });

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const [r, c] = sel;
    const focus = (e.target as Element).closest('.ui-dome-gallery-hit') !== null;
    const row = grid[r]!;
    const colFor = (nr: number) => { const to = grid[nr]!; return Math.round((row[c]!.yaw / 360) * to.length); };
    if (e.key === 'ArrowRight') select(r, c + 1, focus);
    else if (e.key === 'ArrowLeft') select(r, c - 1, focus);
    else if (e.key === 'ArrowUp') select(Math.min(grid.length - 1, r + 1), colFor(Math.min(grid.length - 1, r + 1)), focus);
    else if (e.key === 'ArrowDown') select(Math.max(0, r - 1), colFor(Math.max(0, r - 1)), focus);
    else if (e.key === 'Home') select(r, 0, focus);
    else if (e.key === 'End') select(r, row.length - 1, focus);
    else return;
    e.preventDefault();
  };

  const active = grid[sel[0]]?.[sel[1]];
  const it = items[active?.item ?? 0];
  return (
    <section ref={root} className={`ui-dome-gallery-root ${className ?? ''}`} style={{ height: height ?? '100%', ...style }} aria-roledescription="gallery" aria-label={label} onKeyDown={onKey}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHot(true); }} onPointerLeave={() => setHot(false)}
      onFocus={() => setHot(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHot(false); }}>
      <div ref={view} className="ui-dome-gallery-view" style={{ perspective: `${R}px`, '--w': `${tw}px`, '--h': `${th}px` } as CSSProperties}>
        <div ref={world} className="ui-dome-gallery-world">
          {grid.map((row) => row.map((t) => {
            const x = items[t.item]!;
            const on = sel[0] === t.r && sel[1] === t.c;
            return (
              <div key={`${t.r}-${t.c}`} className="ui-dome-gallery-tile" data-rc={`${t.r}-${t.c}`} data-on={on ? '' : undefined} style={{ transform: `rotateY(${t.yaw}deg) rotateX(${-t.lat}deg) translateZ(${-R}px)` }}>
                <Artwork item={x} index={t.item} />
                <button type="button" className="ui-dome-gallery-hit" tabIndex={on ? 0 : -1} aria-label={`${x.title}${x.subtitle ? ', ' + x.subtitle : ''}`} aria-current={on ? 'true' : undefined} onClick={() => select(t.r, t.c)} />
              </div>
            );
          }))}
        </div>
        <div className="ui-dome-gallery-vignette" aria-hidden="true" />
      </div>
      <div className="ui-dome-gallery-bar">
        <ArrowButton dir="prev" label="Previous tile" className="ui-dome-gallery-btn" onClick={() => select(sel[0], sel[1] - 1)} />
        <div className="ui-dome-gallery-cap" aria-live="polite"><strong>{it?.title}</strong><span>{it?.subtitle}</span></div>
        <ArrowButton dir="next" label="Next tile" className="ui-dome-gallery-btn" onClick={() => select(sel[0], sel[1] + 1)} />
        {auto ? <PlayPauseButton playing={!paused} onToggle={() => setPaused((p) => !p)} className="ui-dome-gallery-btn" /> : null}
      </div>
    </section>
  );
}

export function Demo() {
  return <DomeGallery label="Featured places" />;
}
