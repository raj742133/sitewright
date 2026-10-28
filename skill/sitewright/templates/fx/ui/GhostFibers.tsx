'use client';
import type { CSSProperties } from 'react';
import { DemoShell, clamp, lum, mixc, rgba, rng, useCanvasBg, type Frame } from './_bg-b-kit';

export interface GhostFibersProps {
  /** Number of fibres (default 64). */
  count?: number;
  /** Sway speed multiplier (default 1). */
  speed?: number;
  /** Pointer wind strength, 0..1 (default 0.8). */
  wind?: number;
  className?: string;
  style?: CSSProperties;
}
interface Fib { x: number; len: number; a0: number; ph: number; fr: number; k: number; wd: number; tone: number; tip: number }
const MAX = 140;
const FIB: Fib[] = (() => {
  const r = rng(31337);
  return Array.from({ length: MAX }, (_, i) => ({
    x: (i + r() * 0.8) / MAX, len: 0.38 + r() * 0.55, a0: (r() - 0.5) * 0.5, ph: r() * 6.28, fr: 0.5 + r() * 0.9, k: 0.6 + r() * 1.4, wd: 0.6 + r() * 1.2, tone: r(), tip: r(),
  }));
})();
const SEG = 22;

function draw(f: Frame, count: number, speed: number, wind: number) {
  const { ctx, w, h, pal } = f;
  const dark = lum(pal.surface) < 0.5;
  const t = f.t * speed;
  ctx.clearRect(0, 0, w, h);
  const n = clamp(Math.round(count), 8, MAX);
  const mx = f.px * w, my = f.py * h, rad = Math.max(70, Math.min(w, h) * 0.5);
  const col = [mixc(pal.primary, pal.ink, dark ? 0 : 0.2), mixc(pal.primary, pal.signal, 0.55), mixc(pal.ink, pal.surface, dark ? 0.35 : 0.5)];
  const tips: number[] = [];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const fb = FIB[Math.floor((i / n) * MAX)]!;
    const L = fb.len * h * 1.05, ds = L / SEG;
    let x = fb.x * w, y = h + 4, a = -Math.PI / 2 + fb.a0 * 0.8;
    const c = col[fb.tone < 0.55 ? 0 : fb.tone < 0.85 ? 1 : 2]!;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 1; s <= SEG; s++) {
      const u = s / SEG;
      a += (Math.sin(t * 0.55 * fb.fr + fb.ph + u * 3.2 * fb.k) * 0.075 + fb.a0 * 0.018) * (0.3 + u);
      // wind: bend away from the pointer, strongest near it
      const dx = x - mx, dy = y - my, d = Math.hypot(dx, dy);
      if (d < rad * 1.6) {
        const q = Math.exp(-(d * d) / (rad * rad)) * wind * (0.3 + f.hover * 0.7);
        const away = Math.atan2(dy, dx);
        let da = Math.atan2(Math.sin(away - a), Math.cos(away - a));
        da = clamp(da, -1.2, 1.2);
        a += da * q * 0.16;
      }
      x += Math.cos(a) * ds; y += Math.sin(a) * ds;
      ctx.lineTo(x, y);
    }
    const fade = ctx.createLinearGradient(fb.x * w, h, x, y);
    fade.addColorStop(0, rgba(c, 0.04)); fade.addColorStop(0.55, rgba(c, 0.32)); fade.addColorStop(1, rgba(c, 0.7));
    ctx.strokeStyle = fade; ctx.lineWidth = fb.wd; ctx.stroke();
    if (fb.tip < 0.45) tips.push(x, y, 1 + fb.tip * 2.5, fb.tone);
  }
  // glowing tips
  for (let i = 0; i < tips.length; i += 4) {
    const x = tips[i]!, y = tips[i + 1]!, r = tips[i + 2]!;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    const c = tips[i + 3]! < 0.55 ? pal.signal : pal.primary;
    g.addColorStop(0, rgba(c, 0.85)); g.addColorStop(0.3, rgba(c, 0.25)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
  }
  // misty floor
  const fl = ctx.createLinearGradient(0, h * 0.7, 0, h);
  fl.addColorStop(0, rgba(pal.surface, 0)); fl.addColorStop(1, rgba(mixc(pal.surface, pal.primary, 0.12), 0.75));
  ctx.fillStyle = fl; ctx.fillRect(0, h * 0.7, w, h * 0.3);
}

/**
 * Pale, ghostly fibres rising from the bottom edge like optical strands: each sways on its own slow wave,
 * fades towards the root and ends in a soft glowing tip. The pointer (listened on the parent) blows them
 * aside; on touch they sway alone. Fills its parent (first child of a `position:relative` section).
 * Decorative (aria-hidden); still frame with reduced motion.
 */
export default function GhostFibers({ count = 64, speed = 1, wind = 0.8, className, style }: GhostFibersProps) {
  const { wrapRef, canvasRef, status } = useCanvasBg((f) => draw(f, count, speed, wind), { fps: 45 });
  return (
    <div ref={wrapRef} className={'ui-ghost-fibers' + (className ? ' ' + className : '')} style={style} data-state={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-ghost-fibers-canvas" />
    </div>
  );
}

export function Demo() {
  return <DemoShell bg={<GhostFibers />} title="Ghost fibres" sub="Brush the strands aside." align="start" />;
}
