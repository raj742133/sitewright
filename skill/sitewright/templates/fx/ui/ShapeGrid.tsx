'use client';
import type { CSSProperties } from 'react';
import { BgDemo, clamp01, mixc, rgba, smooth, type Sketch } from './_bg-a';
import { Canvas2DBg, hash2 } from './_bg-e';

export interface ShapeGridProps {
  /** Which shapes fill the grid (default 'mixed'). */
  shape?: 'mixed' | 'circle' | 'square' | 'triangle' | 'diamond';
  /** Grid pitch in px (default 36). */
  size?: number;
  /** Pointer influence radius in px (default 150). */
  radius?: number;
  /** Idle wave speed multiplier (default 1). */
  speed?: number;
  className?: string;
  style?: CSSProperties;
}

const SHAPES = ['circle', 'square', 'triangle', 'diamond'] as const;
const TAU = Math.PI * 2;

/**
 * A grid of small shapes (circles, squares, triangles, diamonds) that swell, spin a quarter turn and warm from
 * ink to --primary to --signal as the pointer comes near; without a pointer (touch, or none over the parent) an
 * invisible hand wanders across the grid. Fills its parent (`position:absolute; inset:0`): put it first inside a
 * `position:relative` section. Decorative (aria-hidden); a still frame under reduced motion.
 */
export default function ShapeGrid({ shape = 'mixed', size = 36, radius = 150, speed = 1, className, style }: ShapeGridProps) {
  const make = (): Sketch => {
    const hand = { x: 0, y: 0, a: 0, set: false };
    return {
      frame(t, dt, e) {
        const { ctx, w, h, pal, ptr, dark, reduced } = e;
        ctx.fillStyle = rgba(pal.surface, 1);
        ctx.fillRect(0, 0, w, h);
        const tt = t * speed;
        const wx = w * (0.5 + 0.36 * Math.sin(tt * 0.31) + 0.1 * Math.sin(tt * 0.83 + 1));
        const wy = h * (0.5 + 0.34 * Math.cos(tt * 0.23 + 0.5) + 0.08 * Math.sin(tt * 0.61));
        const real = ptr.inside && !reduced;
        const tx = real ? ptr.x : wx, ty = real ? ptr.y : wy, ta = real ? 1 : 0.8;
        const k = dt && hand.set ? 1 - Math.exp(-dt * 7) : 1;
        hand.x += (tx - hand.x) * k; hand.y += (ty - hand.y) * k; hand.a += (ta - hand.a) * k; hand.set = true;
        const s = Math.max(16, size), R = Math.max(40, radius);
        const cols = Math.ceil(w / s) + 1, rows = Math.ceil(h / s) + 1;
        const ox = (w - (cols - 1) * s) / 2, oy = (h - (rows - 1) * s) / 2;
        const base = dark ? pal.ink : pal.ink;
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const x = ox + i * s, y = oy + j * s;
            const f = smooth(0, 1, 1 - Math.hypot(x - hand.x, y - hand.y) / R) * hand.a;
            const wave = 0.5 + 0.5 * Math.sin(x * 0.018 + y * 0.011 - tt * 0.9);
            const sc = (0.2 + 0.1 * wave + 0.5 * f) * s;
            const rot = f * (Math.PI / 2) + (hash2(i, j, 3) - 0.5) * 0.2 * (1 - f);
            const kind = shape === 'mixed' ? SHAPES[Math.floor(hash2(i, j, 8) * 4)]! : shape;
            const warm = mixc(pal.primary, pal.signal, clamp01(f * 1.3 - 0.2));
            const col = mixc(mixc(pal.surface, base, 0.3 + 0.12 * wave), warm, clamp01(f * 1.4));
            ctx.fillStyle = rgba(col, 0.55 + 0.45 * clamp01(f * 1.5 + wave * 0.3));
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.beginPath();
            const r = sc / 2;
            if (kind === 'circle') ctx.arc(0, 0, r, 0, TAU);
            else if (kind === 'square') ctx.rect(-r, -r, sc, sc);
            else if (kind === 'diamond') { ctx.rotate(Math.PI / 4); ctx.rect(-r * 0.85, -r * 0.85, sc * 0.85, sc * 0.85); }
            else { ctx.moveTo(0, -r * 1.1); ctx.lineTo(r * 1.05, r * 0.8); ctx.lineTo(-r * 1.05, r * 0.8); ctx.closePath(); }
            ctx.fill();
            ctx.restore();
          }
        }
      },
    };
  };
  return <Canvas2DBg cls="ui-shape-grid" make={make} opts={{ pointer: true, fps: 45 }} className={className} style={style} />;
}

export function Demo() {
  return (
    <BgDemo title="Shape grid" note="Move the pointer across it">
      <ShapeGrid />
    </BgDemo>
  );
}
