'use client';
import type { CSSProperties } from 'react';
import { BgDemo, clamp01, mixc, rgba, rng, type Sketch } from './_bg-a';
import { Canvas2DBg, hash2, type Tap } from './_bg-e';

export interface PixelBlastProps {
  /** Pixel size in px (default 14). */
  size?: number;
  /** Blast expansion speed multiplier (default 1). */
  speed?: number;
  /** Seconds between idle blasts (default 2.4). Clicks and taps add their own. */
  interval?: number;
  /** Clicks / taps on the parent set off a blast (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface Blast { x: number; y: number; t0: number; k: number }
const LIFE = 3.2;

/**
 * Square pixels that blast outward in ragged rings, leaving sparse glowing debris behind the front. A blast goes off
 * by itself every few seconds and wherever the parent is clicked or tapped. Fills its parent (`position:absolute;
 * inset:0`): put it first inside a `position:relative` section. Decorative (aria-hidden, no pointer capture);
 * frozen mid-blast under reduced motion.
 */
export default function PixelBlast({ size = 14, speed = 1, interval = 2.4, interactive = true, className, style }: PixelBlastProps) {
  const make = (_e: unknown, taps: Tap[]): Sketch => {
    const live: Blast[] = [];
    let seq = 100;
    return {
      frame(t, _dt, e) {
        const { ctx, w, h, pal } = e;
        ctx.fillStyle = rgba(pal.surface, 1);
        ctx.fillRect(0, 0, w, h);
        while (taps.length) { const p = taps.shift()!; live.push({ x: p.x, y: p.y, t0: t, k: seq++ }); }
        while (live.length && (t - live[0]!.t0 > LIFE || live.length > 8)) live.shift();
        const per = Math.max(0.8, interval);
        const list: Blast[] = live.slice();
        const k1 = Math.floor(t / per);
        for (let k = k1 - Math.ceil(LIFE / per); k <= k1; k++) {
          if (k < 0) continue;
          const r = rng(k * 7919 + 13);
          list.push({ x: (0.12 + 0.76 * r()) * w, y: (0.12 + 0.76 * r()) * h, t0: k * per, k });
        }
        const cell = Math.max(6, size);
        const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
        const bw = cell * 3.4, reach = 250 * speed;
        const dark = e.dark;
        // faint pixel lattice
        ctx.fillStyle = rgba(pal.ink, dark ? 0.1 : 0.09);
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) ctx.fillRect(i * cell + cell / 2 - 0.5, j * cell + cell / 2 - 0.5, 1.5, 1.5);
        for (let j = 0; j < rows; j++) {
          const cy = j * cell + cell / 2;
          for (let i = 0; i < cols; i++) {
            const cx = i * cell + cell / 2;
            let v = 0, hot = 0;
            for (const b of list) {
              const age = t - b.t0;
              if (age < 0 || age > LIFE) continue;
              const R = age * reach;
              const fade = Math.pow(1 - age / LIFE, 1.4);
              const d = Math.hypot(cx - b.x, cy - b.y) - R + (hash2(i, j, b.k) - 0.5) * bw * 0.9;
              if (d > -bw * 3.2 && d < bw * 2.2) {
                const front = Math.exp(-(d * d) / (bw * bw));
                v += front * fade;
                if (front > 0.5) hot = Math.max(hot, front * fade);
                if (d < 0 && hash2(i, j, b.k + 99) > 0.78) v += 0.55 * fade * (1 + d / (bw * 3.2));
              }
            }
            if (v < 0.05) continue;
            const q = clamp01(v);
            const s = Math.max(2, Math.round(cell * (0.28 + 0.66 * q)));
            const col = mixc(pal.primary, pal.signal, clamp01(hot * 1.1 + (hash2(i, j, 5) - 0.5) * 0.3));
            ctx.fillStyle = rgba(mixc(pal.surface, col, 0.35 + 0.65 * q), 0.25 + 0.75 * q);
            ctx.fillRect(Math.round(cx - s / 2), Math.round(cy - s / 2), s, s);
          }
        }
      },
    };
  };
  return <Canvas2DBg cls="ui-pixel-blast" make={make} taps={interactive} opts={{ fps: 40, dpr: 1 }} className={className} style={style} />;
}

export function Demo() {
  return (
    <BgDemo title="Pixel blast" note="Click anywhere to set one off">
      <PixelBlast />
    </BgDemo>
  );
}
