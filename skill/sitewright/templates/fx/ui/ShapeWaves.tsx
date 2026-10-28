'use client';
import type { CSSProperties } from 'react';
import { BgDemo, rgba, useBg2D, type Sketch } from './_bg-a';
import { follow, ramp, wash, type Follow } from './_bg-f';

export type WaveShape = 'mixed' | 'triangle' | 'square' | 'diamond' | 'circle';
export interface ShapeWavesProps {
  /** Shape drawn along the waves; `mixed` gives each row its own (default). */
  shape?: WaveShape;
  /** Number of wave rows (default 7). */
  rows?: number;
  /** Wave speed multiplier (default 1). */
  speed?: number;
  /** Shapes near the pointer swell and warm to --signal (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

const ORDER: Exclude<WaveShape, 'mixed'>[] = ['triangle', 'circle', 'square', 'diamond'];

function path(ctx: CanvasRenderingContext2D, s: Exclude<WaveShape, 'mixed'>, r: number) {
  ctx.beginPath();
  if (s === 'circle') ctx.arc(0, 0, r * 0.85, 0, 6.2832);
  else if (s === 'triangle') { ctx.moveTo(r * 1.1, 0); ctx.lineTo(-r * 0.7, r * 0.9); ctx.lineTo(-r * 0.7, -r * 0.9); ctx.closePath(); }
  else if (s === 'square') ctx.rect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
  else { ctx.moveTo(r * 1.15, 0); ctx.lineTo(0, r * 0.8); ctx.lineTo(-r * 1.15, 0); ctx.lineTo(0, -r * 0.8); ctx.closePath(); }
}

/**
 * Rows of small shapes riding travelling sine waves: each shape turns to follow the wave's slope and swells
 * with its crest, colours ramp --primary to --signal down the rows. Fills its parent: put it first inside a
 * `position:relative` section. Decorative; a still frame under reduced motion.
 */
export default function ShapeWaves({ shape = 'mixed', rows = 7, speed = 1, interactive = true, className, style }: ShapeWavesProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => {
      const f: Follow = { x: 0, y: 0, a: 0 };
      const nr = Math.max(2, Math.min(16, Math.round(rows)));
      return {
        frame(t, dt, e) {
          const { ctx, w, h, dpr, dark } = e;
          wash(e);
          follow(f, e, dt, interactive);
          const tt = t * speed * 0.7, sp = Math.max(20, Math.min(34, w / 22)), k = 0.0075;
          for (let r = 0; r < nr; r++) {
            const q = nr === 1 ? 0 : r / (nr - 1);
            const base = h * (0.1 + 0.8 * q), amp = h * 0.075 * (0.7 + 0.5 * Math.sin(r * 1.7));
            const sh = shape === 'mixed' ? ORDER[r % ORDER.length]! : shape;
            const c = ramp(e, q);
            const cnt = Math.ceil(w / sp) + 2;
            for (let i = -1; i < cnt; i++) {
              const x = i * sp + (r % 2) * sp * 0.5;
              const ph = x * k + tt + r * 0.85;
              const y = base + amp * Math.sin(ph) + amp * 0.4 * Math.sin(x * k * 2.3 - tt * 1.3 + r);
              const slope = amp * k * Math.cos(ph) + amp * 0.4 * k * 2.3 * Math.cos(x * k * 2.3 - tt * 1.3 + r);
              const ang = Math.atan(slope) * 1.2 + (sh === 'square' || sh === 'diamond' ? tt * 0.3 : 0);
              let near = 0;
              if (f.a > 0.01) { const d = Math.hypot(x - f.x, y - f.y); near = f.a * Math.max(0, 1 - d / 130) ** 2; }
              const sz = (4.5 + 3.5 * (0.5 + 0.5 * Math.sin(ph - 0.8))) * (1 + near * 0.9) * Math.min(1.25, Math.max(0.8, w / 600));
              const cos = Math.cos(ang) * dpr, sin = Math.sin(ang) * dpr;
              ctx.setTransform(cos, sin, -sin, cos, x * dpr, y * dpr);
              path(ctx, sh, sz);
              const col = near > 0.05 ? ramp(e, Math.min(1, q + near)) : c;
              ctx.fillStyle = rgba(col, (dark ? 0.55 : 0.5) + 0.35 * (0.5 + 0.5 * Math.sin(ph - 0.8)) + near * 0.2);
              ctx.fill();
            }
          }
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        },
      };
    },
    { pointer: interactive, fps: 45 },
  );
  return (
    <div ref={wrapRef} className={'ui-shape-waves' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-shape-waves-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Shape waves" note="Shapes riding sine waves">
      <ShapeWaves />
    </BgDemo>
  );
}
