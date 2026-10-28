'use client';
import type { CSSProperties } from 'react';
import { BgDemo, mixc, useBg2D, type Sketch } from './_bg-a';

export interface DitherProps {
  /** Pixel size in CSS px (default 3). */
  cell?: number;
  /** Animation speed multiplier (default 1). */
  speed?: number;
  /** Pointer raises a bump in the field (default true). Listens on the parent. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

const BAYER = (() => {
  // 8x8 ordered-dither threshold matrix, built by the standard recursive doubling.
  let m = [[0, 2], [3, 1]];
  for (let n = 2; n < 8; n *= 2) {
    const s = m.length, out: number[][] = Array.from({ length: s * 2 }, () => new Array<number>(s * 2).fill(0));
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const v = m[y]![x]! * 4;
      out[y]![x] = v; out[y]![x + s] = v + 2; out[y + s]![x] = v + 3; out[y + s]![x + s] = v + 1;
    }
    m = out;
  }
  return Float32Array.from(m.flat().map((v) => (v + 0.5) / 64));
})();

/**
 * An animated field of drifting waves quantised with an 8x8 ordered (Bayer) dither into big square pixels:
 * surface, then --primary, then --signal at the crests. Fills its parent: put it first inside a
 * `position:relative` section. Decorative; a single frame under reduced motion.
 */
export default function Dither({ cell = 3, speed = 1, interactive = true, className, style }: DitherProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => {
      const off = document.createElement('canvas');
      const octx = off.getContext('2d');
      if (!octx) throw new Error('2d');
      let img: ImageData | null = null, gw = 0, gh = 0, cs = 3;
      return {
        resize(e) {
          cs = Math.max(2, cell * (e.w > 900 ? 1.5 : 1));
          gw = Math.max(2, Math.ceil(e.w / cs)); gh = Math.max(2, Math.ceil(e.h / cs));
          off.width = gw; off.height = gh;
          img = octx.createImageData(gw, gh);
        },
        frame(t, _dt, e) {
          if (!img) return;
          const { pal, ptr } = e;
          const base = mixc(pal.surface, pal.primary, e.dark ? 0.1 : 0.06), mid = mixc(pal.surface, pal.primary, e.dark ? 0.75 : 0.85), hi = pal.signal;
          const d = img.data, tt = t * speed;
          const px = ptr.inside ? ptr.x / cs : -999, py = ptr.inside ? ptr.y / cs : -999;
          for (let y = 0; y < gh; y++) {
            for (let x = 0; x < gw; x++) {
              const fx = x / gw, fy = y / gh;
              let v = Math.sin(fx * 7 + tt * 0.7) + Math.sin(fy * 9 - tt * 0.5) + Math.sin((fx * 1.2 + fy) * 6 + tt * 0.35) + Math.sin(Math.hypot(fx - 0.5, (fy - 0.5) * 0.7) * 14 - tt * 0.9);
              v = 0.5 + v / 8;
              if (interactive) { const dd = Math.hypot(x - px, y - py); if (dd < 14) v += (1 - dd / 14) ** 2 * 0.5; }
              const th = BAYER[(y & 7) * 8 + (x & 7)]!;
              const c = v - 0.18 > th * 0.9 + 0.1 ? (v > 0.8 && v - 0.5 > th * 0.5 ? hi : mid) : base;
              const i = (y * gw + x) * 4;
              d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
            }
          }
          octx.putImageData(img, 0, 0);
          e.ctx.imageSmoothingEnabled = false;
          e.ctx.drawImage(off, 0, 0, gw * cs, gh * cs);
        },
        dispose() { off.width = off.height = 0; },
      };
    },
    { pointer: interactive, fps: 24 },
  );
  return (
    <div ref={wrapRef} className={'ui-dither' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-dither-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Dither" note="Ordered-dither wave field">
      <Dither />
    </BgDemo>
  );
}
