'use client';
import type { CSSProperties } from 'react';
import { BgDemo, rgba, useBg2D, type Sketch } from './_bg-a';
import { follow, ramp, wash, type Follow } from './_bg-f';

export interface ThreadsProps {
  /** Number of threads (default 36). */
  count?: number;
  /** Flow speed multiplier (default 1). */
  speed?: number;
  /** Threads bend away from the pointer (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Flowing hairline threads: a loom of fine strands that sway as one, pinch together at two waists and fan
 * out again, shaded from --primary to --signal. Fills its parent: put it first inside a `position:relative`
 * section. Decorative; a still frame under reduced motion.
 */
export default function Threads({ count = 36, speed = 1, interactive = true, className, style }: ThreadsProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => {
      const f: Follow = { x: 0, y: 0, a: 0 };
      const n = Math.max(6, Math.min(80, Math.round(count)));
      return {
        frame(t, dt, e) {
          const { ctx, w, h, dark } = e;
          wash(e);
          follow(f, e, dt, interactive);
          const tt = t * speed * 0.35, step = Math.max(6, w / 90), cnt = Math.ceil(w / step) + 2;
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (let i = 0; i < n; i++) {
            const q = (i + 0.5) / n, spread = q - 0.5;
            ctx.beginPath();
            for (let k = 0; k < cnt; k++) {
              const x = k * step, u = x / w;
              const pinch = 0.18 + 0.82 * Math.abs(Math.sin(u * 5.2 + tt * 0.25 + 0.6)) ** 1.5;
              let y = h * 0.5 + spread * h * 0.78 * pinch
                + h * 0.14 * Math.sin(u * 4.1 + tt + q * 2.2) + h * 0.05 * Math.sin(u * 9.3 - tt * 1.3 + q * 7);
              if (f.a > 0.01) {
                const dx = (x - f.x) / (w * 0.16 + 40), dy = y - f.y;
                y += Math.sign(dy || 1) * 70 * f.a * Math.exp(-dx * dx) * Math.exp(-Math.abs(dy) / 120);
              }
              if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
            }
            const c = ramp(e, q);
            ctx.strokeStyle = rgba(c, (dark ? 0.55 : 0.5) * (0.55 + 0.45 * Math.sin(i * 1.9)));
            ctx.lineWidth = i % 5 === 0 ? 1.5 : 0.8;
            ctx.stroke();
          }
        },
      };
    },
    { pointer: interactive, fps: 40 },
  );
  return (
    <div ref={wrapRef} className={'ui-threads' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-threads-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Threads" note="Flowing fine strands">
      <Threads />
    </BgDemo>
  );
}
