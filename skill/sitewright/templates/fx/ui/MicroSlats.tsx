'use client';
import type { CSSProperties } from 'react';
import { BgDemo, clamp01, mixc, rgba, toneSet, useBg2D, type Sketch } from './_bg-a';

export interface MicroSlatsProps {
  /** Slat pitch in px (default 9). */
  pitch?: number;
  /** Follow the pointer; otherwise (or on touch) a light sweeps slowly across (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Rows of fine vertical slats that tilt toward a light that follows the pointer: each slat narrows as it turns and its
 * face shades from --primary to bright with a --signal glint on the edge facing the light. Without a pointer the light
 * sweeps across slowly. Fills its parent (`position:absolute; inset:0`): put it first inside a `position:relative`
 * section. Decorative (aria-hidden); static frame under reduced motion.
 */
export default function MicroSlats({ pitch = 9, interactive = true, className, style }: MicroSlatsProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => {
      let lx = 0;
      return {
        frame(t, dt, e) {
          const { ctx, w, h, pal, ptr } = e;
          const { deep, pale } = toneSet(pal);
          const p = Math.max(4, pitch);
          const live = interactive && ptr.inside;
          const want = live ? ptr.x : w * (0.5 + 0.55 * Math.sin(t * 0.32));
          lx += (want - lx) * (dt ? 1 - Math.exp(-dt * (live ? 7 : 2)) : 1);
          if (!lx) lx = want;
          ctx.fillStyle = rgba(mixc(deep, pal.primary, 0.5), 1);
          ctx.fillRect(0, 0, w, h);
          const n = Math.ceil(w / p) + 1;
          for (let i = 0; i < n; i++) {
            const cx = i * p + p / 2;
            const d = (lx - cx) / (w * 0.45);
            const tilt = Math.max(-1, Math.min(1, d)) * 1.15;
            const wid = (p - 1.5) * (0.25 + 0.75 * Math.cos(tilt));
            const facing = clamp01(0.5 + 0.5 * Math.sin(tilt) * (d > 0 ? 1 : -1) * 0.0 + 0.5 * Math.cos(tilt) - 0.15);
            const near = Math.exp(-d * d * 7);
            let c = mixc(mixc(deep, pal.primary, 0.55), mixc(pal.primary, pale, 0.2), facing);
            c = mixc(c, pale, near * 0.6);
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, rgba(c, 1));
            g.addColorStop(1, rgba(mixc(c, deep, 0.3), 1));
            ctx.fillStyle = g;
            ctx.fillRect(cx - wid / 2, 0, wid, h);
            const edge = cx + (d > 0 ? wid / 2 - 1 : -wid / 2);
            ctx.fillStyle = rgba(mixc(pal.signal, pale, 0.2), 0.25 + 0.7 * near);
            ctx.fillRect(edge, 0, 1, h);
          }
        },
      };
    },
    { pointer: interactive, fps: 45 },
  );
  return (
    <div ref={wrapRef} className={'ui-micro-slats' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-micro-slats-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Micro slats" note="Fine slats that tilt toward the light">
      <MicroSlats />
    </BgDemo>
  );
}
