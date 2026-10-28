'use client';
import { useEffect, useRef } from 'react';
import { createField, ease, fitCanvas, mix, rgba, useCoarsePointer, useReducedMotion, type CursorFxProps } from './_cursor-kit';
import { Stage } from './_cursor-stage';

export interface GhostCursorProps extends CursorFxProps {
  /** Length of the afterimage trail in seconds. */
  trail?: number;
  /** Scale of the ghost pointer. */
  size?: number;
}

interface Pt { x: number; y: number; t: number }
interface Ring { x: number; y: number; t0: number }

// A classic pointer silhouette with its tip at (0,0).
const ARROW = 'M0 0 L0 17 L4.6 13 L7.4 19.5 L10 18.3 L7.2 12 L13 12 Z';

/** A translucent, glowing ghost of a pointer drifts a step behind the real one, trailing fading afterimages and a wavering wisp. A press sends a ring out. With no pointer (touch, or `idle="always"`) the ghost wanders and taps by itself. The real cursor is never hidden. Scoped to its box unless `global`. */
export default function GhostCursor({ children, className, style, global = false, idle = 'touch', trail = 0.55, size = 1.15 }: GhostCursorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();

  useEffect(() => {
    const host = hostRef.current, canvas = layerRef.current;
    if (!host || !canvas) return;
    const path = new Path2D(ARROW);
    const hist: Pt[] = [];
    const rings: Ring[] = [];
    let gx = 0, gy = 0, init = false, presence = 0, lastTap = 0;
    const fx = createField(host, canvas, { global, idle, reduced, coarse }, {
      down: (f, x, y) => { if (!reduced) rings.push({ x, y, t0: f.t }); },
      frame: (f) => {
        const ctx = fitCanvas(canvas, f);
        if (!ctx) return;
        const here = f.seen && (f.inside || f.auto);
        presence = reduced ? 1 : ease(presence, here ? 1 : 0, 5, f.dt);
        if (!init) { gx = f.x; gy = f.y; init = true; }
        if (reduced) { gx = f.x; gy = f.y; } else { gx = ease(gx, f.x, 7, f.dt); gy = ease(gy, f.y, 7, f.dt); }
        if (!reduced) {
          if (here || presence > 0.05) hist.push({ x: gx, y: gy, t: f.t });
          while (hist.length && f.t - hist[0]!.t > trail) hist.shift();
          if (f.auto && f.t - lastTap > 3.6) { lastTap = f.t; rings.push({ x: gx, y: gy, t0: f.t }); }
        }
        const { primary, signal } = f.pal;
        const glow = mix(primary, [255, 255, 255], 0.35);
        ctx.clearRect(0, 0, f.w, f.h);
        const bob = reduced ? 0 : Math.sin(f.t * 2.4) * 1.6;
        ctx.globalCompositeOperation = 'source-over';
        // wisp: a tapering, wavering tail through the recent positions
        if (hist.length > 3) {
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (let i = 1; i < hist.length; i++) {
            const a = hist[i - 1]!, b = hist[i]!, k = i / hist.length;
            const wob = Math.sin(f.t * 9 - i * 0.7) * 3 * (1 - k);
            ctx.strokeStyle = rgba(mix(signal, primary, 1 - k), presence * k * 0.45);
            ctx.lineWidth = 1 + k * 7 * size * 0.6;
            ctx.beginPath(); ctx.moveTo(a.x + wob, a.y); ctx.lineTo(b.x + Math.sin(f.t * 9 - (i + 1) * 0.7) * 3 * (1 - (i + 1) / hist.length), b.y); ctx.stroke();
          }
        }
        // afterimages
        const n = Math.min(5, hist.length);
        for (let s = n; s >= 1; s--) {
          const p = hist[Math.max(0, hist.length - 1 - s * 3)];
          if (!p) continue;
          const k = 1 - s / (n + 1);
          ctx.save(); ctx.translate(p.x, p.y + bob); ctx.scale(size * (0.7 + k * 0.3), size * (0.7 + k * 0.3));
          ctx.fillStyle = rgba(glow, presence * k * 0.22); ctx.fill(path); ctx.restore();
        }
        // the ghost itself
        ctx.save(); ctx.translate(gx, gy + bob); ctx.scale(size, size);
        ctx.shadowColor = rgba(glow, presence * 0.9); ctx.shadowBlur = 14;
        ctx.fillStyle = rgba(mix(glow, [255, 255, 255], 0.4), presence * 0.62); ctx.fill(path);
        ctx.shadowBlur = 0; ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(glow, presence * 0.95); ctx.stroke(path);
        ctx.restore();
        // click rings
        for (let r = rings.length - 1; r >= 0; r--) {
          const rg = rings[r]!, age = f.t - rg.t0;
          if (age > 0.9) { rings.splice(r, 1); continue; }
          ctx.strokeStyle = rgba(mix(signal, glow, age), (1 - age / 0.9) * 0.8 * presence);
          ctx.lineWidth = 2 - age;
          ctx.beginPath(); ctx.arc(rg.x, rg.y, 6 + age * 44, 0, 6.2832); ctx.stroke();
        }
        return !reduced && (here || presence > 0.01 || rings.length > 0 || hist.length > 1);
      },
    });
    return () => fx.dispose();
  }, [global, idle, reduced, coarse, trail, size]);

  return (
    <div ref={hostRef} className={`ui-ghost-cursor-root ${className ?? ''}`} style={style}>
      <div className="ui-ghost-cursor-content">{children}</div>
      <canvas ref={layerRef} className={`ui-ghost-cursor-layer${global ? ' ui-ghost-cursor-global' : ''}`} aria-hidden="true" />
    </div>
  );
}

export function Demo() {
  return (
    <GhostCursor idle="always">
      <Stage dark eyebrow="Ghost cursor" title="Haunt the page" text="A pale pointer drifts behind yours and leaves afterimages." />
    </GhostCursor>
  );
}
