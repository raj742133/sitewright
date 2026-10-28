'use client';
import type { CSSProperties } from 'react';
import { BgDemo, mixc, rgba, rng, useBg2D, type Sketch } from './_bg-a';

export interface MagicRingsProps {
  /** Number of concentric rings (default 5). */
  rings?: number;
  /** Rotation speed multiplier (default 1). */
  speed?: number;
  /** Rings shift with the pointer, deeper rings more (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Concentric rings of dashed arcs, tick marks and orbiting sparks that turn in alternating directions around a glowing
 * core, in --primary and --signal, with a pulse travelling outward. Fills its parent (`position:absolute; inset:0`):
 * put it first inside a `position:relative` section. Decorative (aria-hidden); static frame under reduced motion.
 */
export default function MagicRings({ rings = 5, speed = 1, interactive = true, className, style }: MagicRingsProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => {
      const r = rng(21);
      const n = Math.max(2, Math.min(9, Math.round(rings)));
      const spec = Array.from({ length: n }, (_, i) => ({
        dash: 3 + Math.floor(r() * 5), fill: 0.45 + r() * 0.35, ph: r() * 6.28, sp: (0.12 + r() * 0.16) * (i % 2 ? -1 : 1),
        ticks: i % 2 === 0 ? 36 + Math.floor(r() * 24) : 0, sparks: 1 + Math.floor(r() * 3),
      }));
      let ox = 0, oy = 0;
      return {
        frame(t, dt, e) {
          const { ctx, w, h, pal, ptr, dark } = e;
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = rgba(pal.surface, 1);
          ctx.fillRect(0, 0, w, h);
          const wx = interactive && ptr.inside ? (ptr.x / w - 0.5) : 0, wy = interactive && ptr.inside ? (ptr.y / h - 0.5) : 0;
          const k = dt ? Math.min(1, dt * 3) : 1;
          ox += (wx - ox) * k; oy += (wy - oy) * k;
          const cx = w / 2, cy = h / 2, m = Math.min(w, h), R = Math.hypot(w, h) * 0.5;
          const base = m * 0.1, step = Math.max(m * 0.07, (R * 0.9 - base) / n);
          const tt = t * speed;
          const core = ctx.createRadialGradient(cx + ox * 24, cy + oy * 24, 0, cx, cy, m * 0.42);
          core.addColorStop(0, rgba(mixc(pal.signal, pal.surface, dark ? 0 : 0.2), dark ? 0.5 : 0.45));
          core.addColorStop(0.5, rgba(pal.primary, dark ? 0.16 : 0.13));
          core.addColorStop(1, rgba(pal.primary, 0));
          ctx.fillStyle = core;
          ctx.fillRect(0, 0, w, h);
          ctx.lineCap = 'round';
          for (let i = 0; i < n; i++) {
            const s = spec[i]!;
            const depth = 1 - i / n;
            const rad = base + step * (i + 0.6);
            const x = cx + ox * (10 + i * 9), y = cy + oy * (10 + i * 9);
            const col = mixc(pal.primary, pal.signal, i / Math.max(1, n - 1) * 0.8);
            const pulse = Math.max(0, 1 - Math.abs(((tt * 0.25) % 1.4) * n - i - 0.4) * 0.9);
            ctx.strokeStyle = rgba(col, 0.2 + 0.4 * pulse);
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.stroke();
            const seg = 6.2832 / s.dash, a0 = s.ph + tt * s.sp;
            ctx.strokeStyle = rgba(col, 0.75 + 0.2 * pulse);
            ctx.lineWidth = 2 + depth * 1.6;
            for (let d = 0; d < s.dash; d++) {
              ctx.beginPath(); ctx.arc(x, y, rad + 6, a0 + d * seg, a0 + d * seg + seg * s.fill); ctx.stroke();
            }
            if (s.ticks) {
              ctx.strokeStyle = rgba(col, 0.55);
              ctx.lineWidth = 1;
              ctx.beginPath();
              for (let d = 0; d < s.ticks; d++) {
                const a = -a0 * 0.7 + (d / s.ticks) * 6.2832, L = d % 4 === 0 ? 8 : 4;
                ctx.moveTo(x + Math.cos(a) * (rad - 8), y + Math.sin(a) * (rad - 8));
                ctx.lineTo(x + Math.cos(a) * (rad - 8 - L), y + Math.sin(a) * (rad - 8 - L));
              }
              ctx.stroke();
            }
            for (let q = 0; q < s.sparks; q++) {
              const a = a0 * 1.8 + q * (6.2832 / s.sparks) + s.ph;
              const sx = x + Math.cos(a) * (rad + 6), sy = y + Math.sin(a) * (rad + 6);
              const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 11);
              glow.addColorStop(0, rgba(mixc(pal.signal, pal.surface, 0.35), 0.95));
              glow.addColorStop(1, rgba(pal.signal, 0));
              ctx.fillStyle = glow;
              ctx.fillRect(sx - 11, sy - 11, 22, 22);
            }
          }
        },
      };
    },
    { pointer: interactive, fps: 45 },
  );
  return (
    <div ref={wrapRef} className={'ui-magic-rings' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-magic-rings-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Magic rings" note="Turning rings, sparks and a pulse">
      <MagicRings />
    </BgDemo>
  );
}
