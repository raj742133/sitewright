'use client';
import type { CSSProperties } from 'react';
import { BgDemo, clamp01, mixc, rgba, rng, type Sketch } from './_bg-a';
import { Canvas2DBg, type Tap } from './_bg-e';

export interface RippleGridProps {
  /** Grid pitch in px (default 28). */
  gap?: number;
  /** Ripple travel speed multiplier (default 1). */
  speed?: number;
  /** Seconds between idle ripples (default 2.8). */
  interval?: number;
  /** Clicks, taps and pointer travel send ripples across the grid (default true, listens on the parent). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface Rip { x: number; y: number; t0: number; amp: number }
const LIFE = 4.2;

/**
 * A lattice of lines and nodes that heaves as ripples travel across it: a ripple starts by itself every few
 * seconds, on every click or tap, and in small form as the pointer moves. Crests warm from --primary to --signal.
 * Fills its parent (`position:absolute; inset:0`): put it first inside a `position:relative` section.
 * Decorative (aria-hidden); frozen mid-ripple under reduced motion.
 */
export default function RippleGrid({ gap = 28, speed = 1, interval = 2.8, interactive = true, className, style }: RippleGridProps) {
  const make = (_e: unknown, taps: Tap[]): Sketch => {
    const live: Rip[] = [];
    let last = { x: -999, y: -999 };
    let lastAt = -9;
    let H = new Float32Array(0), DX = new Float32Array(0), DY = new Float32Array(0);
    return {
      frame(t, _dt, e) {
        const { ctx, w, h, pal, ptr, dark } = e;
        ctx.fillStyle = rgba(pal.surface, 1);
        ctx.fillRect(0, 0, w, h);
        while (taps.length) { const p = taps.shift()!; live.push({ x: p.x, y: p.y, t0: t, amp: 1 }); }
        if (interactive && ptr.inside && Math.hypot(ptr.x - last.x, ptr.y - last.y) > 80 && t - lastAt > 0.18) {
          live.push({ x: ptr.x, y: ptr.y, t0: t, amp: 0.42 }); last = { x: ptr.x, y: ptr.y }; lastAt = t;
        }
        while (live.length && (t - live[0]!.t0 > LIFE || live.length > 12)) live.shift();
        const per = Math.max(1, interval);
        const list = live.slice();
        const k1 = Math.floor(t / per);
        for (let k = Math.max(0, k1 - Math.ceil(LIFE / per)); k <= k1; k++) {
          const r = rng(k * 6007 + 5);
          list.push({ x: (0.15 + 0.7 * r()) * w, y: (0.15 + 0.7 * r()) * h, t0: k * per, amp: 0.8 });
        }
        const g = Math.max(14, gap);
        const cols = Math.ceil(w / g) + 2, rows = Math.ceil(h / g) + 2;
        const ox = (w - (cols - 1) * g) / 2, oy = (h - (rows - 1) * g) / 2;
        const n = cols * rows;
        if (H.length !== n) { H = new Float32Array(n); DX = new Float32Array(n); DY = new Float32Array(n); }
        const sp = 170 * speed, wl = 52;
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const x = ox + i * g, y = oy + j * g;
            let hv = 0, dx = 0, dy = 0;
            for (const rp of list) {
              const age = t - rp.t0;
              if (age < 0 || age > LIFE) continue;
              const ddx = x - rp.x, ddy = y - rp.y, d = Math.hypot(ddx, ddy) + 0.001;
              const s = (d - age * sp) / wl;
              if (s > 3 || s < -3) continue;
              const v = Math.exp(-s * s * 0.5) * Math.cos(s * 2.6) * rp.amp * Math.pow(1 - age / LIFE, 1.5);
              hv += v; dx += (ddx / d) * v * g * 0.38; dy += (ddy / d) * v * g * 0.38;
            }
            const q = j * cols + i;
            H[q] = hv; DX[q] = x + dx; DY[q] = y + dy;
          }
        }
        const ink = pal.ink;
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(ink, dark ? 0.2 : 0.18);
        ctx.beginPath();
        for (let j = 0; j < rows; j++) { ctx.moveTo(DX[j * cols]!, DY[j * cols]!); for (let i = 1; i < cols; i++) ctx.lineTo(DX[j * cols + i]!, DY[j * cols + i]!); }
        for (let i = 0; i < cols; i++) { ctx.moveTo(DX[i]!, DY[i]!); for (let j = 1; j < rows; j++) ctx.lineTo(DX[j * cols + i]!, DY[j * cols + i]!); }
        ctx.stroke();
        for (let q = 0; q < n; q++) {
          const a = Math.abs(H[q]!), x = DX[q]!, y = DY[q]!;
          if (x < -8 || y < -8 || x > w + 8 || y > h + 8) continue;
          const col = mixc(pal.primary, pal.signal, clamp01(H[q]! * 1.1 + 0.2));
          ctx.fillStyle = a < 0.04 ? rgba(ink, dark ? 0.38 : 0.34) : rgba(col, 0.55 + 0.45 * clamp01(a * 1.5));
          const r = 1.3 + clamp01(a) * 3.2;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
      },
    };
  };
  return <Canvas2DBg cls="ui-ripple-grid" make={make} taps={interactive} opts={{ pointer: interactive, fps: 45 }} className={className} style={style} />;
}

export function Demo() {
  return (
    <BgDemo title="Ripple grid" note="Click or move to send ripples">
      <RippleGrid />
    </BgDemo>
  );
}
