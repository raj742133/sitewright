'use client';
import type { CSSProperties } from 'react';
import { BgDemo, clamp01, mixc, rgba, rng, type RGB, type Sketch } from './_bg-a';
import { Canvas2DBg, mod } from './_bg-e';

export interface RadarProps {
  /** Sweep rate multiplier; one turn takes 4.5 s at 1 (default 1). */
  speed?: number;
  /** Number of blips on the screen (default 12). */
  blips?: number;
  className?: string;
  style?: CSSProperties;
}

const TAU = Math.PI * 2;

/**
 * A radar scope: range rings, a crosshair, a tick bezel and a sweeping beam with a fading trail that lights blips
 * as it passes over them (each blip flashes, pings and then fades until the next pass). Fills its parent
 * (`position:absolute; inset:0`): put it first inside a `position:relative` section. Decorative (aria-hidden);
 * a still frame under reduced motion.
 */
export default function Radar({ speed = 1, blips = 12, className, style }: RadarProps) {
  const make = (): Sketch => {
    const r = rng(2027);
    const list = Array.from({ length: 24 }, () => ({ a: r() * TAU, d: 0.14 + r() * 0.8 }));
    return {
      frame(t, _dt, e) {
        const { ctx, w, h, pal, dark } = e;
        const cx = w / 2, cy = h / 2, R = Math.max(w, h) * 0.46, Rb = Math.min(w, h) * 0.46;
        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.2);
        bg.addColorStop(0, rgba(mixc(pal.surface, pal.primary, dark ? 0.2 : 0.1), 1));
        bg.addColorStop(1, rgba(pal.surface, 1));
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        const line: RGB = pal.ink;
        const accent: RGB = dark ? mixc(pal.primary, pal.ink, 0.35) : pal.primary;
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(line, dark ? 0.2 : 0.2);
        for (let k = 1; k <= 5; k++) { ctx.beginPath(); ctx.arc(cx, cy, (R * k) / 4.2, 0, TAU); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(cx - R * 1.4, cy); ctx.lineTo(cx + R * 1.4, cy); ctx.moveTo(cx, cy - R * 1.4); ctx.lineTo(cx, cy + R * 1.4); ctx.stroke();
        // bezel ticks
        for (let i = 0; i < 72; i++) {
          const a = (i / 72) * TAU, major = i % 6 === 0, l = major ? 11 : 5;
          ctx.strokeStyle = rgba(line, major ? 0.42 : 0.24);
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * Rb, cy + Math.sin(a) * Rb); ctx.lineTo(cx + Math.cos(a) * (Rb - l), cy + Math.sin(a) * (Rb - l)); ctx.stroke();
        }
        // sweep
        const A = mod(t * speed * (TAU / 4.5), TAU), trail = 1.25;
        const cg = (ctx as CanvasRenderingContext2D & { createConicGradient?: (a: number, x: number, y: number) => CanvasGradient }).createConicGradient;
        if (cg) {
          const g = cg.call(ctx, A - trail, cx, cy);
          const f = trail / TAU;
          g.addColorStop(0, rgba(accent, 0));
          g.addColorStop(f, rgba(accent, dark ? 0.5 : 0.42));
          g.addColorStop(Math.min(0.9999, f + 0.0001), rgba(accent, 0));
          g.addColorStop(1, rgba(accent, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, TAU); ctx.fill();
        } else {
          for (let i = 0; i < 30; i++) {
            const a0 = A - trail + (trail * i) / 30, a1 = A - trail + (trail * (i + 1)) / 30;
            ctx.fillStyle = rgba(accent, 0.4 * Math.pow((i + 1) / 30, 2));
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 1.5, a0, a1); ctx.closePath(); ctx.fill();
          }
        }
        ctx.strokeStyle = rgba(accent, 0.28); ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(A) * R * 1.5, cy + Math.sin(A) * R * 1.5); ctx.stroke();
        ctx.strokeStyle = rgba(dark ? pal.ink : pal.primary, 0.95); ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(A) * R * 1.5, cy + Math.sin(A) * R * 1.5); ctx.stroke();
        // blips
        const n = Math.max(0, Math.min(list.length, Math.round(blips)));
        for (let i = 0; i < n; i++) {
          const b = list[i]!;
          const since = mod(A - b.a, TAU);
          const v = Math.pow(clamp01(1 - since / (TAU * 0.9)), 2);
          if (v < 0.02) continue;
          const bx = cx + Math.cos(b.a) * R * b.d, by = cy + Math.sin(b.a) * R * b.d;
          const col = mixc(pal.signal, pal.ink, dark ? 0.15 : 0.1);
          if (since < 1.2) {
            ctx.strokeStyle = rgba(pal.signal, 0.7 * (1 - since / 1.2));
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(bx, by, 5 + since * 16, 0, TAU); ctx.stroke();
          }
          ctx.fillStyle = rgba(col, 0.25 + 0.75 * v);
          ctx.beginPath(); ctx.arc(bx, by, 2.5 + 2.5 * v, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = rgba(accent, 1);
        ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, TAU); ctx.fill();
      },
    };
  };
  return <Canvas2DBg cls="ui-radar" make={make} opts={{ fps: 45 }} className={className} style={style} />;
}

export function Demo() {
  return (
    <BgDemo title="Radar" note="Sweep, ping, fade">
      <Radar />
    </BgDemo>
  );
}
