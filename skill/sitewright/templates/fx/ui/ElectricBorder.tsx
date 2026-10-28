'use client';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { mix, noise2, rgba, useCanvas2D, type Frame } from './_motion-gl-2d';

export interface ElectricBorderProps {
  children?: ReactNode;
  /** Any CSS colour for the arc; defaults to the host `--primary` token. */
  color?: string;
  /** Corner radius in px of both the box and the arc (default 16). */
  radius?: number;
  /** Arc speed multiplier; 0 freezes it (default 1). */
  speed?: number;
  /** How far the arc strays from the edge, 0..2 (default 1). */
  chaos?: number;
  /** Core line width in px (default 2). */
  thickness?: number;
  className?: string;
  style?: CSSProperties;
}

const PAD = 28;
interface Pt { x: number; y: number; nx: number; ny: number }

/** Points of a rounded rectangle outline, evenly spaced, with outward normals. */
function outline(w: number, h: number, rr: number, step: number): Pt[] {
  const r = Math.max(0, Math.min(rr, w / 2, h / 2));
  const pts: Pt[] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i < n; i++) pts.push({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n, nx, ny });
  };
  const arc = (cx: number, cy: number, a0: number) => {
    const n = Math.max(2, Math.ceil((r * Math.PI) / 2 / step));
    for (let i = 0; i < n; i++) { const a = a0 + (Math.PI / 2) * (i / n); pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) }); }
  };
  edge(r, 0, w - r, 0, 0, -1);
  arc(w - r, r, -Math.PI / 2);
  edge(w, r, w, h - r, 1, 0);
  arc(w - r, h - r, 0);
  edge(w - r, h, r, h, 0, 1);
  arc(r, h - r, Math.PI / 2);
  edge(0, h - r, 0, r, -1, 0);
  arc(r, r, Math.PI);
  return pts;
}

/**
 * Wraps content in a crackling electric arc that runs around its edge. Canvas 2D (no WebGL);
 * the arc is decorative (aria-hidden) and never takes pointer events. Freezes to one still frame
 * with reduced motion.
 */
export default function ElectricBorder({ children, color, radius = 16, speed = 1, chaos = 1, thickness = 2, className, style }: ElectricBorderProps) {
  const cache = useRef<{ key: string; pts: Pt[] } | null>(null);
  const { wrapRef, canvasRef, redraw } = useCanvas2D((f: Frame) => {
    const { ctx, w, h, t, pal } = f;
    const key = w + 'x' + h + 'r' + radius;
    if (!cache.current || cache.current.key !== key) cache.current = { key, pts: outline(w, h, radius, 4) };
    const pts = cache.current.pts;
    const n = pts.length;
    if (n < 4) return;
    const base = color ?? rgba(pal.primary, 1);
    const hot = color ? '#ffffff' : rgba(mix(pal.primary, [255, 255, 255], 0.72), 1);
    const R = Math.max(2, (2 * (w + h)) / (2 * Math.PI * 26));
    const amp = (3 + 5 * Math.min(2, Math.max(0, chaos))) ;
    const tt = t * speed;
    const stroke = (seed: number, lw: number, alpha: number, col: string, amount: number) => {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const p = pts[i % n]!;
        const th = ((i % n) / n) * Math.PI * 2;
        const cx = Math.cos(th) * R, cy = Math.sin(th) * R;
        const d = (noise2(cx * 1.0 + seed * 13, cy + tt * 2.1, seed) * 0.75 + noise2(cx * 3.1 - seed * 5, cy * 3.1 + tt * 5.3, seed + 4) * 0.35) * amp * amount;
        const x = p.x + p.nx * d, y = p.y + p.ny * d;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.stroke();
    };
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // faint steady rim so the box always reads as framed
    ctx.beginPath();
    pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.closePath();
    ctx.globalAlpha = 0.22; ctx.strokeStyle = base; ctx.lineWidth = 1; ctx.stroke();
    stroke(1, thickness * 7, 0.07, base, 1);
    stroke(1, thickness * 3.2, 0.2, base, 1);
    stroke(2, thickness * 1.2, 0.5, base, 0.8);
    stroke(1, thickness, 0.95, base, 1);
    stroke(1, Math.max(1, thickness * 0.45), 0.85, hot, 1);
    ctx.globalAlpha = 1;
  }, { pad: PAD });
  useEffect(() => { redraw(); }, [color, radius, speed, chaos, thickness, redraw]);
  return (
    <div ref={wrapRef} className={'ui-electric-border' + (className ? ' ' + className : '')} style={{ borderRadius: radius, ...style }}>
      <canvas ref={canvasRef} className="ui-electric-border-canvas" aria-hidden="true" style={{ inset: -PAD }} />
      <div className="ui-electric-border-body" style={{ borderRadius: radius }}>{children}</div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-electric-border-stage">
      <ElectricBorder radius={18}>
        <div className="ui-electric-border-card">
          <span className="ui-electric-border-kicker">Live circuit</span>
          <strong className="ui-electric-border-title">Charged edge</strong>
          <span className="ui-electric-border-text">An arc that never sits still.</span>
        </div>
      </ElectricBorder>
    </div>
  );
}
