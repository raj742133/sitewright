'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { useReducedMotion, watchLive } from './_t2';

export interface ImageRibbonProps {
  /** Number of artwork panels around the ribbon (default 10, 4 to 16). */
  panels?: number;
  /** Turns the spiral makes (default 1.25); 1 is a flat cylinder band, more climbs higher. */
  turns?: number;
  /** Degrees per second the ribbon orbits on its own (default 14). 0 disables it. */
  speed?: number;
  /** Accessible name. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const SLICES = 7;
const ART = ['sunrise', 'dunes', 'rings', 'stripes', 'tide', 'grid', 'peaks', 'dots', 'arch', 'bloom'];

/** A spiral ribbon of curved artwork panels orbiting in CSS 3D. Each panel is built from narrow slices so it bends around the cylinder. Drag or use the arrow keys to turn it; the pause button stops the orbit. Reduced motion stops it for good. */
export default function ImageRibbon({ panels = 10, turns = 1.25, speed = 14, label = 'Rotating ribbon of artwork', className, style }: ImageRibbonProps) {
  const root = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(true);
  const n = Math.max(4, Math.min(16, Math.round(panels)));
  const st = useRef({ a: -20, target: -20, vel: 0, drag: false, lastX: 0, raf: 0, live: true, last: 0 });
  const cfg = useRef({ run: false, speed, reduced });
  cfg.current = { run: playing && !reduced && speed !== 0, speed, reduced };

  const slices = useMemo(() => {
    const out: { key: string; th: number; y: number; k: number; p: number }[] = [];
    const span = 360 * turns, step = span / n, used = step * 0.94;
    for (let p = 0; p < n; p++) for (let k = 0; k < SLICES; k++) {
      const th = p * step + ((k + 0.5) / SLICES) * used;
      out.push({ key: `${p}-${k}`, th, y: (p + 0.5) / n - 0.5, k, p });
    }
    return { list: out, span, step, used };
  }, [n, turns]);

  const loop = useRef<(t: number) => void>(() => {});
  loop.current = (now: number) => {
    const s = st.current;
    s.raf = 0;
    const dt = Math.min(0.05, s.last ? (now - s.last) / 1000 : 0);
    s.last = now;
    const c = cfg.current;
    if (!s.drag) {
      if (c.reduced) { s.a = s.target; s.vel = 0; }
      else {
        if (c.run) s.target += c.speed * dt;
        s.target += s.vel * dt; s.vel *= Math.pow(0.04, dt);
        if (Math.abs(s.vel) < 0.05) s.vel = 0;
        s.a += (s.target - s.a) * Math.min(1, dt * 7);
      }
    }
    if (ring.current) ring.current.style.setProperty('--image-ribbon-a', s.a.toFixed(2) + 'deg');
    const busy = c.run || s.drag || s.vel !== 0 || Math.abs(s.target - s.a) > 0.05;
    if (s.live && busy) s.raf = requestAnimationFrame((x) => loop.current(x));
    else s.last = 0;
  };
  const kick = () => { const s = st.current; if (!s.raf) { s.last = 0; s.raf = requestAnimationFrame((x) => loop.current(x)); } };

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const size = () => {
      const r = el.getBoundingClientRect();
      const R = Math.max(40, Math.min(r.width * 0.24, r.height * 0.36));
      const arc = (2 * Math.PI * R * (slices.used / 360));
      const ph = Math.min(r.height * 0.21, R * 0.75);
      const w = (2 * Math.PI * R * (slices.used / SLICES / 360)) + 1.2;
      el.style.setProperty('--image-ribbon-r', R.toFixed(1) + 'px');
      el.style.setProperty('--image-ribbon-h', ph.toFixed(1) + 'px');
      el.style.setProperty('--image-ribbon-w', w.toFixed(2) + 'px');
      el.style.setProperty('--image-ribbon-rise', (turns * ph * 1.1).toFixed(1) + 'px');
      void arc;
      kick();
    };
    const ro = new ResizeObserver(size);
    ro.observe(el);
    size();
    const off = watchLive(el, (l) => { st.current.live = l; if (l) kick(); });
    const s = st.current;
    return () => { ro.disconnect(); off(); if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slices, turns]);
  useEffect(() => { kick(); }, [playing, reduced, speed]);

  const turn = (deg: number) => { const s = st.current; s.target += deg; kick(); };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') turn(-slices.step); else if (e.key === 'ArrowRight') turn(slices.step);
    else if (e.key === ' ' && e.target === e.currentTarget) setPlaying((p) => !p); else return;
    e.preventDefault();
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const s = st.current; s.drag = true; s.lastX = e.clientX; s.vel = 0;
    e.currentTarget.setPointerCapture(e.pointerId); kick();
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current; if (!s.drag) return;
    const d = (e.clientX - s.lastX) * 0.45; s.lastX = e.clientX;
    s.a += d; s.target = s.a; s.vel = d * 40;
  };
  const up = () => { st.current.drag = false; kick(); };

  return (
    <div ref={root} className={`ui-image-ribbon-root ${className ?? ''}`} style={style} role="group" aria-roledescription="rotating ribbon" aria-label={`${label}. Drag or use the left and right arrow keys to turn it.`} tabIndex={0}
      onKeyDown={onKey} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div className="ui-image-ribbon-scene" aria-hidden="true">
        <div ref={ring} className="ui-image-ribbon-ring">
          {slices.list.map((s) => (
            <div key={s.key} className="ui-image-ribbon-slice" style={{ ['--image-ribbon-th' as string]: s.th.toFixed(2), ['--image-ribbon-y' as string]: s.y.toFixed(4) } as CSSProperties}>
              <div className={`ui-image-ribbon-art ui-image-ribbon-art-${ART[s.p % ART.length]}`} style={{ ['--image-ribbon-k' as string]: s.k, ['--image-ribbon-m' as string]: `${(s.p * 37) % 100}%` } as CSSProperties} />
            </div>
          ))}
        </div>
      </div>
      <button type="button" className="ui-image-ribbon-toggle" aria-pressed={!playing || reduced} aria-label={playing && !reduced ? 'Pause rotation' : 'Resume rotation'} disabled={reduced} onClick={() => setPlaying((p) => !p)}>
        {playing && !reduced ? <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="3.5" y="3" width="3" height="10" rx="1" fill="currentColor" /><rect x="9.5" y="3" width="3" height="10" rx="1" fill="currentColor" /></svg>
          : <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4.5 3l8 5-8 5z" fill="currentColor" /></svg>}
      </button>
    </div>
  );
}

export function Demo() {
  return <ImageRibbon />;
}
