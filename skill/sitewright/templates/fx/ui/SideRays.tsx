'use client';
import type { CSSProperties } from 'react';
import { BgDemo, rgba, useBg2D, type Sketch } from './_bg-a';
import { follow, wash, type Follow } from './_bg-f';

export interface SideRaysProps {
  /** Rays entering from the left edge (default 8); the right edge gets a smaller set. */
  rays?: number;
  /** Sway speed multiplier (default 1). */
  speed?: number;
  /** The left source slides toward the pointer height (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Shafts of light entering from the sides: a fan of soft wedges from the left edge in --primary and a
 * smaller fan from the right in --signal, each breathing and swaying on its own. Fills its parent: put it
 * first inside a `position:relative` section. Decorative; a still frame under reduced motion.
 */
export default function SideRays({ rays = 8, speed = 1, interactive = true, className, style }: SideRaysProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => {
      const f: Follow = { x: 0, y: 0, a: 0 };
      const n = Math.max(2, Math.min(20, Math.round(rays)));
      return {
        frame(t, dt, e) {
          const { ctx, w, h, pal, dark } = e;
          wash(e, 0.6);
          follow(f, e, dt, interactive);
          const tt = t * speed * 0.5, len = Math.hypot(w, h) * 1.25;
          ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
          const gain = dark ? 0.5 : 0.34;
          const fan = (ox: number, oy: number, dir: number, cnt: number, col: [number, number, number], seed: number) => {
            const glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, h * 0.7);
            glow.addColorStop(0, rgba(col, dark ? 0.4 : 0.28)); glow.addColorStop(1, rgba(col, 0));
            ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < cnt; i++) {
              const q = cnt === 1 ? 0.5 : i / (cnt - 1);
              const a0 = dir === 1 ? 0 : Math.PI;
              const ang = a0 + dir * (0.5 * (q - 0.5) * 1.5 + 0.1 + 0.05 * Math.sin(tt * 0.7 + i * 1.9 + seed)) ;
              const half = 0.018 + 0.03 * (0.5 + 0.5 * Math.sin(i * 2.7 + seed));
              const br = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(tt * 0.9 + i * 1.7 + seed));
              const x1 = ox + Math.cos(ang - half) * len, y1 = oy + Math.sin(ang - half) * len;
              const x2 = ox + Math.cos(ang + half) * len, y2 = oy + Math.sin(ang + half) * len;
              const g = ctx.createLinearGradient(ox, oy, ox + Math.cos(ang) * len * 0.8, oy + Math.sin(ang) * len * 0.8);
              g.addColorStop(0, rgba(col, gain * br)); g.addColorStop(0.6, rgba(col, gain * br * 0.25)); g.addColorStop(1, rgba(col, 0));
              ctx.fillStyle = g;
              ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath(); ctx.fill();
            }
          };
          const ly = h * (0.3 + 0.06 * Math.sin(tt * 0.4)) + (f.a > 0.01 ? (f.y - h * 0.3) * 0.35 * f.a : 0);
          fan(-w * 0.06, ly, 1, n, pal.primary, 0);
          fan(w * 1.06, h * (0.7 + 0.05 * Math.sin(tt * 0.33 + 1)), -1, Math.max(2, Math.round(n * 0.6)), pal.signal, 3);
          ctx.globalCompositeOperation = 'source-over';
        },
      };
    },
    { pointer: interactive, fps: 40 },
  );
  return (
    <div ref={wrapRef} className={'ui-side-rays' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-side-rays-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Side rays" note="Light from the edges">
      <SideRays />
    </BgDemo>
  );
}
