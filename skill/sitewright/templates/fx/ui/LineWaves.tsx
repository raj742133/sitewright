'use client';
import type { CSSProperties } from 'react';
import { BgDemo, mixc, rgba, useBg2D, type Sketch } from './_bg-a';

export interface LineWavesProps {
  /** Gap between lines in px (default 14). */
  gap?: number;
  /** Wave height multiplier (default 1). */
  amplitude?: number;
  /** Speed multiplier (default 1). */
  speed?: number;
  /** Pointer lifts the lines near it (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A stack of thin horizontal lines that ripple like a ridge of waves, shading from --primary to --signal down the
 * page; the pointer lifts a bump through them. Fills its parent (`position:absolute; inset:0`): put it first inside a
 * `position:relative` section. Decorative (aria-hidden); static frame under reduced motion.
 */
export default function LineWaves({ gap = 14, amplitude = 1, speed = 1, interactive = true, className, style }: LineWavesProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => ({
      frame(t, _dt, e) {
        const { ctx, w, h, pal, ptr, dark } = e;
        ctx.fillStyle = rgba(pal.surface, 1);
        ctx.fillRect(0, 0, w, h);
        const g = Math.max(6, gap), rows = Math.ceil(h / g) + 4, step = 6;
        const tt = t * speed * 0.7, A = g * 1.5 * amplitude;
        ctx.lineWidth = 1.4;
        ctx.lineJoin = 'round';
        for (let j = 0; j < rows; j++) {
          const by = (j - 1) * g + 4;
          const k = j / rows;
          ctx.strokeStyle = rgba(mixc(pal.primary, pal.signal, k), (dark ? 0.35 : 0.3) + 0.4 * Math.sin(k * Math.PI));
          ctx.beginPath();
          for (let x = -step; x <= w + step; x += step) {
            const env = 0.35 + 0.65 * Math.sin((x / w) * Math.PI);
            let y = by + env * A * (Math.sin(x * 0.011 + tt + j * 0.22) * 0.6 + Math.sin(x * 0.027 - tt * 1.3 + j * 0.4) * 0.4);
            if (interactive && ptr.inside) {
              const d = Math.hypot(x - ptr.x, by - ptr.y);
              y -= 26 * Math.exp(-(d * d) / 9000);
            }
            if (x <= 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      },
    }),
    { pointer: interactive, fps: 45 },
  );
  return (
    <div ref={wrapRef} className={'ui-line-waves' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-line-waves-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Line waves" note="Rippling ridge of thin lines">
      <LineWaves />
    </BgDemo>
  );
}
