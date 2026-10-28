'use client';
import type { CSSProperties } from 'react';
import { rgba, mix } from './_t2';
import { useCanvas2D, type Frame, type Painter } from './_bg-c-canvas';
import { BgcDemo } from './_bg-c-demo';

export interface GridDistortionProps {
  /** Grid spacing in px (default 36). */
  cell?: number;
  /** How far the pointer pushes the grid, in px (default 34). */
  strength?: number;
  /** Radius of the pointer's influence, in px (default 150). */
  radius?: number;
  className?: string;
  style?: CSSProperties;
}

interface Ring { x: number; y: number; t0: number }

function makePainter(f: Frame, cell: number, strength: number, radius: number): Painter {
  let cols = 0, rows = 0, ox = 0, oy = 0;
  let dx = new Float32Array(0), dy = new Float32Array(0), vx = new Float32Array(0), vy = new Float32Array(0);
  let rings: Ring[] = [];
  const layout = (fr: Frame) => {
    cols = Math.ceil(fr.w / cell) + 2; rows = Math.ceil(fr.h / cell) + 2;
    ox = (fr.w - (cols - 1) * cell) / 2; oy = (fr.h - (rows - 1) * cell) / 2;
    const n = cols * rows;
    dx = new Float32Array(n); dy = new Float32Array(n); vx = new Float32Array(n); vy = new Float32Array(n);
  };
  layout(f);
  return {
    resize: layout,
    draw(fr) {
      const { ctx, t, pal } = fr;
      const dt = Math.min(0.033, fr.dt);
      for (const tp of fr.ptr.taps) rings.push({ x: tp.x, y: tp.y, t0: t });
      rings = rings.filter((r) => t - r.t0 < 1.6);
      const hasPtr = fr.ptr.inside && !fr.coarse;
      const R2 = radius * radius;
      const lines: number[][] = [[], [], []];
      const px = new Float32Array(cols * rows), py = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          const bx = ox + i * cell, by = oy + j * cell;
          let tx = 0, ty = 0;
          if (hasPtr) {
            const ddx = bx - fr.ptr.x, ddy = by - fr.ptr.y, d2 = ddx * ddx + ddy * ddy;
            if (d2 < R2) {
              const d = Math.sqrt(d2) + 0.001, q = 1 - d / radius, push = q * q * strength * (fr.ptr.down ? 1.8 : 1);
              tx += (ddx / d) * push; ty += (ddy / d) * push;
            }
          }
          for (const r of rings) {
            const age = t - r.t0, ddx = bx - r.x, ddy = by - r.y, d = Math.sqrt(ddx * ddx + ddy * ddy) + 0.001;
            const edge = Math.abs(d - age * 360);
            if (edge < 56) { const w = (1 - edge / 56) * Math.exp(-age * 1.8) * strength * 1.1; tx += (ddx / d) * w; ty += (ddy / d) * w; }
          }
          if (dt > 0) {
            vx[k] = (vx[k] ?? 0) + ((tx - (dx[k] ?? 0)) * 90 - (vx[k] ?? 0) * 11) * dt;
            vy[k] = (vy[k] ?? 0) + ((ty - (dy[k] ?? 0)) * 90 - (vy[k] ?? 0) * 11) * dt;
            dx[k] = (dx[k] ?? 0) + (vx[k] ?? 0) * dt; dy[k] = (dy[k] ?? 0) + (vy[k] ?? 0) * dt;
          }
          /* a slow travelling swell keeps the grid alive when nobody is pointing */
          const sw = Math.sin(bx * 0.011 + by * 0.007 + t * 0.8) * 5, sv = Math.cos(by * 0.012 - bx * 0.006 + t * 0.65) * 5;
          px[k] = bx + (dx[k] ?? 0) + sw; py[k] = by + (dy[k] ?? 0) + sv;
        }
      }
      const lvl = (k: number) => { const m = Math.abs(dx[k] ?? 0) + Math.abs(dy[k] ?? 0); return m > 14 ? 2 : m > 4 ? 1 : 0; };
      const seg = (a: number, b: number) => { const L = Math.max(lvl(a), lvl(b)); lines[L]!.push(px[a]!, py[a]!, px[b]!, py[b]!); };
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        if (i + 1 < cols) seg(k, k + 1);
        if (j + 1 < rows) seg(k, k + cols);
      }
      const base = mix(pal.ink, pal.surface, 0.55), hot = mix(pal.primary, pal.signal, 0.35);
      const styles: [string, number][] = [[rgba(base, fr.dark ? 0.3 : 0.36), 1], [rgba(pal.primary, 0.6), 1.2], [rgba(hot, 0.95), 1.6]];
      styles.forEach(([col, lw], L) => {
        const a = lines[L]!;
        if (!a.length) return;
        ctx.beginPath();
        for (let q = 0; q < a.length; q += 4) { ctx.moveTo(a[q]!, a[q + 1]!); ctx.lineTo(a[q + 2]!, a[q + 3]!); }
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
      });
      ctx.fillStyle = rgba(pal.signal, 0.9);
      for (let k = 0; k < cols * rows; k++) {
        if (lvl(k) < 2) continue;
        ctx.beginPath(); ctx.arc(px[k]!, py[k]!, 1.8, 0, 6.2832); ctx.fill();
      }
    },
  };
}

/**
 * A line grid that bends away from the pointer and springs back. Taps or clicks send a ripple through it, and a
 * slow swell moves it when no pointer is present (touch, idle). Canvas 2D in the host's --ink, --primary and
 * --signal. Fills its parent and listens for the pointer on that parent; decorative (aria-hidden). Static under
 * reduced motion; pauses off-screen.
 */
export default function GridDistortion({ cell = 36, strength = 34, radius = 150, className, style }: GridDistortionProps) {
  const { wrapRef, canvasRef } = useCanvas2D((f) => makePainter(f, Math.max(16, cell), strength, Math.max(40, radius)), { dpr: 2, fps: 60 });
  return (
    <div ref={wrapRef} className={'ui-grid-distortion' + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-grid-distortion-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgcDemo title="Push the grid" sub="Move across it, or click to send a ripple.">
      <GridDistortion />
    </BgcDemo>
  );
}
