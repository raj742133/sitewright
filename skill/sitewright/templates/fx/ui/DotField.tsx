'use client';
import type { CSSProperties } from 'react';
import { BgDemo, clamp01, mixc, rgba, smooth, useBg2D, type Sketch } from './_bg-a';

export interface DotFieldProps {
  /** Grid pitch in px (default 22). */
  gap?: number;
  /** Wave speed multiplier (default 1). */
  speed?: number;
  /** Pointer pushes dots away on springs and lights them (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A grid of dots that swell with a slow diagonal wave; the pointer pushes them aside on springs and tints
 * them --primary, while the wave crest glows --signal. Fills its parent: put it first inside a
 * `position:relative` section. Decorative; a still frame under reduced motion.
 */
export default function DotField({ gap = 22, speed = 1, interactive = true, className, style }: DotFieldProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => {
      let cols = 0, rows = 0, ox = 0, oy = 0, dx = new Float32Array(0), dy = new Float32Array(0), vx = new Float32Array(0), vy = new Float32Array(0);
      const g = Math.max(10, gap);
      return {
        resize(e) {
          cols = Math.floor(e.w / g) + 1; rows = Math.floor(e.h / g) + 1;
          ox = (e.w - (cols - 1) * g) / 2; oy = (e.h - (rows - 1) * g) / 2;
          dx = new Float32Array(cols * rows); dy = new Float32Array(cols * rows); vx = new Float32Array(cols * rows); vy = new Float32Array(cols * rows);
        },
        frame(t, dt, e) {
          const { ctx, w, h, pal, ptr } = e;
          ctx.fillStyle = rgba(pal.surface, 1);
          ctx.fillRect(0, 0, w, h);
          const tt = t * speed, live = dt > 0 && interactive;
          const muted = mixc(pal.surface, pal.ink, e.dark ? 0.5 : 0.4);
          const k = Math.min(1, dt * 60);
          for (let j = 0; j < rows; j++) {
            for (let i = 0; i < cols; i++) {
              const n = j * cols + i, bx = ox + i * g, by = oy + j * g;
              let near = 0;
              if (live) {
                let fx = -dx[n]! * 0.12, fy = -dy[n]! * 0.12;
                if (ptr.inside) {
                  const ex = bx + dx[n]! - ptr.x, ey = by + dy[n]! - ptr.y, d = Math.hypot(ex, ey) || 1;
                  if (d < 120) { const f = (1 - d / 120) ** 2 * 5; fx += (ex / d) * f; fy += (ey / d) * f; }
                }
                vx[n] = (vx[n]! + fx * k) * 0.88; vy[n] = (vy[n]! + fy * k) * 0.88;
                dx[n] = dx[n]! + vx[n]! * k; dy[n] = dy[n]! + vy[n]! * k;
              }
              const x = bx + dx[n]!, y = by + dy[n]!;
              if (ptr.inside && interactive) near = smooth(130, 10, Math.hypot(x - ptr.x, y - ptr.y));
              const wv = clamp01(0.5 + 0.5 * Math.sin((bx + by) * 0.012 - tt * 1.1) * Math.sin(bx * 0.006 + tt * 0.4));
              const r = 1.3 + 2.6 * wv * wv + 3.2 * near;
              const col = near > 0.15 ? mixc(muted, pal.primary, near) : wv > 0.7 ? mixc(muted, pal.signal, (wv - 0.7) / 0.3) : mixc(muted, pal.primary, wv * 0.5);
              ctx.fillStyle = rgba(col, 0.45 + 0.5 * Math.max(wv, near));
              ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
            }
          }
        },
      };
    },
    { pointer: interactive, fps: 45 },
  );
  return (
    <div ref={wrapRef} className={'ui-dot-field' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-dot-field-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Dot field" note="Springy dot grid">
      <DotField />
    </BgDemo>
  );
}
