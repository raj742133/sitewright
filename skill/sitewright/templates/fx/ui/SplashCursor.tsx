'use client';
import { useEffect, useRef } from 'react';
import { autopilotPath, createField, fitCanvas, mix, useCoarsePointer, useReducedMotion, type CursorFxProps, type Field } from './_cursor-kit';
import { Fluid } from './_cursor-fluid';
import { Stage } from './_cursor-stage';

export interface SplashCursorProps extends CursorFxProps {
  /** Grid cells along the longer side of the simulation (more = finer, slower). */
  resolution?: number;
  /** Size of a splash in px. */
  radius?: number;
  /** How long the colour lingers: seconds until it has mostly faded. */
  linger?: number;
}

/** Colour splashes into a small live fluid: moving the pointer stirs ink in the theme colours that swirls, curls and fades; a press bursts outward. Taps and drags work on touch, and a ghost pointer stirs it when idle. With reduced motion it shows a still frame. Scoped to its box unless `global`. */
export default function SplashCursor({ children, className, style, global = false, idle = 'touch', resolution = 72, radius = 34, linger = 2.6 }: SplashCursorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();

  useEffect(() => {
    const host = hostRef.current, canvas = layerRef.current;
    if (!host || !canvas) return;
    let sim: Fluid | null = null, small: HTMLCanvasElement | null = null, img: ImageData | null = null, sctx: CanvasRenderingContext2D | null = null;
    let hue = 0, lastCols = 0, lastRows = 0, prerolled = false;
    const col = (f: Field): [number, number, number] => {
      const m = mix(f.pal.primary, f.pal.signal, 0.5 + 0.5 * Math.sin(hue));
      return [m[0] / 255, m[1] / 255, m[2] / 255];
    };
    const build = (w: number, h: number) => {
      const long = Math.max(w, h), cols = Math.max(8, Math.round((w / long) * resolution)), rows = Math.max(8, Math.round((h / long) * resolution));
      if (cols === lastCols && rows === lastRows && sim) return;
      lastCols = cols; lastRows = rows; sim = new Fluid(cols, rows);
      small = document.createElement('canvas'); small.width = cols; small.height = rows;
      sctx = small.getContext('2d'); img = sctx ? sctx.createImageData(cols, rows) : null;
    };
    const stir = (f: Field, x: number, y: number, vx: number, vy: number, power: number) => {
      if (!sim) return;
      const k = sim.cols / f.w, cl = (v: number) => Math.max(-90, Math.min(90, v * k * 0.9));
      sim.splat(x * k, (y / f.h) * sim.rows, cl(vx), cl(vy), col(f), Math.max(1.8, radius * k), power);
    };
    const draw = (f: Field) => {
      const ctx = fitCanvas(canvas, f);
      if (!ctx || !sim || !small || !sctx || !img) return 0;
      const peak = sim.paint(img.data);
      sctx.putImageData(img, 0, 0);
      ctx.clearRect(0, 0, f.w, f.h);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(small, 0, 0, f.w, f.h);
      return peak;
    };
    const fx = createField(host, canvas, { global, idle, reduced, coarse }, {
      resize: (f) => { build(f.w, f.h); prerolled = false; },
      down: (f, x, y) => {
        if (reduced || !sim) return;
        for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.283; hue += 0.5; stir(f, x + Math.cos(a) * 8, y + Math.sin(a) * 8, Math.cos(a) * 420, Math.sin(a) * 420, 0.55); }
      },
      frame: (f) => {
        if (!sim) build(f.w, f.h);
        if (!sim) return;
        const preroll = !prerolled && !global && (reduced || idle === 'always' || (idle === 'touch' && coarse));
        if (!prerolled) {
          prerolled = true;
          if (preroll) {
            let px = autopilotPath(0.2, f.w, f.h);
            for (let s = 1; s <= 60; s++) {
              const p = autopilotPath(0.2 + s / 30, f.w, f.h);
              hue += 0.06; stir(f, p.x, p.y, (p.x - px.x) * 30, (p.y - px.y) * 30, 0.5);
              sim.step(1 / 30, 1.1, 0.5 / Math.max(1, linger * 0.4)); px = p;
            }
          }
        }
        if (reduced) { draw(f); return; }
        const sp = Math.hypot(f.vx, f.vy);
        if (f.seen && (f.inside || f.auto) && sp > 12) { hue += f.dt * 0.9; stir(f, f.x, f.y, f.vx * 0.9, f.vy * 0.9, Math.min(0.55, 0.12 + sp / 1400) * (f.auto ? 1.5 : 1)); }
        sim.step(Math.min(f.dt, 1 / 30), 1.1, 2.2 / linger);
        return draw(f) > 0.004;
      },
    });
    return () => fx.dispose();
  }, [global, idle, reduced, coarse, resolution, radius, linger]);

  return (
    <div ref={hostRef} className={`ui-splash-cursor-root ${className ?? ''}`} style={style}>
      <div className="ui-splash-cursor-content">{children}</div>
      <canvas ref={layerRef} className={`ui-splash-cursor-layer${global ? ' ui-splash-cursor-global' : ''}`} aria-hidden="true" />
    </div>
  );
}

export function Demo() {
  return (
    <SplashCursor idle="always">
      <Stage dark eyebrow="Splash cursor" title="Stir some colour" text="Ink in your theme colours swirls and fades." />
    </SplashCursor>
  );
}
