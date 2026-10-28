'use client';
import type { CSSProperties } from 'react';
import { BgDemo, clamp01, mixc, rgba, smooth, useBg2D, type Sketch } from './_bg-a';

export interface MagnetLinesProps {
  /** Grid pitch in px (default 30). */
  spacing?: number;
  /** Line length as a fraction of the pitch (default 0.62). */
  length?: number;
  /** Follow the pointer; without a pointer (or on touch) a slow virtual magnet roams (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A field of short lines that all turn to point at the pointer like iron filings, glowing from --primary to
 * --signal as they get closer. With no pointer a virtual magnet drifts through the field. Fills its parent
 * (`position:absolute; inset:0`): put it first inside a `position:relative` section. Decorative (aria-hidden);
 * static frame under reduced motion.
 */
export default function MagnetLines({ spacing = 30, length = 0.62, interactive = true, className, style }: MagnetLinesProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => {
      let ang = new Float32Array(0), cols = 0;
      return {
        frame(t, dt, e) {
          const { ctx, w, h, pal, ptr, dark, reduced } = e;
          ctx.fillStyle = rgba(pal.surface, 1);
          ctx.fillRect(0, 0, w, h);
          const s = Math.max(14, spacing);
          cols = Math.ceil(w / s);
          const rows = Math.ceil(h / s);
          if (ang.length !== cols * rows) ang = new Float32Array(cols * rows).fill(NaN);
          const live = interactive && ptr.inside;
          const mx = live ? ptr.x : w * (0.5 + 0.36 * Math.sin(t * 0.37)), my = live ? ptr.y : h * (0.5 + 0.34 * Math.sin(t * 0.53 + 1));
          const ox = (w - cols * s) / 2 + s / 2, oy = (h - rows * s) / 2 + s / 2;
          const L = s * length * 0.5, k = dt ? 1 - Math.exp(-dt * 9) : 1;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(2, s * 0.09);
          for (let j = 0; j < rows; j++) {
            for (let i = 0; i < cols; i++) {
              const x = ox + i * s, y = oy + j * s, idx = j * cols + i;
              const want = Math.atan2(my - y, mx - x);
              let a = ang[idx]!;
              if (Number.isNaN(a) || reduced) a = want;
              else { let d = want - a; d -= Math.round(d / 6.2832) * 6.2832; a += d * k; }
              ang[idx] = a;
              const near = smooth(260, 0, Math.hypot(mx - x, my - y));
              ctx.strokeStyle = rgba(mixc(pal.primary, pal.signal, clamp01(near * 1.2)), (dark ? 0.5 : 0.42) + 0.5 * near);
              const c = Math.cos(a) * L, sn = Math.sin(a) * L;
              ctx.beginPath(); ctx.moveTo(x - c, y - sn); ctx.lineTo(x + c, y + sn); ctx.stroke();
            }
          }
        },
      };
    },
    { pointer: interactive, fps: 45 },
  );
  return (
    <div ref={wrapRef} className={'ui-magnet-lines' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-magnet-lines-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Magnet lines" note="Move the pointer over me">
      <MagnetLines />
    </BgDemo>
  );
}
