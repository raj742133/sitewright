'use client';
import type { CSSProperties } from 'react';
import { BgDemo, mixc, rgba, rng, useBg2D, type Sketch, type RGB } from './_bg-a';

export interface BallpitProps {
  /** Number of balls (default: scales with the area, about one per 9000 px2). */
  count?: number;
  /** Gravity strength multiplier (default 1). */
  gravity?: number;
  /** The pointer shoves balls around (default true). Listens on the parent; touch-drag works too. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface Ball { x: number; y: number; vx: number; vy: number; r: number; m: number; c: number }
const STEP = 1 / 120;

/**
 * A pit of shaded balls that fall, bounce off the walls and each other (circle collisions with restitution),
 * and settle into a heap; the pointer pushes them about. Colours come from --primary, --signal, --ink and --surface.
 * Fills its parent: put it first inside a `position:relative` section. Decorative; a settled heap under reduced motion.
 */
export default function Ballpit({ count, gravity = 1, interactive = true, className, style }: BallpitProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (e0): Sketch => {
      const r = rng(23);
      let W = 1, H = 1, balls: Ball[] = [], acc = 0, built = false;
      const build = (w: number, h: number) => {
        const n = Math.max(6, Math.min(90, count ?? Math.round((w * h) / 9000)));
        const base = Math.max(12, Math.min(30, Math.sqrt((w * h) / n) * 0.34));
        balls = [];
        for (let i = 0; i < n; i++) {
          const rad = base * (0.7 + r() * 0.6);
          balls.push({ x: rad + r() * Math.max(1, w - 2 * rad), y: e0.reduced ? r() * h * 0.5 : -rad - r() * h * 1.1, vx: (r() - 0.5) * 80, vy: 0, r: rad, m: rad * rad, c: r() });
        }
        built = true;
      };
      const step = (e: { ptr: { x: number; y: number; vx: number; vy: number; inside: boolean } }, live: boolean) => {
        const g = 1500 * gravity;
        for (const b of balls) {
          b.vy += g * STEP;
          if (live && interactive && e.ptr.inside) {
            const dx = b.x - e.ptr.x, dy = b.y - e.ptr.y, d = Math.hypot(dx, dy) || 1, reach = b.r + 46;
            if (d < reach) { const f = (1 - d / reach) * 2600 * STEP; b.vx += (dx / d) * f + e.ptr.vx * 0.004; b.vy += (dy / d) * f + e.ptr.vy * 0.004; }
          }
          b.x += b.vx * STEP; b.y += b.vy * STEP;
          b.vx *= 0.9995;
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.6; }
          if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.6; }
          if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy) * 0.5; b.vx *= 0.985; if (Math.abs(b.vy) < 25) b.vy = 0; }
        }
        for (let i = 0; i < balls.length; i++) {
          const a = balls[i]!;
          for (let j = i + 1; j < balls.length; j++) {
            const b = balls[j]!;
            const dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r;
            if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
            const d2 = dx * dx + dy * dy;
            if (d2 >= min * min || d2 === 0) continue;
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, over = (min - d) * 0.5;
            const wa = b.m / (a.m + b.m), wb = a.m / (a.m + b.m);
            a.x -= nx * over * 2 * wa; a.y -= ny * over * 2 * wa; b.x += nx * over * 2 * wb; b.y += ny * over * 2 * wb;
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) { const jn = (-(1 + 0.45) * rv) / (1 / a.m + 1 / b.m); a.vx -= (jn * nx) / a.m; a.vy -= (jn * ny) / a.m; b.vx += (jn * nx) / b.m; b.vy += (jn * ny) / b.m; }
          }
        }
      };
      const cols = (p: { primary: RGB; signal: RGB; ink: RGB; surface: RGB }, c: number): RGB => (c < 0.4 ? p.primary : c < 0.72 ? p.signal : mixc(p.ink, p.primary, 0.35));
      return {
        resize(e) {
          W = e.w; H = e.h;
          if (!built) { build(W, H); if (e0.reduced) for (let i = 0; i < 700; i++) step(e, false); }
          for (const b of balls) { b.x = Math.min(W - b.r, Math.max(b.r, b.x)); if (b.y > H - b.r) b.y = H - b.r; }
        },
        frame(_t, dt, e) {
          const { ctx, w, h, pal } = e;
          W = w; H = h;
          if (dt > 0) { acc += dt; let k = 0; while (acc >= STEP && k++ < 8) { step(e, true); acc -= STEP; } if (acc > STEP * 8) acc = 0; }
          const bg = ctx.createLinearGradient(0, 0, 0, h);
          bg.addColorStop(0, rgba(pal.surface, 1));
          bg.addColorStop(1, rgba(mixc(pal.surface, pal.primary, e.dark ? 0.2 : 0.1), 1));
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);
          for (const b of balls) {
            const col = cols(pal, b.c);
            const g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
            g.addColorStop(0, rgba(mixc(col, [255, 255, 255], 0.55), 1));
            g.addColorStop(0.55, rgba(col, 1));
            g.addColorStop(1, rgba(mixc(col, [0, 0, 0], 0.4), 1));
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill();
          }
        },
      };
    },
    { pointer: interactive, fps: 60 },
  );
  return (
    <div ref={wrapRef} className={'ui-ballpit' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-ballpit-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Ballpit" note="Poke the balls with the pointer">
      <Ballpit />
    </BgDemo>
  );
}
