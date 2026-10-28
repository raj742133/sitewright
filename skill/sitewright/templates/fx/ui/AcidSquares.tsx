'use client';
import type { CSSProperties } from 'react';
import { BgDemo, clamp01, mixc, rgba, smooth, useBg2D, type Sketch } from './_bg-a';

export interface AcidSquaresProps {
  /** Square pitch in px (default 28). */
  size?: number;
  /** Wave speed multiplier (default 1). */
  speed?: number;
  /** Let the pointer swell the squares around it (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A grid of squares that swell, spin and shift between --primary and --signal as slow interference waves
 * roll across it. Fills its parent (`position:absolute; inset:0`): put it first inside a `position:relative`
 * section. Decorative (aria-hidden, no pointer capture); static frame under reduced motion.
 */
export default function AcidSquares({ size = 28, speed = 1, interactive = true, className, style }: AcidSquaresProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => ({
      frame(t, _dt, e) {
        const { ctx, w, h, pal, ptr } = e;
        ctx.fillStyle = rgba(pal.surface, 1);
        ctx.fillRect(0, 0, w, h);
        const cell = Math.max(10, size);
        const cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1;
        const ox = (w - (cols - 1) * cell) / 2, oy = (h - (rows - 1) * cell) / 2;
        const tt = t * speed;
        const a = e.dark ? 0.9 : 0.82;
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const x = ox + i * cell, y = oy + j * cell;
            let v = Math.sin(x * 0.02 + tt * 0.8) + Math.sin(y * 0.024 - tt * 0.6) + Math.sin((x + y) * 0.012 + tt * 0.45) + Math.sin(Math.hypot(x - w * 0.7, y - h * 0.3) * 0.03 - tt);
            v = smooth(0.12, 0.88, 0.5 + v / 6.5);
            if (interactive && ptr.inside) v = clamp01(v + smooth(150, 0, Math.hypot(x - ptr.x, y - ptr.y)) * 0.7);
            const s = cell * (0.16 + 0.78 * v);
            const col = mixc(pal.primary, pal.signal, smooth(0.45, 0.85, v));
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((v - 0.5) * 1.2 + Math.floor(v * 3) * 0.26);
            ctx.fillStyle = rgba(mixc(pal.surface, col, 0.25 + 0.75 * v), a);
            ctx.fillRect(-s / 2, -s / 2, s, s);
            ctx.restore();
          }
        }
      },
    }),
    { pointer: interactive, fps: 45 },
  );
  return (
    <div ref={wrapRef} className={'ui-acid-squares' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-acid-squares-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Acid squares" note="Interference waves, brand colours">
      <AcidSquares />
    </BgDemo>
  );
}
