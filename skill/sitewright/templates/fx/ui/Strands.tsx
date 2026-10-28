'use client';
import { useRef, type CSSProperties } from 'react';
import { mix, rgba, useCanvas2D, type Frame } from './_motion-gl-2d';

export interface StrandsProps {
  /** Number of threads (default 30). */
  count?: number;
  /** Flow speed multiplier; 0 freezes (default 1). */
  speed?: number;
  /** Vertical extent of the bundle as a fraction of the height, 0.2..1 (default 0.7). */
  spread?: number;
  /** The pointer parts the threads as it passes (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A bundle of fine threads that braid and pinch as they flow across the box, parting around the
 * pointer. Canvas 2D; fills its parent (put it first inside a position:relative section). Decorative
 * (aria-hidden); static with reduced motion.
 */
export default function Strands({ count = 30, speed = 1, spread = 0.7, interactive = true, className, style }: StrandsProps) {
  const smooth = useRef({ x: -999, y: -999, a: 0 });
  const { wrapRef, canvasRef } = useCanvas2D((f: Frame) => {
    const { ctx, w, h, t, pal, ptr, dt } = f;
    const s = smooth.current;
    const live = interactive && ptr.inside && !f.coarse && !f.reduced;
    if (live) {
      if (s.a < 0.02) { s.x = ptr.x; s.y = ptr.y; }
      const k = 1 - Math.pow(0.0005, dt);
      s.x += (ptr.x - s.x) * k; s.y += (ptr.y - s.y) * k;
    }
    s.a += ((live ? 1 : 0) - s.a) * (1 - Math.pow(0.01, dt));
    const T = t * speed;
    const n = Math.max(2, Math.round(count));
    const step = Math.max(4, w / 160);
    const R = Math.max(40, Math.min(w, h) * 0.22);
    const half = (h * spread) / 2;
    ctx.lineWidth = 1.1;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5;
      const g = ctx.createLinearGradient(0, 0, w, 0);
      const c = mix(pal.primary, pal.signal, i / (n - 1));
      g.addColorStop(0, rgba(c, 0));
      g.addColorStop(0.18, rgba(c, 0.75));
      g.addColorStop(0.82, rgba(c, 0.75));
      g.addColorStop(1, rgba(c, 0));
      ctx.strokeStyle = g;
      ctx.beginPath();
      for (let x = -step; x <= w + step; x += step) {
        const q = x / w;
        const pinch = 0.18 + 0.82 * (0.5 + 0.5 * Math.sin(q * 9.4 - T * 0.55 + 0.6));
        const braid = Math.sin(q * 6.1 + T * 0.7 + u * 5.2) * 0.14 + Math.sin(q * 3.3 - T * 0.4 + u * 2.4) * 0.1;
        let y = h / 2 + half * (u * 2 * pinch + braid * (0.4 + pinch));
        if (s.a > 0.001) {
          const dx = x - s.x, dy = y - s.y;
          const k = Math.exp(-(dx * dx + dy * dy) / (R * R)) * s.a;
          y += (dy >= 0 ? 1 : -1) * k * R * 0.55;
        }
        if (x <= -step + 0.01) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
  return (
    <div ref={wrapRef} className={'ui-strands' + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-strands-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-strands-stage">
      <Strands />
      <span className="ui-strands-label">Drawn together</span>
    </div>
  );
}
