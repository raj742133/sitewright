'use client';
import type { CSSProperties } from 'react';
import { DemoShell, clamp, lum, mixc, rgba, useCanvasBg, type Frame } from './_bg-b-kit';

export interface FluxLinesProps {
  /** Field lines launched from every positive pole (default 18). */
  density?: number;
  /** Flow speed of the travelling dashes (default 1). */
  speed?: number;
  /** The pointer becomes a pole that bends the field (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}
interface Pole { x: number; y: number; q: number }

function poles(f: Frame, interactive: boolean): Pole[] {
  const { w, h, t } = f;
  const m = Math.min(w, h);
  const list: Pole[] = [
    { x: w * (0.3 + 0.05 * Math.sin(t * 0.21)), y: h * (0.4 + 0.12 * Math.sin(t * 0.33)), q: 1 },
    { x: w * (0.72 + 0.05 * Math.cos(t * 0.27)), y: h * (0.62 + 0.12 * Math.cos(t * 0.19)), q: 1 },
    { x: w * (0.52 + 0.2 * Math.sin(t * 0.23 + 1)), y: h * (0.5 + 0.28 * Math.cos(t * 0.31)), q: -1.6 },
  ];
  if (interactive) list.push({ x: f.px * w, y: f.py * h, q: -1.2 - f.hover * 1.2 });
  void m;
  return list;
}
function field(ps: Pole[], x: number, y: number, out: [number, number]) {
  let ex = 0, ey = 0;
  for (const p of ps) {
    const dx = x - p.x, dy = y - p.y, d2 = dx * dx + dy * dy + 40, inv = p.q / (d2 * Math.sqrt(d2));
    ex += dx * inv; ey += dy * inv;
  }
  const m = Math.hypot(ex, ey) || 1;
  out[0] = ex / m; out[1] = ey / m;
}

function draw(f: Frame, density: number, speed: number, interactive: boolean) {
  const { ctx, w, h, pal, t } = f;
  const dark = lum(pal.surface) < 0.5;
  ctx.clearRect(0, 0, w, h);
  const ps = poles(f, interactive);
  const step = clamp(Math.min(w, h) / 70, 4, 9);
  const maxSteps = Math.ceil((Math.hypot(w, h) * 1.1) / step);
  const dir: [number, number] = [0, 0];
  const n = clamp(Math.round(density), 4, 40);
  const col = mixc(pal.primary, pal.ink, dark ? 0 : 0.12);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let pi = 0; pi < ps.length; pi++) {
    const src = ps[pi]!;
    if (src.q < 0) continue;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + 0.3;
      let x = src.x + Math.cos(a) * 7, y = src.y + Math.sin(a) * 7;
      const pts: number[] = [x, y];
      for (let s = 0; s < maxSteps; s++) {
        field(ps, x, y, dir);
        x += dir[0] * step; y += dir[1] * step;
        pts.push(x, y);
        if (x < -20 || y < -20 || x > w + 20 || y > h + 20) break;
        let hit = false;
        for (const q of ps) if (q.q < 0 && Math.hypot(x - q.x, y - q.y) < 8) hit = true;
        if (hit) break;
      }
      const grad = ctx.createLinearGradient(pts[0]!, pts[1]!, pts[pts.length - 2]!, pts[pts.length - 1]!);
      grad.addColorStop(0, rgba(col, 0.55)); grad.addColorStop(1, rgba(mixc(col, pal.signal, 0.7), 0.4));
      ctx.beginPath(); ctx.moveTo(pts[0]!, pts[1]!);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
      ctx.setLineDash([]); ctx.strokeStyle = grad; ctx.lineWidth = 1; ctx.stroke();
      // travelling pulse
      ctx.setLineDash([3, 22 + (k % 3) * 8]); ctx.lineDashOffset = -(t * 26 * speed + k * 7);
      ctx.strokeStyle = rgba(pal.signal, 0.9); ctx.lineWidth = 2; ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  // poles
  for (const p of ps) {
    const c = p.q > 0 ? pal.primary : pal.signal;
    const r = p.q > 0 ? 22 : 18;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, rgba(c, 0.55)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    ctx.fillStyle = rgba(mixc(c, pal.ink, dark ? 0 : 0.25), 1);
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * Magnetic field lines traced between moving poles: thin lines leave each positive pole and curve into the
 * negative ones, with pulses flowing along them. The pointer (listened on the parent) acts as a pole; on
 * touch a pole wanders on its own. Fills its parent (first child of a `position:relative` section).
 * Decorative (aria-hidden); still frame with reduced motion.
 */
export default function FluxLines({ density = 18, speed = 1, interactive = true, className, style }: FluxLinesProps) {
  const { wrapRef, canvasRef, status } = useCanvasBg((f) => draw(f, density, speed, interactive), { fps: 40, pointer: interactive });
  return (
    <div ref={wrapRef} className={'ui-flux-lines' + (className ? ' ' + className : '')} style={style} data-state={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-flux-lines-canvas" />
    </div>
  );
}

export function Demo() {
  return <DemoShell bg={<FluxLines />} title="Field lines" sub="Your pointer is a pole: bend the flow." align="start" />;
}
