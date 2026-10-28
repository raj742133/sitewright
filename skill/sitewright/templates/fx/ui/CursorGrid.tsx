'use client';
import { useEffect, useRef } from 'react';
import { createField, fitCanvas, mix, rgba, useCoarsePointer, useReducedMotion, type CursorFxProps, type RGB } from './_cursor-kit';
import { Stage } from './_cursor-stage';

export interface CursorGridProps extends CursorFxProps {
  /** Distance between dots in px. */
  spacing?: number;
  /** How far the pointer's influence reaches, in px. */
  reach?: number;
  /** How far dots are pushed away from the pointer at full strength, in px. */
  push?: number;
}

interface Ripple { x: number; y: number; t0: number }

/** A lattice of dots that swell, warm up and bend away from the pointer, then cool down again. Taps send a ring through the grid; with no pointer on touch screens a ghost pointer wanders over it. Scoped to its box unless `global`. */
export default function CursorGrid({ children, className, style, global = false, idle = 'touch', spacing = 26, reach = 150, push = 9 }: CursorGridProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();

  useEffect(() => {
    const host = hostRef.current, canvas = layerRef.current;
    if (!host || !canvas) return;
    let cols = 0, rows = 0, gap = spacing, ox = 0, oy = 0;
    let heat = new Float32Array(0);
    const ripples: Ripple[] = [];
    const ramp: string[] = [];
    const buildRamp = (muted: RGB, a: RGB, b: RGB) => {
      ramp.length = 0;
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        ramp.push(rgba(t < 0.6 ? mix(muted, a, t / 0.6) : mix(a, b, (t - 0.6) / 0.4), 0.3 + 0.7 * Math.min(1, t * 1.3)));
      }
    };
    const layout = (w: number, h: number) => {
      gap = spacing;
      while ((w / gap) * (h / gap) > 3600) gap += 4;
      cols = Math.max(1, Math.floor(w / gap) + 1); rows = Math.max(1, Math.floor(h / gap) + 1);
      ox = (w - (cols - 1) * gap) / 2; oy = (h - (rows - 1) * gap) / 2;
      heat = new Float32Array(cols * rows);
    };
    const fx = createField(host, canvas, { global, idle, reduced, coarse }, {
      resize: (f) => layout(f.w, f.h),
      palette: (f) => buildRamp(f.pal.muted, f.pal.primary, f.pal.signal),
      down: (f, x, y) => { if (!reduced) ripples.push({ x, y, t0: f.t }); },
      frame: (f) => {
        const ctx = fitCanvas(canvas, f);
        if (!ctx) return;
        if (!heat.length) layout(f.w, f.h);
        const decay = reduced ? 0 : Math.exp(-f.dt * 2.4);
        const active = f.seen && (f.inside || f.auto || reduced);
        const r2 = reach * reach;
        let alive = false;
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          const cx = ox + i * gap, cy = oy + j * gap;
          let v = heat[k]! * decay;
          if (active) {
            const dx = cx - f.x, dy = cy - f.y, d2 = dx * dx + dy * dy;
            if (d2 < r2) { const s = 1 - Math.sqrt(d2) / reach; v = Math.max(reduced ? 0 : v, s * s); } else if (reduced) v = 0;
          } else if (reduced) v = 0;
          for (const rp of ripples) {
            const age = f.t - rp.t0, d = Math.hypot(cx - rp.x, cy - rp.y), band = Math.abs(d - age * 420);
            if (band < 46) v = Math.max(v, (1 - band / 46) * Math.max(0, 1 - age / 1.1) * 0.95);
          }
          if (v < 0.004) v = 0; else alive = true;
          heat[k] = v;
        }
        for (let n = ripples.length - 1; n >= 0; n--) if (f.t - ripples[n]!.t0 > 1.1) ripples.splice(n, 1);
        ctx.clearRect(0, 0, f.w, f.h);
        if (!ramp.length) buildRamp(f.pal.muted, f.pal.primary, f.pal.signal);
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const v = heat[j * cols + i]!;
          let x = ox + i * gap, y = oy + j * gap;
          if (v > 0 && active) {
            const dx = x - f.x, dy = y - f.y, d = Math.hypot(dx, dy) || 1;
            x += (dx / d) * push * v; y += (dy / d) * push * v;
          }
          ctx.fillStyle = ramp[Math.min(16, Math.round(v * 16))]!;
          ctx.beginPath(); ctx.arc(x, y, 1.3 + v * 3.6, 0, 6.2832); ctx.fill();
        }
        return !reduced && (alive || ripples.length > 0);
      },
    });
    return () => fx.dispose();
  }, [global, idle, reduced, coarse, spacing, reach, push]);

  return (
    <div ref={hostRef} className={`ui-cursor-grid-root ${className ?? ''}`} style={style}>
      <canvas ref={layerRef} className={`ui-cursor-grid-layer${global ? ' ui-cursor-grid-global' : ''}`} aria-hidden="true" />
      <div className="ui-cursor-grid-content">{children}</div>
    </div>
  );
}

export function Demo() {
  return (
    <CursorGrid idle="always">
      <Stage dark eyebrow="Cursor grid" title="Warm the lattice" text="Dots swell and bend away from the pointer, then cool." />
    </CursorGrid>
  );
}
