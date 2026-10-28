'use client';
import type { CSSProperties } from 'react';
import { BgDemo, mixc, rgba, rng, useBg2D, type Sketch } from './_bg-a';

export interface AntigravityProps {
  /** Number of floating specks (default 120). */
  count?: number;
  /** Buoyancy multiplier (default 1). */
  lift?: number;
  /** Pointer pushes specks away and lifts them (default true). Listens on the parent; touch-drag works too. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Weightless specks that drift upward with a slow sway, shoved aside (and lifted) by the pointer, and
 * stretched into short streaks by their speed. Fills its parent: put it first inside a `position:relative`
 * section. Decorative; a frozen field under reduced motion.
 */
export default function Antigravity({ count = 120, lift = 1, interactive = true, className, style }: AntigravityProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => {
      const r = rng(11);
      const n = Math.max(10, Math.min(400, Math.round(count)));
      const P = Array.from({ length: n }, () => ({ x: r(), y: r(), z: 0.3 + r() * 0.7, ph: r() * 6.28, c: r(), vx: 0, vy: 0, ox: 0, oy: 0 }));
      let sw = 1, sh = 1;
      return {
        resize(e) { sw = e.w; sh = e.h; },
        frame(t, dt, e) {
          const { ctx, w, h, pal, ptr } = e;
          sw = w; sh = h;
          const bg = ctx.createLinearGradient(0, h, 0, 0);
          bg.addColorStop(0, rgba(mixc(pal.surface, pal.primary, e.dark ? 0.2 : 0.1), 1));
          bg.addColorStop(1, rgba(pal.surface, 1));
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);
          ctx.lineCap = 'round';
          const live = !e.reduced && dt > 0;
          for (const p of P) {
            if (live) {
              const base = (14 + 26 * p.z) * lift;
              p.vy += (-base - p.vy) * Math.min(1, dt * 1.5);
              p.vx += (Math.sin(t * 0.6 + p.ph) * 12 * p.z - p.vx) * Math.min(1, dt * 1.5);
              if (interactive && ptr.inside) {
                const dx = p.x * sw + p.ox - ptr.x, dy = p.y * sh + p.oy - ptr.y, d = Math.hypot(dx, dy) || 1;
                if (d < 150) { const f = (1 - d / 150) ** 2 * 900 * dt; p.vx += (dx / d) * f; p.vy += (dy / d) * f - f * 0.5; }
              }
              p.ox += p.vx * dt; p.oy += p.vy * dt;
              if (p.y * sh + p.oy < -20) { p.oy += sh + 40; p.x = (p.x + 0.37) % 1; }
              if (p.x * sw + p.ox < -20) p.ox += sw + 40;
              if (p.x * sw + p.ox > sw + 20) p.ox -= sw + 40;
            }
            const X = p.x * sw + p.ox, Y = (((p.y * sh + p.oy) % (sh + 40)) + (sh + 40)) % (sh + 40) - 20;
            const sp = Math.hypot(p.vx, p.vy), len = Math.min(26, sp * 0.22) * p.z;
            const col = p.c < 0.5 ? pal.primary : p.c < 0.8 ? pal.signal : pal.ink;
            ctx.strokeStyle = rgba(col, (e.dark ? 0.6 : 0.5) * p.z + 0.2);
            ctx.lineWidth = 1.5 + 3.2 * p.z;
            ctx.beginPath();
            ctx.moveTo(X, Y);
            ctx.lineTo(X - (p.vx / (sp || 1)) * len, Y - (p.vy / (sp || 1)) * len + 0.01);
            ctx.stroke();
          }
        },
      };
    },
    { pointer: interactive, fps: 50 },
  );
  return (
    <div ref={wrapRef} className={'ui-antigravity' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-antigravity-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Antigravity" note="Move the pointer through it">
      <Antigravity />
    </BgDemo>
  );
}
