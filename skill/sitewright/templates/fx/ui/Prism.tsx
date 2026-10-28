'use client';
import type { CSSProperties } from 'react';
import { BgDemo, clamp01, mixc, rgba, type RGB, type Sketch } from './_bg-a';
import { Canvas2DBg } from './_bg-e';

export interface PrismProps {
  /** Drift speed multiplier (default 1). */
  speed?: number;
  /** Number of colour bands in the fan (default 7). */
  bands?: number;
  /** The pointer's height tilts the incoming beam (default true, listens on the parent). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A beam of light enters a glass prism from the left and leaves as a fan of colour bands, ordered from --primary
 * through --signal, that breathes and swings as the beam drifts; the pointer's height tilts the incoming beam.
 * Fills its parent (`position:absolute; inset:0`): put it first inside a `position:relative` section.
 * Decorative (aria-hidden); a still frame under reduced motion.
 */
export default function Prism({ speed = 1, bands = 7, interactive = true, className, style }: PrismProps) {
  const make = (): Sketch => {
    let tilt = 0;
    return {
      frame(t, dt, e) {
        const { ctx, w, h, pal, ptr, dark } = e;
        const tt = t * speed;
        const bg = ctx.createRadialGradient(w * 0.55, h * 0.5, 0, w * 0.55, h * 0.5, Math.max(w, h) * 0.8);
        bg.addColorStop(0, rgba(mixc(pal.surface, pal.primary, dark ? 0.22 : 0.1), 1));
        bg.addColorStop(1, rgba(pal.surface, 1));
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        const idle = Math.sin(tt * 0.42) * 0.2 + Math.sin(tt * 0.93 + 1) * 0.05;
        const want = interactive && ptr.inside ? ((ptr.y / h) - 0.5) * 0.7 : idle;
        tilt += (want - tilt) * (dt ? 1 - Math.exp(-dt * 4) : 1);
        const cx = w * 0.46, cy = h * 0.52, s = Math.min(w * 0.5, h * 0.78);
        const top: [number, number] = [cx, cy - s * 0.5], bl: [number, number] = [cx - s * 0.5, cy + s * 0.37], br: [number, number] = [cx + s * 0.5, cy + s * 0.37];
        const at = (a: [number, number], b: [number, number], f: number): [number, number] => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
        const E = at(top, bl, 0.58), X = at(top, br, 0.5 + tilt * 0.35);
        const L = Math.hypot(w, h) * 1.1;
        const beamCol: RGB = dark ? pal.ink : mixc(pal.ink, pal.primary, 0.35);
        const glowOp: GlobalCompositeOperation = dark ? 'lighter' : 'source-over';
        // incoming beam
        const ang = tilt * 0.9;
        const sx = E[0] - Math.cos(ang) * L, sy = E[1] - Math.sin(ang) * L;
        const ig = ctx.createLinearGradient(sx, sy, E[0], E[1]);
        ig.addColorStop(0, rgba(beamCol, 0));
        ig.addColorStop(Math.max(0, 1 - Math.max(w, h) * 0.7 / L), rgba(beamCol, 0));
        ig.addColorStop(1, rgba(beamCol, 0.95));
        ctx.lineCap = 'round';
        ctx.strokeStyle = ig;
        ctx.lineWidth = Math.max(8, s * 0.07);
        ctx.globalAlpha = 0.18;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(E[0], E[1]); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = Math.max(2.5, s * 0.022);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(E[0], E[1]); ctx.stroke();
        // inside the glass
        ctx.strokeStyle = rgba(beamCol, 0.8);
        ctx.lineWidth = Math.max(1.5, s * 0.012);
        ctx.beginPath(); ctx.moveTo(E[0], E[1]); ctx.lineTo(X[0], X[1]); ctx.stroke();
        // fan of bands
        const n = Math.max(3, Math.min(12, Math.round(bands)));
        const mid = tilt * -0.55 + 0.12 + Math.sin(tt * 0.3) * 0.03;
        const spread = 0.34 + Math.sin(tt * 0.6) * 0.04;
        const end: RGB = dark ? pal.ink : mixc(pal.signal, pal.ink, 0.3);
        const ramp = (f: number): RGB => {
          const stops: RGB[] = [mixc(pal.primary, pal.ink, dark ? 0.1 : 0.3), pal.primary, mixc(pal.primary, pal.signal, 0.5), pal.signal, mixc(pal.signal, end, 0.5)];
          const x = clamp01(f) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x));
          return mixc(stops[i]!, stops[i + 1]!, x - i);
        };
        ctx.globalCompositeOperation = glowOp;
        for (let i = 0; i < n; i++) {
          const a0 = mid - spread / 2 + (spread * i) / n - 0.002, a1 = mid - spread / 2 + (spread * (i + 1)) / n + 0.002;
          const col = ramp(i / (n - 1));
          const p0: [number, number] = [X[0] + Math.cos(a0) * L, X[1] + Math.sin(a0) * L], p1: [number, number] = [X[0] + Math.cos(a1) * L, X[1] + Math.sin(a1) * L];
          const g = ctx.createLinearGradient(X[0], X[1], X[0] + Math.cos(mid) * L * 0.55, X[1] + Math.sin(mid) * L * 0.55);
          g.addColorStop(0, rgba(col, dark ? 0.85 : 0.8));
          g.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(X[0], X[1]); ctx.lineTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.closePath(); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        // the prism itself
        ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(br[0], br[1]); ctx.lineTo(bl[0], bl[1]); ctx.closePath();
        ctx.fillStyle = rgba(dark ? pal.ink : pal.surface, dark ? 0.07 : 0.4);
        ctx.fill();
        ctx.lineJoin = 'round';
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = rgba(pal.ink, dark ? 0.55 : 0.5);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(bl[0], bl[1]);
        ctx.strokeStyle = rgba(dark ? pal.ink : pal.surface, 0.9);
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // hot spot where the light leaves
        const hs = ctx.createRadialGradient(X[0], X[1], 0, X[0], X[1], s * 0.28);
        hs.addColorStop(0, rgba(beamCol, dark ? 0.7 : 0.35));
        hs.addColorStop(1, rgba(beamCol, 0));
        ctx.globalCompositeOperation = glowOp;
        ctx.fillStyle = hs;
        ctx.fillRect(X[0] - s, X[1] - s, s * 2, s * 2);
        ctx.globalCompositeOperation = 'source-over';
      },
    };
  };
  return <Canvas2DBg cls="ui-prism" make={make} opts={{ pointer: interactive, fps: 45 }} className={className} style={style} />;
}

export function Demo() {
  return (
    <BgDemo title="Prism" note="One beam in, a spectrum out">
      <Prism />
    </BgDemo>
  );
}
