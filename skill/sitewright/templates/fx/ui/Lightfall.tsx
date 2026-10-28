'use client';
import type { CSSProperties } from 'react';
import { rgba, mix } from './_t2';
import { rng, useCanvas2D, type Frame, type Painter } from './_bg-c-canvas';
import { BgcDemo } from './_bg-c-demo';

export interface LightfallProps {
  /** Fall speed multiplier (default 1). */
  speed?: number;
  /** Density multiplier (default 1). */
  density?: number;
  className?: string;
  style?: CSSProperties;
}

interface Drop { x: number; y: number; v: number; len: number; z: number; c: number }
interface Splash { x: number; y: number; t: number; z: number; c: number }

function makePainter(f0: Frame, speed: number, density: number): Painter {
  const rand = rng(4242);
  let drops: Drop[] = [];
  let splashes: Splash[] = [];
  const mk = (w: number, h: number, spread: boolean): Drop => {
    const z = 0.35 + rand() * 0.65;
    return { x: rand() * w, y: spread ? rand() * h : -rand() * h * 0.3, v: (90 + rand() * 120) * z, len: (40 + rand() * 90) * z, z, c: rand() < 0.26 ? 1 : 0 };
  };
  const layout = (f: Frame) => {
    const n = Math.round(Math.min(160, Math.max(24, f.w / 11)) * density);
    drops = Array.from({ length: n }, () => mk(f.w, f.h, true));
    splashes = [];
  };
  layout(f0);
  return {
    resize: layout,
    draw(f: Frame) {
      const { ctx, w, h, pal, dt, t } = f;
      const floor = h * 0.9;
      const wind = (f.ptr.inside && !f.coarse ? (f.ptr.x / w - 0.5) * 36 : Math.sin(t * 0.3) * 8) * speed;
      const cols = [pal.primary, pal.signal];
      ctx.globalCompositeOperation = f.dark ? 'lighter' : 'source-over';

      /* a lit horizon where the light lands */
      const lg = ctx.createLinearGradient(0, floor - h * 0.28, 0, h);
      lg.addColorStop(0, rgba(pal.primary, 0));
      lg.addColorStop(0.7, rgba(pal.primary, f.dark ? 0.2 : 0.14));
      lg.addColorStop(1, rgba(mix(pal.primary, pal.signal, 0.5), f.dark ? 0.34 : 0.22));
      ctx.fillStyle = lg; ctx.fillRect(0, floor - h * 0.28, w, h - floor + h * 0.28);

      ctx.lineCap = 'round';
      for (const d of drops) {
        d.y += d.v * speed * dt; d.x += wind * d.z * dt;
        if (d.y - d.len > floor) {
          if (dt > 0) splashes.push({ x: d.x, y: floor + (1 - d.z) * (h - floor) * 0.7, t: 0, z: d.z, c: d.c });
          Object.assign(d, mk(w, h, false));
          continue;
        }
        if (d.x > w + 20) d.x -= w + 40; else if (d.x < -20) d.x += w + 40;
        const tx = d.x - (wind * d.z * d.len) / Math.max(60, d.v * speed);
        const g = ctx.createLinearGradient(tx, d.y - d.len, d.x, d.y);
        const col = cols[d.c]!;
        g.addColorStop(0, rgba(col, 0));
        g.addColorStop(1, rgba(col, (f.dark ? 0.85 : 0.7) * d.z));
        ctx.strokeStyle = g; ctx.lineWidth = 1 + d.z * 1.6;
        ctx.beginPath(); ctx.moveTo(tx, d.y - d.len); ctx.lineTo(d.x, d.y); ctx.stroke();
        ctx.fillStyle = rgba(f.dark ? mix(col, pal.ink, 0.5) : col, Math.min(1, 0.4 + d.z));
        ctx.beginPath(); ctx.arc(d.x, d.y, 0.8 + d.z * 1.2, 0, 6.2832); ctx.fill();
      }
      splashes = splashes.filter((s) => s.t < 0.9);
      for (const s of splashes) {
        s.t += dt;
        const k = s.t / 0.9, r = (6 + k * 34) * s.z;
        ctx.strokeStyle = rgba(cols[s.c]!, (1 - k) * 0.55 * s.z); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, r * 1.8, r * 0.5, 0, 0, 6.2832); ctx.stroke();
      }
    },
  };
}

/**
 * Light falling like rain: soft comet streaks in three depths drift down through the scene, land on a glowing
 * horizon and ring out as ripples. The pointer leans the fall sideways (a slow sway when there is no pointer).
 * Canvas 2D in --primary and --signal; additive in dark themes. Fills its parent; decorative (aria-hidden).
 * Static frame under reduced motion; pauses off-screen.
 */
export default function Lightfall({ speed = 1, density = 1, className, style }: LightfallProps) {
  const { wrapRef, canvasRef } = useCanvas2D((f) => makePainter(f, speed, density), { fps: 60, warm: 150 });
  return (
    <div ref={wrapRef} className={'ui-lightfall' + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-lightfall-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgcDemo title="Light, falling" sub="Streaks land on the horizon and ripple out.">
      <Lightfall />
    </BgcDemo>
  );
}
