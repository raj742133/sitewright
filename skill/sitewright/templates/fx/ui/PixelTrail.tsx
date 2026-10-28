'use client';
import { useEffect, useRef } from 'react';
import { createField, fitCanvas, mix, rgba, rng, useCoarsePointer, useReducedMotion, type CursorFxProps, type RGB } from './_cursor-kit';
import { Stage } from './_cursor-stage';

export interface PixelTrailProps extends CursorFxProps {
  /** Size of one square pixel in px. */
  size?: number;
  /** How long a pixel takes to fade out, in ms. */
  fade?: number;
}

/** Square pixels light up under the pointer and fade out in crisp steps, leaving a pixel-art trail. Drag on touch screens, tap for a burst; a ghost pointer paints when idle. Scoped to its box unless `global`. */
export default function PixelTrail({ children, className, style, global = false, idle = 'touch', size = 22, fade = 900 }: PixelTrailProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();

  useEffect(() => {
    const host = hostRef.current, canvas = layerRef.current;
    if (!host || !canvas) return;
    const rand = rng(7);
    let cols = 0, rows = 0, life = new Float32Array(0);
    const palette: RGB[] = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const mark = (cx: number, cy: number, v: number) => {
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
      const k = cy * cols + cx;
      if (life[k]! < v) life[k] = v;
    };
    const stamp = (x: number, y: number) => {
      const cx = Math.floor(x / size), cy = Math.floor(y / size);
      mark(cx, cy, 1);
      if (!reduced && rand() > 0.55) mark(cx + (rand() > 0.5 ? 1 : -1), cy + (rand() > 0.5 ? 1 : 0), 0.85);
    };
    const fx = createField(host, canvas, { global, idle, reduced, coarse }, {
      resize: (f) => { cols = Math.ceil(f.w / size); rows = Math.ceil(f.h / size); life = new Float32Array(cols * rows); },
      palette: (f) => {
        palette[0] = mix(f.pal.signal, [255, 255, 255], 0.45); palette[1] = f.pal.signal;
        palette[2] = mix(f.pal.signal, f.pal.primary, 0.55); palette[3] = f.pal.primary;
      },
      down: (f, x, y) => {
        const cx = Math.floor(x / size), cy = Math.floor(y / size);
        for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const d = Math.abs(i) + Math.abs(j); if (d <= 2) mark(cx + i, cy + j, 1 - d * 0.12); }
      },
      frame: (f) => {
        const ctx = fitCanvas(canvas, f);
        if (!ctx) return;
        if (reduced) life.fill(0);
        const live = f.seen && (f.inside || f.auto || reduced);
        if (live) {
          const jump = Math.hypot(f.x - f.lx, f.y - f.ly) > 320;
          const dx = jump ? 0 : f.x - f.lx, dy = jump ? 0 : f.y - f.ly, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (size * 0.5)));
          for (let s = 1; s <= Math.min(n, 60); s++) stamp((jump ? f.x : f.lx) + (dx * s) / n, (jump ? f.y : f.ly) + (dy * s) / n);
        }
        ctx.clearRect(0, 0, f.w, f.h);
        const dec = reduced ? 0 : f.dt / (fade / 1000);
        let any = false;
        const inset = Math.max(1, Math.round(size * 0.08));
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          const v = life[k]!;
          if (v <= 0) continue;
          const step = Math.min(3, Math.floor((1 - v) * 4));
          ctx.fillStyle = rgba(palette[step]!, Math.min(1, 0.25 + v * 0.85));
          ctx.fillRect(i * size + inset, j * size + inset, size - inset * 2, size - inset * 2);
          life[k] = v - dec > 0.02 ? v - dec : 0;
          if (life[k]! > 0) any = true;
        }
        return !reduced && any;
      },
    });
    return () => fx.dispose();
  }, [global, idle, reduced, coarse, size, fade]);

  return (
    <div ref={hostRef} className={`ui-pixel-trail-root ${className ?? ''}`} style={style}>
      <div className="ui-pixel-trail-content">{children}</div>
      <canvas ref={layerRef} className={`ui-pixel-trail-layer${global ? ' ui-pixel-trail-global' : ''}`} aria-hidden="true" />
    </div>
  );
}

export function Demo() {
  return (
    <PixelTrail idle="always">
      <Stage dark eyebrow="Pixel trail" title="Paint in squares" text="Every cell you cross lights up, then steps down to nothing." />
    </PixelTrail>
  );
}
