'use client';
import type { CSSProperties } from 'react';
import { BgDemo, clamp01, mixc, rgba, type Sketch } from './_bg-a';
import { Canvas2DBg, hash2, mod } from './_bg-e';

export interface PixelSnowProps {
  /** Base pixel size in px; the nearest flakes are up to 3x this (default 3). */
  pixel?: number;
  /** Flake density multiplier (default 1). */
  density?: number;
  /** Fall speed multiplier (default 1). */
  speed?: number;
  /** The pointer parts the flakes around it (default true, listens on the parent). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Square pixel flakes falling in three depth layers over a dusk gradient, swaying on the spot and settling into a
 * stair-stepped drift along the bottom edge; the pointer pushes flakes aside. Fills its parent (`position:absolute;
 * inset:0`): put it first inside a `position:relative` section. Decorative (aria-hidden); frozen under reduced motion.
 */
export default function PixelSnow({ pixel = 3, density = 1, speed = 1, interactive = true, className, style }: PixelSnowProps) {
  const make = (): Sketch => ({
    frame(t, _dt, e) {
      const { ctx, w, h, pal, ptr, dark } = e;
      const px = Math.max(2, pixel);
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, rgba(pal.surface, 1));
      g.addColorStop(1, rgba(mixc(pal.surface, pal.primary, dark ? 0.28 : 0.16), 1));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const flake = dark ? pal.ink : mixc(pal.primary, pal.ink, 0.2);
      const n = Math.round(Math.min(260, Math.max(30, (w * h) / 5200)) * density);
      const span = h + px * 8;
      for (let i = 0; i < n; i++) {
        const d = hash2(i, 1, 11);
        const layer = d < 0.55 ? 0 : d < 0.85 ? 1 : 2;
        const s = px * (1 + layer);
        const v = (16 + layer * 26 + hash2(i, 2, 11) * 14) * speed;
        let x = hash2(i, 3, 11) * w + Math.sin(t * (0.35 + layer * 0.2) + hash2(i, 4, 11) * 6.28) * (6 + layer * 9);
        const y = mod(hash2(i, 5, 11) * span + t * v, span) - px * 4;
        if (interactive && ptr.inside) {
          const dx = x - ptr.x, dy = y - ptr.y, dist = Math.hypot(dx, dy);
          if (dist < 120 && dist > 0.1) x += (dx / dist) * Math.pow(1 - dist / 120, 2) * 46;
        }
        const a = 0.4 + layer * 0.25;
        ctx.fillStyle = rgba(hash2(i, 6, 11) > 0.9 ? pal.signal : flake, clamp01(a));
        ctx.fillRect(Math.round(x / px) * px, Math.round(y / px) * px, s, s);
      }
      // the drift: stair-stepped columns along the bottom
      const colW = px * 4;
      const base = h - Math.max(14, h * 0.07);
      ctx.fillStyle = rgba(dark ? mixc(pal.surface, pal.ink, 0.82) : mixc(pal.surface, pal.primary, 0.3), 1);
      for (let x = 0, c = 0; x < w; x += colW, c++) {
        const top = base - (Math.sin(c * 0.37) * 0.5 + Math.sin(c * 0.11 + 1) * 0.5 + 1) * h * 0.025 - hash2(c, 9, 3) * px * 1.5;
        const y0 = Math.round(top / px) * px;
        ctx.fillRect(x, y0, colW + 1, h - y0);
      }
    },
  });
  return <Canvas2DBg cls="ui-pixel-snow" make={make} opts={{ pointer: interactive, fps: 40, dpr: 1 }} className={className} style={style} />;
}

export function Demo() {
  return (
    <BgDemo title="Pixel snow" note="Three layers of falling pixels">
      <PixelSnow />
    </BgDemo>
  );
}
