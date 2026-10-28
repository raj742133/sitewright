'use client';
import { useRef, type CSSProperties } from 'react';
import { clamp01, mix, useCanvas2D, type Frame } from './_motion-gl-2d';

export interface MetaBallsProps {
  /** Number of drifting blobs (default 7). */
  count?: number;
  /** Blob size as a fraction of the shorter side, 0.05..0.3 (default 0.14). */
  size?: number;
  /** The pointer carries an extra blob that merges with the others (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Gooey metaballs: blobs drift on looping paths and fuse where they meet, with a lit rim. A
 * low-resolution implicit field is evaluated on the CPU and stretched with smoothing, so it runs
 * without WebGL. Fills its parent. Decorative (aria-hidden); a fixed composition with reduced motion.
 */
export default function MetaBalls({ count = 7, size = 0.14, interactive = true, className, style }: MetaBallsProps) {
  const buf = useRef<{ c: HTMLCanvasElement; cw: number; ch: number; img: ImageData | null } | null>(null);
  const cur = useRef({ x: 0.5, y: 0.5, a: 0 });
  const { wrapRef, canvasRef } = useCanvas2D((f: Frame) => {
    const { ctx, w, h, t, pal, ptr, dt } = f;
    const cell = Math.max(3, Math.sqrt((w * h) / 52000));
    const cw = Math.max(8, Math.round(w / cell)), ch = Math.max(8, Math.round(h / cell));
    let b = buf.current;
    if (!b || b.cw !== cw || b.ch !== ch) {
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      const cx = c.getContext('2d');
      b = { c, cw, ch, img: cx ? cx.createImageData(cw, ch) : null };
      buf.current = b;
    }
    if (!b.img) return;
    const m = Math.min(w, h);
    const n = Math.max(1, Math.round(count));
    const bx: number[] = [], by: number[] = [], br: number[] = [];
    for (let i = 0; i < n; i++) {
      const ph = i * 2.399;
      bx.push(w * (0.5 + 0.36 * Math.sin(t * (0.23 + (i % 3) * 0.07) + ph)));
      by.push(h * (0.5 + 0.34 * Math.sin(t * (0.31 + (i % 4) * 0.05) + ph * 1.7)));
      br.push(m * size * (0.7 + 0.5 * ((i * 7) % 5) / 4));
    }
    const p = cur.current;
    const live = interactive && ptr.inside && !f.coarse && !f.reduced;
    if (live && p.a < 0.02) { p.x = ptr.x; p.y = ptr.y; }
    if (live) { const k = 1 - Math.pow(0.002, dt); p.x += (ptr.x - p.x) * k; p.y += (ptr.y - p.y) * k; }
    p.a += ((live ? 1 : 0) - p.a) * (1 - Math.pow(0.02, dt));
    if (p.a > 0.01) { bx.push(p.x); by.push(p.y); br.push(m * size * 1.15 * p.a); }
    const N = bx.length;
    const d = b.img.data;
    const A = pal.primary, B = pal.signal;
    for (let j = 0; j < ch; j++) {
      const y = ((j + 0.5) / ch) * h;
      for (let i = 0; i < cw; i++) {
        const x = ((i + 0.5) / cw) * w;
        let s = 0;
        for (let k = 0; k < N; k++) { const dx = x - bx[k]!, dy = y - by[k]!; s += (br[k]! * br[k]!) / (dx * dx + dy * dy + 1); }
        const o = (j * cw + i) * 4;
        const a = clamp01((s - 0.97) / 0.07);
        if (a <= 0) { d[o + 3] = 0; continue; }
        const rim = 1 - clamp01((s - 1) / 0.35);          // 1 at the edge, 0 inside
        const tone = clamp01(0.1 + 0.8 * (x / w) * 0.6 + 0.4 * (y / h) - 0.1);
        const base = mix(A, B, tone);
        const lit = mix(base, [255, 255, 255], 0.5 * rim * rim + 0.08);
        const deep = 1;
        d[o] = lit[0] * deep; d[o + 1] = lit[1] * deep; d[o + 2] = lit[2] * deep; d[o + 3] = a * 255;
      }
    }
    const cx = b.c.getContext('2d');
    if (!cx) return;
    cx.putImageData(b.img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(b.c, 0, 0, w, h);
  });
  return (
    <div ref={wrapRef} className={'ui-meta-balls' + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-meta-balls-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-meta-balls-stage">
      <MetaBalls />
      <span className="ui-meta-balls-label">Merge &amp; split</span>
    </div>
  );
}
