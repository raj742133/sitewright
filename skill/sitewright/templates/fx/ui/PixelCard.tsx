'use client';
import { useCallback, useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { clampDpr, readPalette, rgba, mix, watchPalette, watchLive, type Palette, type RGB } from './_t2';
import { useReducedMotion } from './_t2';

export interface PixelCardProps {
  children?: ReactNode;
  /** Pixel cell size in px. */
  pixel?: number;
  /** Seconds a full reveal takes. */
  duration?: number;
  /** Explicit CSS colours for the pixels (default: theme primary / signal blends). */
  colors?: string[];
  /** Keep the pixels showing (controlled by the parent). */
  active?: boolean;
  className?: string;
  style?: CSSProperties;
}

const hash = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** A card covered by a field of tiny squares. Hover, focus or a tap makes them bloom outward from the entry point and shimmer; leaving folds them back. Reduced motion shows the same pattern without movement. */
export default function PixelCard({ children, pixel = 8, duration = 0.9, colors, active, className, style }: PixelCardProps) {
  const root = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const S = useRef({ t: 0, target: 0, ox: 0.5, oy: 0.5, w: 0, h: 0, dpr: 1, raf: 0, live: true, last: 0, pal: null as Palette | null, reduced: false, tap: 0 });
  const optsRef = useRef({ pixel, duration, colors });
  optsRef.current = { pixel, duration, colors };
  S.current.reduced = reduced;

  const draw = useCallback((now: number) => {
    const s = S.current;
    const c = cv.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx || !s.w || !s.h) return;
    const { pixel: px, colors: cols } = optsRef.current;
    const pal = s.pal;
    const list: (string | RGB)[] = cols?.length ? cols : pal ? [pal.primary, mix(pal.primary, pal.signal, 0.5), pal.signal, pal.primary] : [[37, 99, 235]];
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    ctx.clearRect(0, 0, s.w, s.h);
    const cx = s.ox * s.w, cy = s.oy * s.h;
    const maxD = Math.hypot(Math.max(cx, s.w - cx), Math.max(cy, s.h - cy)) || 1;
    const nx = Math.ceil(s.w / px), ny = Math.ceil(s.h / px);
    const time = s.reduced ? 0 : now / 1000;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const hv = hash(i, j);
      const x = i * px, y = j * px;
      const d = Math.hypot(x + px / 2 - cx, y + px / 2 - cy) / maxD;
      const th = d * 0.7 + hv * 0.3;
      const k = Math.max(0, Math.min(1, (s.t - th) / 0.25));
      // resting texture: a quiet scatter in the bottom-right corner
      const corner = Math.max(0, 1 - Math.hypot(1 - (x + px / 2) / s.w, 1 - (y + px / 2) / s.h) * 2.2);
      const rest = hv < corner * 0.55 ? 0.1 + corner * 0.12 : 0;
      const centre = Math.hypot((x + px / 2) / s.w - 0.5, (y + px / 2) / s.h - 0.5) * 1.6;
      const base = (0.16 + Math.min(1, centre) * 0.42);
      const tw = s.reduced ? 1 : 0.7 + 0.3 * Math.sin(time * (1.6 + hv * 2.4) + hv * 40);
      const a = Math.max(rest * (1 - k), k * base * tw);
      if (a < 0.01) continue;
      const sz = px - 1;
      const sc = k > 0 ? 0.35 + 0.65 * k : 1;
      const col = list[Math.floor(hash(j, i) * list.length) % list.length] ?? list[0];
      ctx.fillStyle = typeof col === 'string' ? col : rgba(col as RGB, 1);
      ctx.globalAlpha = Math.min(1, a);
      const o = (sz - sz * sc) / 2;
      ctx.fillRect(x + o, y + o, sz * sc, sz * sc);
    }
    ctx.globalAlpha = 1;
  }, []);

  const tick = useCallback((now: number) => {
    const s = S.current;
    s.raf = 0;
    const dt = s.last ? Math.min(0.05, (now - s.last) / 1000) : 0.016;
    s.last = now;
    const dur = Math.max(0.1, optsRef.current.duration);
    if (s.reduced) s.t = s.target;
    else s.t += Math.sign(s.target - s.t) * Math.min(Math.abs(s.target - s.t), (dt / dur) * 1.45);
    draw(now);
    const moving = s.t !== s.target;
    const shimmer = s.target > 0 && !s.reduced;
    if (s.live && (moving || shimmer)) s.raf = requestAnimationFrame(tick);
    else s.last = 0;
  }, [draw]);
  const kick = useCallback(() => { const s = S.current; if (!s.raf && s.live) s.raf = requestAnimationFrame(tick); }, [tick]);

  const aim = (on: boolean, nx?: number, ny?: number) => {
    const s = S.current;
    if (on && nx !== undefined && ny !== undefined) { s.ox = nx; s.oy = ny; }
    s.target = on ? 1.35 : 0;
    kick();
  };

  useEffect(() => {
    const el = root.current, c = cv.current;
    if (!el || !c) return;
    const s = S.current;
    const resize = () => {
      s.dpr = clampDpr();
      const r = el.getBoundingClientRect();
      s.w = r.width; s.h = r.height;
      c.width = Math.max(1, Math.round(r.width * s.dpr)); c.height = Math.max(1, Math.round(r.height * s.dpr));
      draw(performance.now());
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const offPal = watchPalette(el, (p) => { s.pal = p; draw(performance.now()); });
    const offLive = watchLive(el, (v) => { s.live = v; if (v) kick(); });
    resize();
    return () => { ro.disconnect(); offPal(); offLive(); if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0; window.clearTimeout(s.tap); };
  }, [draw, kick]);
  useEffect(() => { aim(!!active); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { kick(); }, [reduced, kick]);

  const rel = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) / (r.width || 1), (e.clientY - r.top) / (r.height || 1)] as const;
  };
  return (
    <div ref={root} className={`ui-pixel-card-root ${className ?? ''}`} style={style} tabIndex={0}
      onPointerEnter={(e) => { const [x, y] = rel(e); if (e.pointerType === 'touch') { aim(true, x, y); window.clearTimeout(S.current.tap); S.current.tap = window.setTimeout(() => aim(!!active), 1600); } else aim(true, x, y); }}
      onPointerLeave={(e) => { if (e.pointerType !== 'touch') aim(!!active); }}
      onFocus={() => aim(true, 0.5, 0.5)} onBlur={() => aim(!!active)}>
      <canvas ref={cv} className="ui-pixel-card-canvas" aria-hidden="true" />
      <div className="ui-pixel-card-body">{children}</div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-pixel-card-demo">
      <PixelCard>
        <span className="ui-pixel-card-kicker">Release 2.4</span>
        <strong className="ui-pixel-card-title">Pixel-perfect updates</strong>
        <p className="ui-pixel-card-text">Hover, focus or tap to wake the grid.</p>
      </PixelCard>
    </div>
  );
}
