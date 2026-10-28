'use client';
import type { CSSProperties } from 'react';
import { BgDemo, rgba, useBg2D, type Sketch } from './_bg-a';
import { follow, ramp, wash, type Follow } from './_bg-f';

export interface TopographyProps {
  /** Number of contour levels (default 14). */
  levels?: number;
  /** Terrain drift speed multiplier (default 1). */
  speed?: number;
  /** The pointer raises a hill under it (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/* marching-squares edge pairs per case (corner bits: tl 8, tr 4, br 2, bl 1); edges 0 top, 1 right, 2 bottom, 3 left */
const SEG: number[][] = [[], [3, 2], [2, 1], [3, 1], [0, 1], [0, 1, 3, 2], [0, 2], [0, 3], [0, 3], [0, 2], [0, 3, 1, 2], [0, 1], [3, 1], [2, 1], [3, 2], []];

/**
 * An animated contour map: a slowly drifting height field traced into iso-lines with marching squares, every
 * fourth line heavier in --signal, the rest --primary. Fills its parent: put it first inside a
 * `position:relative` section. Decorative; a still frame under reduced motion.
 */
export default function Topography({ levels = 14, speed = 1, interactive = true, className, style }: TopographyProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => {
      const f: Follow = { x: 0, y: 0, a: 0 };
      let cols = 0, rows = 0, cell = 16, field = new Float32Array(0);
      const nl = Math.max(4, Math.min(30, Math.round(levels)));
      return {
        resize(e) {
          cell = Math.max(12, Math.sqrt((e.w * e.h) / 5200));
          cols = Math.ceil(e.w / cell) + 1; rows = Math.ceil(e.h / cell) + 1;
          field = new Float32Array((cols + 1) * (rows + 1));
        },
        frame(t, dt, e) {
          const { ctx, w, h, dark } = e;
          wash(e, 0.7);
          follow(f, e, dt, interactive);
          const tt = t * speed * 0.16, s = 1 / Math.max(w, h) * 6.2832;
          const cw = cols + 1;
          const hr = 120 + w * 0.05;
          for (let j = 0; j <= rows; j++) {
            for (let i = 0; i < cw; i++) {
              const x = i * cell, y = j * cell, u = x * s, v = y * s;
              let z = Math.sin(u * 0.9 + tt * 1.3 + Math.sin(v * 0.7 + tt)) + Math.sin(v * 1.1 - tt * 1.1 + Math.cos(u * 0.8 - tt * 0.6) * 1.4)
                + 0.7 * Math.sin((u + v) * 1.7 + tt * 0.8) + 0.35 * Math.sin(u * 3.1 - v * 2.3 - tt * 1.5);
              if (f.a > 0.01) { const dx = x - f.x, dy = y - f.y; z += 2.6 * f.a * Math.exp(-(dx * dx + dy * dy) / (2 * hr * hr)); }
              field[j * cw + i] = z;
            }
          }
          const span = 5.4, lo = -2.7;
          ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          for (let L = 0; L < nl; L++) {
            const lv = lo + ((L + 0.5) / nl) * span, major = L % 4 === 0;
            const c = ramp(e, (L + 0.5) / nl);
            ctx.beginPath();
            for (let j = 0; j < rows; j++) {
              for (let i = 0; i < cols; i++) {
                const a = field[j * cw + i]!, b = field[j * cw + i + 1]!, c2 = field[(j + 1) * cw + i + 1]!, d = field[(j + 1) * cw + i]!;
                const k = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c2 > lv ? 2 : 0) | (d > lv ? 1 : 0);
                const sg = SEG[k]!;
                if (!sg.length) continue;
                const x0 = i * cell, y0 = j * cell;
                for (let m = 0; m < sg.length; m += 2) {
                  for (let q = 0; q < 2; q++) {
                    const ed = sg[m + q]!;
                    let px: number, py: number;
                    if (ed === 0) { px = x0 + cell * ((lv - a) / (b - a)); py = y0; }
                    else if (ed === 1) { px = x0 + cell; py = y0 + cell * ((lv - b) / (c2 - b)); }
                    else if (ed === 2) { px = x0 + cell * ((lv - d) / (c2 - d)); py = y0 + cell; }
                    else { px = x0; py = y0 + cell * ((lv - a) / (d - a)); }
                    if (q === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                  }
                }
              }
            }
            ctx.strokeStyle = rgba(c, major ? (dark ? 0.8 : 0.7) : dark ? 0.42 : 0.36);
            ctx.lineWidth = major ? 1.6 : 0.9;
            ctx.stroke();
          }
        },
      };
    },
    { pointer: interactive, fps: 30 },
  );
  return (
    <div ref={wrapRef} className={'ui-topography' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-topography-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Topography" note="Drifting contour lines">
      <Topography />
    </BgDemo>
  );
}
