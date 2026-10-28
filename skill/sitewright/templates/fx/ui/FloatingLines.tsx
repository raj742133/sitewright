'use client';
import type { CSSProperties } from 'react';
import { DemoShell, clamp, mixc, rgba, rng, useCanvasBg, type Frame } from './_bg-b-kit';

export interface FloatingLinesProps {
  /** Number of lines (default 16). */
  lines?: number;
  /** Drift speed multiplier (default 1). */
  speed?: number;
  /** How far the pointer pushes the lines aside, 0..1 (default 0.7). */
  push?: number;
  className?: string;
  style?: CSSProperties;
}

interface Ln { y: number; a1: number; f1: number; s1: number; p1: number; a2: number; f2: number; s2: number; p2: number; wd: number; dot: number; ds: number }
const MAX = 40;
const SPEC: Ln[] = (() => {
  const r = rng(2024);
  return Array.from({ length: MAX }, (_, i) => ({
    y: 0.08 + 0.84 * (i / (MAX - 1)), a1: 0.03 + r() * 0.07, f1: 1.2 + r() * 2.4, s1: 0.25 + r() * 0.5, p1: r() * 6.28,
    a2: 0.01 + r() * 0.03, f2: 4 + r() * 5, s2: -0.3 - r() * 0.5, p2: r() * 6.28, wd: 0.8 + r() * 1.3, dot: r(), ds: 0.03 + r() * 0.05,
  }));
})();

function draw(f: Frame, count: number, speed: number, push: number) {
  const { ctx, w, h, pal } = f;
  const t = f.t * speed;
  ctx.clearRect(0, 0, w, h);
  const n = clamp(Math.round(count), 3, MAX);
  const seg = Math.max(24, Math.min(90, Math.round(w / 9)));
  const gr = ctx.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, rgba(pal.primary, 0)); gr.addColorStop(0.2, rgba(pal.primary, 1)); gr.addColorStop(0.65, rgba(mixc(pal.primary, pal.signal, 0.7), 1)); gr.addColorStop(1, rgba(pal.signal, 0));
  const mx = f.px * w, my = f.py * h, rad = Math.max(60, Math.min(w, h) * 0.45);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let k = 0; k < n; k++) {
    const l = SPEC[Math.floor((k / (n - 1)) * (MAX - 1))]!;
    const depth = k / (n - 1);
    const by = (0.08 + 0.84 * depth) * h;
    ctx.beginPath();
    let lastX = 0, lastY = 0;
    for (let i = 0; i <= seg; i++) {
      const u = i / seg, x = u * w;
      let y = by + h * (l.a1 * Math.sin(u * l.f1 * 3.14 + t * l.s1 + l.p1) + l.a2 * Math.sin(u * l.f2 * 3.14 + t * l.s2 + l.p2));
      const dx = (x - mx) / rad, dy = (y - my) / rad;
      const d2 = dx * dx + dy * dy;
      if (d2 < 4) { const q = Math.exp(-d2 * 1.4); y += (dy / Math.sqrt(dy * dy + 0.03)) * q * rad * 0.34 * push * (0.35 + f.hover * 0.65); }
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      lastX = x; lastY = y;
    }
    void lastX; void lastY;
    ctx.strokeStyle = gr;
    ctx.globalAlpha = 0.18 + 0.5 * (0.35 + 0.65 * Math.sin(depth * Math.PI));
    ctx.lineWidth = l.wd * (0.7 + depth * 0.6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // a few bright beads drifting along some of the lines
  for (let k = 0; k < n; k += 3) {
    const l = SPEC[Math.floor((k / (n - 1)) * (MAX - 1))]!;
    const u = (l.dot + t * l.ds) % 1, x = u * w, depth = k / (n - 1);
    let y = (0.08 + 0.84 * depth) * h + h * (l.a1 * Math.sin(u * l.f1 * 3.14 + t * l.s1 + l.p1) + l.a2 * Math.sin(u * l.f2 * 3.14 + t * l.s2 + l.p2));
    const dx = (x - mx) / rad, dy = (y - my) / rad, d2 = dx * dx + dy * dy;
    if (d2 < 4) y += (dy / Math.sqrt(dy * dy + 0.03)) * Math.exp(-d2 * 1.4) * rad * 0.34 * push * (0.35 + f.hover * 0.65);
    const fade = Math.sin(u * Math.PI);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
    g.addColorStop(0, rgba(pal.signal, 0.9 * fade)); g.addColorStop(1, rgba(pal.signal, 0));
    ctx.fillStyle = g; ctx.fillRect(x - 9, y - 9, 18, 18);
  }
}

/**
 * Many thin lines floating across the width, each swaying on its own slow waves with a few glowing beads
 * drifting along them. Lines bend away from the pointer (listened on the parent) and drift on their own on
 * touch. Fills its parent (first child of a `position:relative` section). Decorative (aria-hidden); still frame
 * with reduced motion.
 */
export default function FloatingLines({ lines = 16, speed = 1, push = 0.7, className, style }: FloatingLinesProps) {
  const { wrapRef, canvasRef, status } = useCanvasBg((f) => draw(f, lines, speed, push), { fps: 45 });
  return (
    <div ref={wrapRef} className={'ui-floating-lines' + (className ? ' ' + className : '')} style={style} data-state={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-floating-lines-canvas" />
    </div>
  );
}

export function Demo() {
  return <DemoShell bg={<FloatingLines />} title="Lines in motion" sub="Sweep across them to part the lines." />;
}
