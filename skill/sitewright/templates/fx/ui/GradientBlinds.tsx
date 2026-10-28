'use client';
import type { CSSProperties } from 'react';
import { DemoShell, clamp, mixc, rgba, useCanvasBg, type Frame } from './_bg-b-kit';

export interface GradientBlindsProps {
  /** Approximate slat width in px (default 34). */
  slat?: number;
  /** Drift speed multiplier (default 1). */
  speed?: number;
  /** Slats near the pointer turn to face it (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

function draw(f: Frame, slat: number, speed: number, interactive: boolean) {
  const { ctx, w, h, pal } = f;
  const t = f.t * speed;
  const n = clamp(Math.round(w / clamp(slat, 12, 120)), 4, 60);
  const pitch = w / n;
  // the wall behind the blinds
  const wall = ctx.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, rgba(mixc(pal.surface, pal.primary, 0.18), 1)); wall.addColorStop(1, rgba(mixc(pal.surface, pal.signal, 0.14), 1));
  ctx.fillStyle = wall; ctx.fillRect(0, 0, w, h);
  const c0 = pal.primary, c1 = mixc(pal.primary, pal.signal, 0.55), c2 = pal.signal;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const cx = u * w;
    // each slat's turn: a travelling wave, plus facing the pointer
    let turn = Math.sin(t * 0.55 + i * 0.42) * 0.85 + Math.sin(t * 0.21 - i * 0.13) * 0.4;
    if (interactive) {
      const d = (f.px - u) * n * 0.22;
      turn += clamp(-d, -1.6, 1.6) * Math.exp(-d * d * 0.6) * (0.55 + 0.45 * f.hover) * 1.4;
    }
    const ang = clamp(turn, -1.35, 1.35);
    const face = Math.cos(ang);
    const sw = Math.max(pitch * 0.14, pitch * 0.94 * Math.abs(face));
    const x0 = cx - sw / 2;
    // the gradient slides along the row of slats
    const gp = (u * 0.8 + t * 0.045 + 0.1 * Math.sin(t * 0.3 + u * 4)) % 1;
    const gq = (gp + 0.35) % 1;
    const col = (p: number) => (p < 0.5 ? mixc(c0, c1, p * 2) : mixc(c1, c2, (p - 0.5) * 2));
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(col(gp), 1)); g.addColorStop(1, rgba(col(gq), 1));
    ctx.fillStyle = g; ctx.fillRect(x0, 0, sw, h);
    // light on the slat as it turns (bright edge when tilting up, dark when down)
    const shade = Math.sin(ang);
    const sh = ctx.createLinearGradient(x0, 0, x0 + sw, 0);
    const hi = shade > 0 ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
    const amt = Math.abs(shade) * 0.26;
    sh.addColorStop(0, hi + amt + ')'); sh.addColorStop(0.5, hi + amt * 0.15 + ')'); sh.addColorStop(1, hi + amt * 0.7 + ')');
    ctx.fillStyle = sh; ctx.fillRect(x0, 0, sw, h);
    // soft shadow cast on the wall
    const sg = ctx.createLinearGradient(x0 + sw, 0, x0 + sw + pitch * 0.4, 0);
    sg.addColorStop(0, 'rgba(0,0,0,.09)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.fillRect(x0 + sw, 0, pitch * 0.4, h);
  }
}

/**
 * A row of vertical blinds filled with a drifting brand gradient: slats swing on a travelling wave, catching and losing
 * light as they turn, and the ones near the pointer (listened on the parent) rotate to face it. On touch the wave
 * runs alone. Fills its parent (first child of a `position:relative` section). Decorative (aria-hidden); still frame
 * with reduced motion.
 */
export default function GradientBlinds({ slat = 34, speed = 1, interactive = true, className, style }: GradientBlindsProps) {
  const { wrapRef, canvasRef, status } = useCanvasBg((f) => draw(f, slat, speed, interactive), { fps: 45, pointer: interactive });
  return (
    <div ref={wrapRef} className={'ui-gradient-blinds' + (className ? ' ' + className : '')} style={style} data-state={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-gradient-blinds-canvas" />
    </div>
  );
}

export function Demo() {
  return <DemoShell bg={<GradientBlinds />} title="Open the blinds" sub="Slats turn to follow your pointer." />;
}
