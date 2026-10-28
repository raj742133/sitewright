'use client';
import type { CSSProperties } from 'react';
import { rgba, mix } from './_t2';
import { rng, useCanvas2D, type Frame, type Painter } from './_bg-c-canvas';
import { BgcDemo } from './_bg-c-demo';

export interface LightPillarProps {
  /** Number of pillars (default 5). */
  count?: number;
  /** Shimmer speed multiplier (default 1). */
  speed?: number;
  className?: string;
  style?: CSSProperties;
}

interface Pillar { x: number; w: number; ph: number; sp: number; c: number; lean: number; h: number }
interface Mote { x: number; y: number; v: number; r: number; c: number }

function makePainter(f0: Frame, count: number, speed: number): Painter {
  const rand = rng(2468);
  let pillars: Pillar[] = [];
  let motes: Mote[] = [];
  const layout = (f: Frame) => {
    const n = Math.max(1, Math.min(12, Math.round(count)));
    pillars = Array.from({ length: n }, (_, i) => ({
      x: ((i + 0.5 + (rand() - 0.5) * 0.5) / n) * f.w, w: (0.05 + rand() * 0.06) * f.w + 14, ph: rand() * 6.28, sp: 0.5 + rand() * 0.7,
      c: i % 3 === 1 ? 1 : 0, lean: (rand() - 0.5) * 0.06, h: 0.7 + rand() * 0.3,
    }));
    motes = Array.from({ length: Math.round(Math.min(80, f.w / 12)) }, () => ({ x: rand() * f.w, y: rand() * f.h, v: 10 + rand() * 24, r: 0.6 + rand() * 1.4, c: rand() < 0.3 ? 1 : 0 }));
  };
  layout(f0);
  return {
    resize: layout,
    draw(f: Frame) {
      const { ctx, w, h, t, pal, dt } = f;
      const cols = [pal.primary, pal.signal];
      const add = f.dark;
      const hasP = f.ptr.inside && !f.coarse;
      ctx.globalCompositeOperation = add ? 'lighter' : 'source-over';
      for (const p of pillars) {
        const pulse = 0.6 + 0.4 * Math.sin(t * p.sp * speed + p.ph);
        const near = hasP ? Math.max(0, 1 - Math.abs(f.ptr.x - p.x) / (w * 0.22)) : 0;
        const a = (0.5 + 0.5 * pulse + near * 0.5) * (add ? 0.55 : 0.46) * (0.65 + 0.35 * p.h);
        const hw = (p.w / 2) * (0.88 + 0.12 * pulse + near * 0.25);
        const col = cols[p.c]!;
        ctx.save();
        ctx.translate(p.x, h);
        ctx.transform(1, 0, p.lean, 1, 0, 0);
        /* body: soft horizontal profile, bright at the base and fading upward */
        const g = ctx.createLinearGradient(-hw, 0, hw, 0);
        g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.5, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
        const top = -h;
        const wide = ctx.createLinearGradient(-hw * 4, 0, hw * 4, 0);
        wide.addColorStop(0, rgba(col, 0)); wide.addColorStop(0.5, rgba(col, a * 0.35 * p.h)); wide.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = wide; ctx.fillRect(-hw * 4, top, hw * 8, -top);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.rect(-hw, top, hw * 2, -top); ctx.fill();
        /* hot core line */
        const cg = ctx.createLinearGradient(0, 0, 0, top);
        const core = add ? mix(col, pal.ink, 0.6) : mix(col, pal.ink, 0.25);
        cg.addColorStop(0, rgba(core, 0.9 * (0.6 + 0.4 * pulse))); cg.addColorStop(0.55, rgba(core, 0.25)); cg.addColorStop(1, rgba(core, 0));
        ctx.fillStyle = cg; ctx.fillRect(-1, top, 2, -top);
        ctx.restore();
      }
      /* fade every pillar out toward the top */
      ctx.globalCompositeOperation = 'destination-out';
      const fade = ctx.createLinearGradient(0, 0, 0, h);
      fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.55, 'rgba(0,0,0,0.35)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fade; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = add ? 'lighter' : 'source-over';

      /* pool of light at the base */
      const pool = ctx.createLinearGradient(0, h * 0.82, 0, h);
      pool.addColorStop(0, rgba(pal.primary, 0)); pool.addColorStop(1, rgba(mix(pal.primary, pal.signal, 0.45), add ? 0.42 : 0.26));
      ctx.fillStyle = pool; ctx.fillRect(0, h * 0.82, w, h * 0.18);

      for (const m of motes) {
        m.y -= m.v * speed * dt;
        if (m.y < -4) { m.y = h + 4; m.x = rand() * w; }
        const q = 1 - m.y / h;
        ctx.fillStyle = rgba(add ? mix(cols[m.c]!, pal.ink, 0.45) : cols[m.c]!, (0.2 + q * 0.6) * (add ? 0.9 : 0.8));
        ctx.beginPath(); ctx.arc(m.x + Math.sin(t * 0.8 + m.y * 0.02) * 4, m.y, m.r, 0, 6.2832); ctx.fill();
      }
    },
  };
}

/**
 * Tall vertical beams of light rising from the floor: each has a soft body, a hot core line and a slow
 * shimmer, with embers drifting upward and a pool of glow at the base. The pillar nearest the pointer (read from the
 * parent) swells. Canvas 2D in --primary and --signal; additive in dark themes, tinted overlay in light.
 * Fills its parent; decorative (aria-hidden). Static under reduced motion; pauses off-screen.
 */
export default function LightPillar({ count = 5, speed = 1, className, style }: LightPillarProps) {
  const { wrapRef, canvasRef } = useCanvas2D((f) => makePainter(f, count, speed), { fps: 60, warm: 30 });
  return (
    <div ref={wrapRef} className={'ui-light-pillar' + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-light-pillar-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgcDemo title="Pillars of light" sub="Beams rise and breathe; the nearest one swells.">
      <LightPillar />
    </BgcDemo>
  );
}
