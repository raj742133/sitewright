'use client';
import type { CSSProperties } from 'react';
import { BgDemo, clamp01, mixc, rgba, smooth, useBg2D, type Sketch } from './_bg-a';

export interface PatternWavesProps {
  /** Repeating motif (default 'dots'). */
  shape?: 'dots' | 'diamonds' | 'crosses';
  /** Pattern pitch in px (default 22). */
  size?: number;
  /** Wave speed multiplier (default 1). */
  speed?: number;
  /** Pointer sends a ripple through the pattern (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A repeating pattern (dots, diamonds or crosses) bent and resized by travelling waves, so the lattice appears to
 * swell and ripple across the section; the colour drifts from --primary to --signal with the crests. Fills its parent
 * (`position:absolute; inset:0`): put it first inside a `position:relative` section. Decorative (aria-hidden);
 * static frame under reduced motion.
 */
export default function PatternWaves({ shape = 'dots', size = 22, speed = 1, interactive = true, className, style }: PatternWavesProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => ({
      frame(t, _dt, e) {
        const { ctx, w, h, pal, ptr, dark } = e;
        ctx.fillStyle = rgba(pal.surface, 1);
        ctx.fillRect(0, 0, w, h);
        const s = Math.max(10, size), cols = Math.ceil(w / s) + 2, rows = Math.ceil(h / s) + 2;
        const tt = t * speed * 0.8;
        const ox = (w - (cols - 2) * s) / 2, oy = (h - (rows - 2) * s) / 2;
        ctx.lineCap = 'round';
        for (let j = -1; j < rows - 1; j++) {
          for (let i = -1; i < cols - 1; i++) {
            const bx = ox + i * s, by = oy + j * s;
            const f = Math.sin(bx * 0.016 + tt) + Math.sin(by * 0.02 - tt * 0.8) + Math.sin((bx * 0.6 + by * 0.8) * 0.012 + tt * 0.5);
            let v = clamp01(0.5 + f / 6);
            let x = bx + Math.cos(f * 1.2) * s * 0.28, y = by + Math.sin(f * 1.2) * s * 0.28;
            if (interactive && ptr.inside) {
              const d = Math.hypot(bx - ptr.x, by - ptr.y);
              const ring = Math.sin(d * 0.05 - tt * 4) * Math.exp(-d / 150);
              v = clamp01(v + ring * 0.45);
              x += ((bx - ptr.x) / (d + 1)) * ring * 6; y += ((by - ptr.y) / (d + 1)) * ring * 6;
            }
            const r = s * (0.07 + 0.3 * smooth(0.1, 0.9, v));
            const col = mixc(pal.primary, pal.signal, smooth(0.55, 0.9, v));
            ctx.fillStyle = rgba(col, (dark ? 0.45 : 0.4) + 0.5 * v);
            ctx.strokeStyle = ctx.fillStyle;
            if (shape === 'dots') { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); }
            else if (shape === 'diamonds') { ctx.beginPath(); ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 1.2, y); ctx.lineTo(x, y + r * 1.2); ctx.lineTo(x - r * 1.2, y); ctx.closePath(); ctx.fill(); }
            else { ctx.lineWidth = Math.max(1.5, r * 0.5); ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke(); }
          }
        }
      },
    }),
    { pointer: interactive, fps: 45 },
  );
  return (
    <div ref={wrapRef} className={'ui-pattern-waves' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-pattern-waves-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Pattern waves" note="A lattice that swells and ripples">
      <PatternWaves />
    </BgDemo>
  );
}
