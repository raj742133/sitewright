'use client';
import type { CSSProperties } from 'react';
import { rgba, mix } from './_t2';
import { useCanvas2D, type Frame, type Painter } from './_bg-c-canvas';
import { BgcDemo } from './_bg-c-demo';

export interface GridScanProps {
  /** Cell size in px (default 40). */
  cell?: number;
  /** Scan speed multiplier (default 1). */
  speed?: number;
  /** Length of the glowing trail behind the scan line, in px (default 220). */
  trail?: number;
  className?: string;
  style?: CSSProperties;
}

function makePainter(cell: number, speed: number, trail: number): Painter {
  const SLANT = 0.32;
  return {
    draw(f: Frame) {
      const { ctx, w, h, t, pal } = f;
      const cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1;
      const ox = (w - (cols - 1) * cell) / 2, oy = (h - (rows - 1) * cell) / 2;
      /* scan coordinate s = y + x*SLANT ; the line ping-pongs across the range */
      const span = h + w * SLANT + trail * 2;
      const ph = (t * 110 * speed) % (span * 2);
      const dir = ph < span ? 1 : -1;
      const head = (ph < span ? ph : span * 2 - ph) - trail;
      const grid = rgba(mix(pal.ink, pal.surface, 0.6), f.dark ? 0.2 : 0.2);
      const hasP = f.ptr.inside && !f.coarse;

      ctx.lineWidth = 1;
      ctx.strokeStyle = grid;
      ctx.beginPath();
      for (let i = 0; i < cols; i++) { const x = Math.round(ox + i * cell) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let j = 0; j < rows; j++) { const y = Math.round(oy + j * cell) + 0.5; ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();

      /* lit cells: brightest at the line, fading behind it (behind = opposite to the travel direction) */
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const cx = ox + i * cell + cell / 2, cy = oy + j * cell + cell / 2;
          const s = cy + cx * SLANT;
          const behind = (head - s) * dir;
          let a = behind >= 0 ? Math.exp(-behind / (trail * 0.45)) : 0;
          if (behind < 0 && behind > -cell) a = 0.0;
          if (hasP) {
            const d = Math.hypot(cx - f.ptr.x, cy - f.ptr.y);
            if (d < cell * 3.2) a = Math.max(a, (1 - d / (cell * 3.2)) * 0.8);
          }
          if (a < 0.03) continue;
          const col = a > 0.6 ? pal.signal : pal.primary;
          ctx.fillStyle = rgba(col, a * (f.dark ? 0.34 : 0.3));
          ctx.fillRect(ox + i * cell + 1, oy + j * cell + 1, cell - 1, cell - 1);
        }
      }
      /* plus marks at the crossings, a touch stronger near the scan line */
      ctx.beginPath();
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = Math.round(ox + i * cell), y = Math.round(oy + j * cell);
        ctx.moveTo(x - 3, y + 0.5); ctx.lineTo(x + 4, y + 0.5); ctx.moveTo(x + 0.5, y - 3); ctx.lineTo(x + 0.5, y + 4);
      }
      ctx.strokeStyle = rgba(mix(pal.ink, pal.surface, 0.35), 0.38);
      ctx.stroke();

      /* the scan line itself: a bright slanted bar with a soft halo */
      const x0 = -40, x1 = w + 40;
      const y0 = head - x0 * SLANT, y1 = head - x1 * SLANT;
      for (const [lw, al] of [[18, 0.1], [7, 0.22], [2, 0.95]] as const) {
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.strokeStyle = rgba(lw > 2 ? pal.primary : pal.signal, al); ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
      }
    },
  };
}

/**
 * A measuring grid with crosshair marks that a slanted scan line sweeps across, lighting cells which then fade
 * behind it. The pointer (on the parent) lights the cells around it. Canvas 2D in --primary, --signal and --ink;
 * with no pointer (touch, idle) the sweep carries the animation. Fills its parent; decorative (aria-hidden).
 * Static under reduced motion; pauses off-screen.
 */
export default function GridScan({ cell = 40, speed = 1, trail = 220, className, style }: GridScanProps) {
  const { wrapRef, canvasRef } = useCanvas2D(() => makePainter(Math.max(16, cell), speed, Math.max(40, trail)), { fps: 60, warm: 1 });
  return (
    <div ref={wrapRef} className={'ui-grid-scan' + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-grid-scan-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgcDemo title="Scanning the grid" sub="A sweep lights each cell as it passes.">
      <GridScan />
    </BgcDemo>
  );
}
