'use client';
import type { CSSProperties } from 'react';
import { rgba, mix } from './_t2';
import { rng, useCanvas2D, type Frame, type Painter } from './_bg-c-canvas';
import { BgcDemo } from './_bg-c-demo';

export interface HyperspeedProps {
  /** Cruise speed multiplier (default 1). */
  speed?: number;
  /** Star density multiplier (default 1). */
  density?: number;
  /** How far the pointer steers the vanishing point, 0 to 1 (default 0.5). Press and hold to boost. */
  steer?: number;
  className?: string;
  style?: CSSProperties;
}

interface Star { x: number; y: number; z: number; c: number }

function makePainter(f0: Frame, speed: number, density: number, steer: number): Painter {
  const rand = rng(90210);
  const N = Math.round(Math.min(520, Math.max(120, (f0.w * f0.h) / 2800)) * density);
  const stars: Star[] = Array.from({ length: N }, (_, i) => ({ x: (rand() * 2 - 1) * 1.6, y: (rand() * 2 - 1) * 1.6, z: 0.04 + rand() * 0.96, c: i % 3 }));
  const respawn = (s: Star) => { s.x = (rand() * 2 - 1) * 1.6; s.y = (rand() * 2 - 1) * 1.6; s.z = 0.9 + rand() * 0.1; s.c = Math.floor(rand() * 3); };
  let boost = 0, vx = 0, vy = 0;
  return {
    draw(f: Frame) {
      const { ctx, w, h, pal, dt } = f;
      const target = f.ptr.down ? 1 : 0;
      boost += (target - boost) * Math.min(1, dt * 3);
      const aimX = f.ptr.inside && !f.coarse ? (f.ptr.x / w - 0.5) * steer : Math.sin(f.t * 0.22) * 0.12 * steer;
      const aimY = f.ptr.inside && !f.coarse ? (f.ptr.y / h - 0.5) * steer : Math.cos(f.t * 0.17) * 0.08 * steer;
      vx += (aimX - vx) * Math.min(1, dt * 2.4); vy += (aimY - vy) * Math.min(1, dt * 2.4);
      const cx = w * (0.5 + vx * 0.7), cy = h * (0.5 + vy * 0.7);
      const F = Math.max(w, h) * 0.5;
      const v = (0.34 + boost * 1.5) * speed;
      const tail = 0.05 + boost * 0.13;

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.55);
      glow.addColorStop(0, rgba(pal.primary, f.dark ? 0.28 : 0.16));
      glow.addColorStop(1, rgba(pal.primary, 0));
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

      const cols = [pal.primary, pal.signal, f.dark ? mix(pal.ink, pal.primary, 0.15) : mix(pal.ink, pal.primary, 0.4)];
      /* buckets: colour x (far, near) */
      const paths: Path2D[] = Array.from({ length: 6 }, () => new Path2D());
      for (const s of stars) {
        const z0 = s.z;
        s.z -= v * dt * (0.5 + (1 - z0) * 0.9);
        if (s.z < 0.02) { respawn(s); continue; }
        const x1 = cx + (s.x / s.z) * F * 0.18, y1 = cy + (s.y / s.z) * F * 0.18;
        const zt = Math.min(1, s.z + tail * (0.4 + (1 - s.z)));
        const x0 = cx + (s.x / zt) * F * 0.18, y0 = cy + (s.y / zt) * F * 0.18;
        if (x1 < -40 || x1 > w + 40 || y1 < -40 || y1 > h + 40) { respawn(s); continue; }
        const p = paths[s.c * 2 + (s.z < 0.38 ? 1 : 0)]!;
        p.moveTo(x0, y0); p.lineTo(x1, y1);
      }
      ctx.lineCap = 'round';
      paths.forEach((p, i) => {
        const near = i % 2 === 1, col = cols[Math.floor(i / 2)]!;
        ctx.lineWidth = near ? 2.4 : 1.1;
        ctx.strokeStyle = rgba(col, near ? 0.95 : 0.55);
        ctx.stroke(p);
      });
    },
  };
}

/**
 * A star-warp: streaks fly out of a vanishing point, longer and brighter as they get close. The pointer
 * steers the vanishing point and press-and-hold jumps to hyperspeed; with no pointer (touch, idle) it drifts on
 * its own. Canvas 2D in --primary, --signal and --ink. Fills its parent and reads the pointer from that parent;
 * decorative (aria-hidden). Static frame under reduced motion; pauses off-screen.
 */
export default function Hyperspeed({ speed = 1, density = 1, steer = 0.5, className, style }: HyperspeedProps) {
  const { wrapRef, canvasRef } = useCanvas2D((f) => makePainter(f, speed, density, steer), { fps: 60, warm: 40 });
  return (
    <div ref={wrapRef} className={'ui-hyperspeed' + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-hyperspeed-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgcDemo title="Engage" sub="Hold the pointer down to punch it.">
      <Hyperspeed />
    </BgcDemo>
  );
}
