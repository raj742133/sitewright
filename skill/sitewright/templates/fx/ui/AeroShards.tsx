'use client';
import type { CSSProperties } from 'react';
import { BgDemo, mixc, rgba, rng, useBg2D, type Sketch } from './_bg-a';

export interface AeroShardsProps {
  /** Number of glass shards (default 26). */
  count?: number;
  /** Drift speed multiplier (default 1). */
  speed?: number;
  /** Parallax with the pointer (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface Shard { x: number; y: number; z: number; r: number; rot: number; spin: number; vx: number; vy: number; pts: [number, number][]; tint: number }

/**
 * Translucent glass shards of several depths drifting and turning over a soft sky gradient, with
 * bevelled highlights and pointer parallax. Colours come from --primary, --signal and --surface.
 * Fills its parent: put it first inside a `position:relative` section. Decorative; still frame under reduced motion.
 */
export default function AeroShards({ count = 26, speed = 1, interactive = true, className, style }: AeroShardsProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (e0): Sketch => {
      const r = rng(7);
      const n = Math.max(4, Math.min(80, Math.round(count)));
      const shards: Shard[] = [];
      for (let i = 0; i < n; i++) {
        const z = 0.25 + r() * 0.75, k = 3 + Math.floor(r() * 2);
        const pts: [number, number][] = [];
        for (let q = 0; q < k; q++) { const a = (q / k) * Math.PI * 2 + (r() - 0.5) * 1.1; const rad = 0.55 + r() * 0.6; pts.push([Math.cos(a) * rad, Math.sin(a) * rad * (0.6 + r() * 0.5)]); }
        shards.push({ x: r(), y: r(), z, r: 36 + z * 90 + r() * 40, rot: r() * 6.28, spin: (r() - 0.5) * 0.18, vx: (r() - 0.5) * 0.012, vy: -0.004 - r() * 0.01, pts, tint: r() });
      }
      shards.sort((a, b) => a.z - b.z);
      const par = { x: 0, y: 0 };
      void e0;
      return {
        frame(t, dt, e) {
          const { ctx, w, h, pal, ptr } = e;
          const sky = ctx.createLinearGradient(0, 0, w * 0.4, h);
          sky.addColorStop(0, rgba(mixc(pal.surface, pal.primary, e.dark ? 0.22 : 0.14), 1));
          sky.addColorStop(0.6, rgba(pal.surface, 1));
          sky.addColorStop(1, rgba(mixc(pal.surface, pal.signal, e.dark ? 0.18 : 0.14), 1));
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, w, h);
          const tx = interactive && ptr.inside ? (ptr.x / w - 0.5) : 0, ty = interactive && ptr.inside ? (ptr.y / h - 0.5) : 0;
          const k = Math.min(1, dt * 4) || 1;
          par.x += (tx - par.x) * k; par.y += (ty - par.y) * k;
          const tt = t * speed;
          for (const s of shards) {
            const px = (((s.x + s.vx * tt) % 1) + 1) % 1, py = (((s.y + s.vy * tt) % 1) + 1) % 1;
            const cx = px * (w + 2 * s.r) - s.r - par.x * 70 * s.z, cy = py * (h + 2 * s.r) - s.r - par.y * 70 * s.z;
            const rot = s.rot + s.spin * tt;
            const c = Math.cos(rot) * s.r, sn = Math.sin(rot) * s.r;
            ctx.beginPath();
            s.pts.forEach(([u, v], i) => { const X = cx + u * c - v * sn, Y = cy + u * sn + v * c; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
            ctx.closePath();
            const tint = mixc(pal.primary, pal.signal, s.tint * 0.8);
            const g = ctx.createLinearGradient(cx - s.r, cy - s.r, cx + s.r, cy + s.r);
            g.addColorStop(0, rgba(mixc(pal.surface, [255, 255, 255], 0.5), 0.2 + 0.4 * s.z));
            g.addColorStop(1, rgba(tint, 0.12 + 0.28 * s.z));
            ctx.fillStyle = g;
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = rgba(mixc(tint, [255, 255, 255], e.dark ? 0.2 : 0.7), 0.35 + 0.4 * s.z);
            ctx.stroke();
          }
        },
      };
    },
    { pointer: interactive, fps: 40 },
  );
  return (
    <div ref={wrapRef} className={'ui-aero-shards' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-aero-shards-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Aero shards" note="Glass drifting in depth">
      <AeroShards />
    </BgDemo>
  );
}
