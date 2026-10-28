'use client';
import type { CSSProperties } from 'react';
import { DemoShell, clamp, lum, mixc, rgba, useCanvasBg, type Frame } from './_bg-b-kit';

export interface GradientAsciiProps {
  /** Characters from empty to dense (default ' .:-=+*#%@'). */
  ramp?: string;
  /** Character cell height in px; defaults to a size that suits the parent. */
  cell?: number;
  /** Animation speed multiplier (default 1). */
  speed?: number;
  className?: string;
  style?: CSSProperties;
}
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const BUCKETS = 6;

function draw(f: Frame, ramp: string, cell: number | undefined, speed: number) {
  const { ctx, w, h, pal } = f;
  const t = f.t * speed;
  const dark = lum(pal.surface) < 0.5;
  const fs = cell ? clamp(cell, 7, 28) : clamp(Math.round(Math.min(w / 40, 15)), 9, 15);
  ctx.font = `${fs}px ${MONO}`;
  ctx.textBaseline = 'top';
  const cw = Math.max(1, ctx.measureText('M').width), ch = Math.round(fs * 1.25);
  const cols = Math.ceil(w / cw) + 1, rows = Math.ceil(h / ch) + 1;
  ctx.clearRect(0, 0, w, h);
  const last = Math.max(1, ramp.length - 1);
  const lines: string[][] = Array.from({ length: BUCKETS }, () => new Array<string>(rows * (cols + 1)).fill(' '));
  const ax = f.px * cols, ay = f.py * rows;
  for (let r = 0; r < rows; r++) {
    const v = r / rows;
    for (let c = 0; c < cols; c++) {
      const u = c / cols;
      // animated gradient field (value) and hue position (g)
      let val = 0.5 + 0.28 * Math.sin(u * 5.2 + t * 0.6 + Math.sin(v * 3.1 - t * 0.4) * 1.4) + 0.22 * Math.sin((u * 0.7 + v) * 7 - t * 0.9);
      const dx = (c - ax) / (cols * 0.18), dy = ((r - ay) * 1.9) / (cols * 0.18);
      val += 0.5 * Math.exp(-(dx * dx + dy * dy)) * (0.35 + 0.65 * f.hover) * (0.7 + 0.3 * Math.sin(t * 3 - Math.hypot(dx, dy) * 3));
      val = clamp(val, 0, 0.999);
      const g = clamp(u * 0.7 + v * 0.3 + 0.18 * Math.sin(t * 0.3 + v * 2), 0, 0.999);
      const ch0 = ramp.charAt(Math.floor(val * last + 0.5));
      if (ch0 === ' ') continue;
      lines[Math.floor(g * BUCKETS)]![r * (cols + 1) + c] = ch0;
    }
  }
  const a = mixc(pal.primary, pal.ink, dark ? 0.0 : 0.2), b = mixc(pal.signal, pal.ink, dark ? 0.0 : 0.3);
  for (let k = 0; k < BUCKETS; k++) {
    ctx.fillStyle = rgba(mixc(a, b, k / (BUCKETS - 1)), dark ? 0.85 : 0.78);
    const buf = lines[k]!;
    for (let r = 0; r < rows; r++) {
      const s = buf.slice(r * (cols + 1), r * (cols + 1) + cols).join('');
      if (s.trim()) ctx.fillText(s, 0, r * ch);
    }
  }
}

/**
 * ASCII art shaded by an animated gradient: every character cell picks a glyph from a density ramp according to a
 * flowing colour field, and is tinted from --primary to --signal. The pointer (listened on the parent) raises a
 * bright, rippling bloom; on touch the bloom wanders on its own. Fills its parent (first child of a
 * `position:relative` section). Decorative (aria-hidden); a single still frame with reduced motion.
 */
export default function GradientAscii({ ramp = ' .:-=+*#%@', cell, speed = 1, className, style }: GradientAsciiProps) {
  const { wrapRef, canvasRef, status } = useCanvasBg((f) => draw(f, ramp || ' .:-=+*#%@', cell, speed), { fps: 24 });
  return (
    <div ref={wrapRef} className={'ui-gradient-ascii' + (className ? ' ' + className : '')} style={style} data-state={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-gradient-ascii-canvas" />
    </div>
  );
}

export function Demo() {
  return <DemoShell bg={<GradientAscii />} title="Text, shaded" sub="A gradient drawn entirely in characters." />;
}
