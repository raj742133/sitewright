'use client';
import type { CSSProperties } from 'react';
import { BgDemo, rgba, useBg2D, type Sketch } from './_bg-a';
import { follow, ramp, wash, type Follow } from './_bg-f';

export interface SlicedWavesProps {
  /** Slices across the width (default 34). */
  slices?: number;
  /** Wave speed multiplier (default 1). */
  speed?: number;
  /** Slices near the pointer lift (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Three translucent wave bands cut into vertical slices with thin gaps, each slice a slanted slab that
 * follows the wave, shaded --primary to --signal. Fills its parent: put it first inside a `position:relative`
 * section. Decorative; a still frame under reduced motion.
 */
export default function SlicedWaves({ slices = 34, speed = 1, interactive = true, className, style }: SlicedWavesProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => {
      const f: Follow = { x: 0, y: 0, a: 0 };
      const n = Math.max(8, Math.min(90, Math.round(slices)));
      return {
        frame(t, dt, e) {
          const { ctx, w, h, dark } = e;
          wash(e);
          follow(f, e, dt, interactive);
          const tt = t * speed * 0.5, sw = w / n, gap = Math.min(5, Math.max(2, sw * 0.18));
          const mid = (x: number, l: number) => h * (0.3 + 0.2 * l) + h * 0.12 * Math.sin(x * 0.0058 + tt + l * 1.4) + h * 0.05 * Math.sin(x * 0.014 - tt * 1.4 + l * 2.1);
          const thick = (x: number, l: number) => h * 0.2 * (0.65 + 0.35 * Math.sin(x * 0.0041 - tt * 0.6 + l * 1.9));
          for (let l = 0; l < 3; l++) {
            for (let i = 0; i < n; i++) {
              const xa = i * sw + gap / 2, xb = (i + 1) * sw - gap / 2;
              const lift = (x: number) => { if (f.a < 0.01) return 0; const d = (x - f.x) / (w * 0.12 + 40); return -f.a * 46 * Math.exp(-d * d); };
              const ya = mid(xa, l) + lift(xa), yb = mid(xb, l) + lift(xb), ta = thick(xa, l), tb = thick(xb, l);
              const c = ramp(e, (i / n) * 0.8 + l * 0.1);
              const top = Math.min(ya - ta / 2, yb - tb / 2), bot = Math.max(ya + ta / 2, yb + tb / 2);
              const g = ctx.createLinearGradient(0, top, 0, bot);
              g.addColorStop(0, rgba(c, dark ? 0.6 : 0.5));
              g.addColorStop(1, rgba(c, dark ? 0.08 : 0.06));
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.moveTo(xa, ya - ta / 2); ctx.lineTo(xb, yb - tb / 2); ctx.lineTo(xb, yb + tb / 2); ctx.lineTo(xa, ya + ta / 2);
              ctx.closePath(); ctx.fill();
              ctx.strokeStyle = rgba(c, dark ? 0.75 : 0.6); ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(xa, ya - ta / 2); ctx.lineTo(xb, yb - tb / 2); ctx.stroke();
            }
          }
        },
      };
    },
    { pointer: interactive, fps: 45 },
  );
  return (
    <div ref={wrapRef} className={'ui-sliced-waves' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-sliced-waves-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Sliced waves" note="Waves cut into slabs">
      <SlicedWaves />
    </BgDemo>
  );
}
