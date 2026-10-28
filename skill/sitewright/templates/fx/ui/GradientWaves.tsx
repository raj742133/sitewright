'use client';
import type { CSSProperties } from 'react';
import { DemoShell, clamp, mixc, rgba, useCanvasBg, type Frame } from './_bg-b-kit';

export interface GradientWavesProps {
  /** Number of stacked wave layers (default 5). */
  layers?: number;
  /** Drift speed multiplier (default 1). */
  speed?: number;
  /** The pointer raises a swell and shifts the layers in parallax (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

function draw(f: Frame, layers: number, speed: number, interactive: boolean) {
  const { ctx, w, h, pal } = f;
  const t = f.t * speed;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, rgba(mixc(pal.surface, pal.signal, 0.12), 1)); sky.addColorStop(1, rgba(mixc(pal.surface, pal.primary, 0.1), 1));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  const n = clamp(Math.round(layers), 2, 9);
  const step = Math.max(4, Math.round(w / 90));
  const mx = f.px * w;
  const par = interactive ? (f.px - 0.5) : 0;
  for (let k = 0; k < n; k++) {
    const d = k / (n - 1);               // 0 far .. 1 near
    const base = h * (0.3 + 0.55 * d) - (interactive ? (f.py - 0.5) * h * 0.05 * (1 - d) : 0);
    const amp = h * (0.035 + 0.06 * d);
    const fr = 1.4 + k * 0.45, sp = (0.22 + d * 0.3) * (k % 2 ? -1 : 1);
    const shift = par * 70 * (0.3 + d);
    const path = (x: number) => {
      const u = (x + shift) / w;
      let y = base + amp * Math.sin(u * fr * 6.283 + t * sp * 2 + k * 1.7) + amp * 0.45 * Math.sin(u * fr * 2.4 * 6.283 - t * sp * 3 + k);
      if (interactive) { const dx = (x - mx) / (w * 0.22); y -= amp * 1.6 * Math.exp(-dx * dx) * (0.3 + 0.7 * f.hover); }
      return y;
    };
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w + step; x += step) ctx.lineTo(x, path(x));
    ctx.lineTo(w + step, h); ctx.closePath();
    const top = mixc(pal.signal, pal.primary, 0.25 + d * 0.75), bot = mixc(pal.primary, pal.ink, 0.1 + d * 0.15);
    const g = ctx.createLinearGradient(0, base - amp * 2, 0, h);
    g.addColorStop(0, rgba(top, 0.55 + d * 0.3)); g.addColorStop(1, rgba(bot, 0.35 + d * 0.5));
    ctx.fillStyle = g; ctx.fill();
    // bright crest
    ctx.beginPath();
    for (let x = 0; x <= w + step; x += step) { const y = path(x); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.strokeStyle = rgba(mixc(top, [255, 255, 255], 0.5), 0.5); ctx.lineWidth = 1.2; ctx.stroke();
  }
}

/**
 * Layered gradient waves rolling in from the bottom: each layer is a filled wave blending --signal into --primary, with a
 * bright crest line. The pointer (listened on the parent) lifts a swell under it and slides the layers in parallax; on touch
 * the waves roll alone. Fills its parent (first child of a `position:relative` section). Decorative (aria-hidden); still
 * frame with reduced motion.
 */
export default function GradientWaves({ layers = 5, speed = 1, interactive = true, className, style }: GradientWavesProps) {
  const { wrapRef, canvasRef, status } = useCanvasBg((f) => draw(f, layers, speed, interactive), { fps: 45, pointer: interactive });
  return (
    <div ref={wrapRef} className={'ui-gradient-waves' + (className ? ' ' + className : '')} style={style} data-state={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-gradient-waves-canvas" />
    </div>
  );
}

export function Demo() {
  return <DemoShell bg={<GradientWaves />} title="Rolling gradients" sub="Raise a swell with your pointer." align="start" />;
}
