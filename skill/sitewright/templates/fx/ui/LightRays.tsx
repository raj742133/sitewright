'use client';
import type { CSSProperties } from 'react';
import { BgDemo, clamp01, mixc, rgba, rng, useBg2D, type Sketch } from './_bg-a';

export interface LightRaysProps {
  /** Number of rays (default 13). */
  rays?: number;
  /** Sway speed multiplier (default 1). */
  speed?: number;
  /** Pointer slides the light source sideways (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Soft shafts of light fanning down from a source above the top edge, swaying and breathing slowly, in
 * --signal fading to --primary. Fills its parent (`position:absolute; inset:0`): put it first inside a
 * `position:relative` section. Decorative (aria-hidden); static frame under reduced motion.
 */
export default function LightRays({ rays = 13, speed = 1, interactive = true, className, style }: LightRaysProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => {
      const r = rng(7);
      const n = Math.max(3, Math.round(rays));
      const ray = Array.from({ length: n }, (_, i) => ({
        a: (i / (n - 1) - 0.5) * 1.5 + (r() - 0.5) * 0.12,
        w: 0.05 + r() * 0.1, ph: r() * 6.28, sp: 0.25 + r() * 0.35, k: r(),
      }));
      let sx = 0;
      return {
        frame(t, dt, e) {
          const { ctx, w, h, pal, ptr, dark } = e;
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = rgba(pal.surface, 1);
          ctx.fillRect(0, 0, w, h);
          const want = interactive && ptr.inside ? (ptr.x / w - 0.5) * 0.6 : 0;
          sx += (want - sx) * (dt ? Math.min(1, dt * 3) : 1);
          const ox = w * (0.5 + sx), oy = -h * 0.12, len = Math.hypot(w, h) * 1.15;
          const tt = t * speed;
          const warm = mixc(pal.signal, pal.surface, dark ? 0.1 : 0.25);
          ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
          for (const q of ray) {
            const a = q.a + Math.sin(tt * q.sp + q.ph) * 0.07 + sx * 0.3;
            const wid = q.w * (0.8 + 0.3 * Math.sin(tt * 0.5 + q.ph));
            const al = (dark ? 0.3 : 0.34) * (0.55 + 0.45 * Math.sin(tt * q.sp * 1.3 + q.ph * 2)) * (0.5 + 0.5 * q.k);
            const dx = Math.sin(a), dy = Math.cos(a);
            const g = ctx.createLinearGradient(ox, oy, ox + dx * len, oy + dy * len);
            g.addColorStop(0, rgba(warm, clamp01(al)));
            g.addColorStop(0.45, rgba(mixc(warm, pal.primary, 0.55), clamp01(al * 0.55)));
            g.addColorStop(1, rgba(pal.primary, 0));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(ox, oy);
            ctx.lineTo(ox + Math.sin(a - wid) * len, oy + Math.cos(a - wid) * len);
            ctx.lineTo(ox + Math.sin(a + wid) * len, oy + Math.cos(a + wid) * len);
            ctx.closePath();
            ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
          const gl = ctx.createRadialGradient(ox, oy, 0, ox, oy, h * 0.7);
          gl.addColorStop(0, rgba(warm, dark ? 0.55 : 0.6));
          gl.addColorStop(1, rgba(warm, 0));
          ctx.fillStyle = gl;
          ctx.fillRect(0, 0, w, h);
        },
      };
    },
    { pointer: interactive, fps: 40 },
  );
  return (
    <div ref={wrapRef} className={'ui-light-rays' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-light-rays-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Light rays" note="Shafts of light from above">
      <LightRays />
    </BgDemo>
  );
}
