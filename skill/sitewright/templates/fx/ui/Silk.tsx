'use client';
import type { CSSProperties } from 'react';
import { BgDemo, mixc, rgba, useBg2D, type Sketch } from './_bg-a';
import { follow, ramp, wash, type Follow } from './_bg-f';

export interface SilkProps {
  /** Number of overlapping satin folds (default 9). */
  folds?: number;
  /** Drift speed multiplier (default 1). */
  speed?: number;
  /** The pointer gathers the folds toward it (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Soft flowing satin: translucent ribbons whose edges are sums of slow sines, shaded with a sheen band so
 * they read as folds of cloth, tinted from --primary to --signal. Fills its parent: put it first inside a
 * `position:relative` section. Decorative; a still frame under reduced motion.
 */
export default function Silk({ folds = 9, speed = 1, interactive = true, className, style }: SilkProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => {
      const f: Follow = { x: 0, y: 0, a: 0 };
      const n = Math.max(3, Math.min(16, Math.round(folds)));
      return {
        frame(t, dt, e) {
          const { ctx, w, h, pal, dark } = e;
          wash(e);
          follow(f, e, dt, interactive);
          const tt = t * speed * 0.3, step = Math.max(8, w / 70);
          const pale = dark ? pal.ink : pal.surface;
          for (let i = 0; i < n; i++) {
            const q = n === 1 ? 0 : i / (n - 1);
            const base = h * (0.16 + 0.68 * q);
            const top: number[] = [], bot: number[] = [];
            let lo = 1e9, hi = -1e9;
            const cnt = Math.ceil((w + 40) / step) + 1;
            for (let k = 0; k < cnt; k++) {
              const x = -20 + k * step;
              let y = base + h * 0.13 * (Math.sin(x * 0.0042 + tt * (0.9 + q * 0.4) + i * 0.8) + 0.55 * Math.sin(x * 0.0091 - tt * 1.2 + i * 1.7) + 0.25 * Math.sin(x * 0.019 + tt * 0.7 + i));
              if (f.a > 0.01) { const dx = (x - f.x) / (w * 0.22 + 60); y += (f.y - y) * 0.28 * f.a * Math.exp(-dx * dx); }
              const th = h * (0.1 + 0.07 * Math.sin(x * 0.0055 + i * 1.3 - tt * 0.8));
              top.push(y); bot.push(y + th);
              if (y < lo) lo = y; if (y + th > hi) hi = y + th;
            }
            const c = ramp(e, q * 0.9 + 0.05 * Math.sin(tt + i));
            const g = ctx.createLinearGradient(0, lo, 0, hi);
            g.addColorStop(0, rgba(c, 0));
            g.addColorStop(0.3, rgba(c, dark ? 0.3 : 0.24));
            g.addColorStop(0.52, rgba(mixc(c, pale, 0.55), dark ? 0.34 : 0.3));
            g.addColorStop(0.7, rgba(c, dark ? 0.26 : 0.2));
            g.addColorStop(1, rgba(c, 0));
            ctx.beginPath();
            for (let k = 0; k < cnt; k++) { const x = -20 + k * step; if (k) ctx.lineTo(x, top[k]!); else ctx.moveTo(x, top[0]!); }
            for (let k = cnt - 1; k >= 0; k--) ctx.lineTo(-20 + k * step, bot[k]!);
            ctx.closePath();
            ctx.fillStyle = g; ctx.fill();
            ctx.beginPath();
            for (let k = 0; k < cnt; k++) { const x = -20 + k * step; if (k) ctx.lineTo(x, top[k]!); else ctx.moveTo(x, top[0]!); }
            ctx.strokeStyle = rgba(mixc(c, pale, 0.5), dark ? 0.42 : 0.34); ctx.lineWidth = 1.1; ctx.stroke();
          }
        },
      };
    },
    { pointer: interactive, fps: 45 },
  );
  return (
    <div ref={wrapRef} className={'ui-silk' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-silk-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Silk" note="Soft satin folds">
      <Silk />
    </BgDemo>
  );
}
