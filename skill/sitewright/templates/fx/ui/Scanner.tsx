'use client';
import type { CSSProperties } from 'react';
import { BgDemo, clamp01, mixc, rgba, type Sketch } from './_bg-a';
import { Canvas2DBg, hash2, mod } from './_bg-e';

export interface ScannerProps {
  /** Cell size in px (default 20). */
  cell?: number;
  /** Sweep speed multiplier; one pass takes 4.6 s at 1 (default 1). */
  speed?: number;
  /** The pointer locks a target bracket onto the cell under it (default true, listens on the parent). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A scan line sweeping down a grid of data cells: cells flare as the beam crosses them and burn out in its wake,
 * with registration marks at the edges and, when the pointer is over the parent, a target bracket locked onto the
 * cell beneath it. Fills its parent (`position:absolute; inset:0`): put it first inside a `position:relative`
 * section. Decorative (aria-hidden); a still frame under reduced motion.
 */
export default function Scanner({ cell = 20, speed = 1, interactive = true, className, style }: ScannerProps) {
  const make = (): Sketch => ({
    frame(t, _dt, e) {
      const { ctx, w, h, pal, ptr, dark } = e;
      const c = Math.max(10, cell);
      ctx.fillStyle = rgba(pal.surface, 1);
      ctx.fillRect(0, 0, w, h);
      const cols = Math.ceil(w / c), rows = Math.ceil(h / c);
      const ox = (w - cols * c) / 2, oy = (h - rows * c) / 2;
      const period = 4.6 / Math.max(0.1, speed), margin = 60, span = h + margin * 2;
      const pos = mod(t / period, 1) * span - margin;
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(pal.ink, dark ? 0.1 : 0.1);
      ctx.beginPath();
      for (let i = 0; i <= cols; i++) { const x = Math.round(ox + i * c) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let j = 0; j <= rows; j++) { const y = Math.round(oy + j * c) + 0.5; ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
      const hot = dark ? pal.ink : pal.primary;
      for (let j = 0; j < rows; j++) {
        const cy = oy + j * c + c / 2;
        const since = mod(pos - cy, span) / span * period; // seconds since the beam passed this row
        const glow = Math.exp(-since / 0.95);
        if (glow < 0.03) continue;
        for (let i = 0; i < cols; i++) {
          const hv = hash2(i, j, 21);
          if (hv < 0.42) continue;
          const v = glow * (0.45 + 0.55 * hv) * (0.7 + 0.3 * Math.sin(t * 6 + hv * 40));
          const col = mixc(pal.primary, pal.signal, clamp01(glow * 1.2 - 0.25));
          ctx.fillStyle = rgba(mixc(pal.surface, col, 0.4 + 0.6 * clamp01(v)), clamp01(v) * 0.9);
          const s = c - 6;
          ctx.fillRect(ox + i * c + 3, oy + j * c + 3, s, s);
        }
      }
      // the beam
      const bg = ctx.createLinearGradient(0, pos - 52, 0, pos + 3);
      bg.addColorStop(0, rgba(pal.signal, 0));
      bg.addColorStop(1, rgba(pal.signal, dark ? 0.3 : 0.26));
      ctx.fillStyle = bg;
      ctx.fillRect(0, pos - 52, w, 55);
      ctx.fillStyle = rgba(hot, 0.95);
      ctx.fillRect(0, pos - 1, w, 2);
      ctx.fillStyle = rgba(pal.signal, 0.9);
      for (const x of [0, w - 14]) ctx.fillRect(x, pos - 3, 14, 6);
      // registration marks
      ctx.strokeStyle = rgba(pal.ink, 0.5);
      ctx.lineWidth = 1.5;
      const m = 10, L = 14;
      for (const [x, y, sx, sy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]] as const) {
        ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke();
      }
      // pointer lock
      if (interactive && ptr.inside) {
        const i = Math.floor((ptr.x - ox) / c), j = Math.floor((ptr.y - oy) / c);
        const x = ox + i * c, y = oy + j * c, k = 6;
        ctx.fillStyle = rgba(pal.signal, 0.22);
        ctx.fillRect(x, y, c, c);
        ctx.strokeStyle = rgba(dark ? pal.signal : mixc(pal.signal, pal.ink, 0.25), 1);
        ctx.lineWidth = 2;
        for (const [px, py, sx, sy] of [[x - 3, y - 3, 1, 1], [x + c + 3, y - 3, -1, 1], [x - 3, y + c + 3, 1, -1], [x + c + 3, y + c + 3, -1, -1]] as const) {
          ctx.beginPath(); ctx.moveTo(px, py + sy * k); ctx.lineTo(px, py); ctx.lineTo(px + sx * k, py); ctx.stroke();
        }
      }
    },
  });
  return <Canvas2DBg cls="ui-scanner" make={make} opts={{ pointer: interactive, fps: 45 }} className={className} style={style} />;
}

export function Demo() {
  return (
    <BgDemo title="Scanner" note="A scan line, a grid, a target lock">
      <Scanner />
    </BgDemo>
  );
}
