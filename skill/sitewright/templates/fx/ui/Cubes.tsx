'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion, watchLive } from './_t2';

export interface CubesProps {
  /** Target cube edge in px; the grid fills the box with as many as fit (default 44, capped at ~160 cubes). */
  cell?: number;
  /** Gap between cubes in px (default 6). */
  gap?: number;
  /** Cubes flip as the pointer sweeps across, and tilt toward it (default true). */
  interactive?: boolean;
  /** Cubes also flip on their own now and then, and a slow wave runs through the grid (default true). */
  ambient?: boolean;
  className?: string;
  style?: CSSProperties;
}

const FACES = ['front', 'back', 'right', 'left', 'top', 'bottom'] as const;
interface Cell { rx: number; ry: number; el: HTMLDivElement | null }

/**
 * A field of CSS 3D cubes that flip over as the pointer sweeps across them and tilt toward it; a
 * slow wave and occasional self-flips keep it alive on touch. Pure CSS transforms (no canvas, no
 * WebGL); fills its parent. Decorative (aria-hidden). With reduced motion the cubes only change
 * instantly (no transitions, no ambient animation).
 */
export default function Cubes({ cell = 44, gap = 6, interactive = true, ambient = true, className, style }: CubesProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cells = useRef<Cell[]>([]);
  const reduced = useReducedMotion();
  const [dim, setDim] = useState({ cols: 9, rows: 5, edge: cell });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const pitch = Math.max(cell + gap, Math.sqrt((r.width * r.height) / 160));
      const cols = Math.max(2, Math.floor((r.width + gap) / pitch)), rows = Math.max(2, Math.floor((r.height + gap) / pitch));
      setDim((d) => (d.cols === cols && d.rows === rows && d.edge === pitch - gap ? d : { cols, rows, edge: Math.max(12, pitch - gap) }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cell, gap]);

  const apply = (c: Cell, lift: number, tx: number, ty: number) => {
    if (c.el) c.el.style.transform = `translateZ(${lift}px) rotateX(${c.rx + tx}deg) rotateY(${c.ry + ty}deg)`;
  };

  // pointer: flip the cell under it, tilt and lift the neighbourhood
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !interactive) return;
    let lastKey = -1, raf = 0, pending: PointerEvent | null = null, lastX = 0;
    const run = () => {
      raf = 0;
      const e = pending;
      pending = null;
      if (!e) return;
      const r = el.getBoundingClientRect();
      const pitch = dim.edge + gap;
      const gw = dim.cols * pitch - gap, gh = dim.rows * pitch - gap;
      const ox = (r.width - gw) / 2, oy = (r.height - gh) / 2;
      const px = (e.clientX - r.left - ox) / pitch, py = (e.clientY - r.top - oy) / pitch;
      const inside = px >= 0 && py >= 0 && px < dim.cols && py < dim.rows && e.clientX >= r.left && e.clientX <= r.right;
      cells.current.forEach((c, k) => {
        const i = k % dim.cols, j = Math.floor(k / dim.cols);
        const d = inside && !reduced ? Math.hypot(i + 0.5 - px, j + 0.5 - py) : 9;
        const g = Math.max(0, 1 - d / 2.6);
        apply(c, g * dim.edge * 0.55, -(j + 0.5 - py) * g * -14, (i + 0.5 - px) * g * 14);
      });
      if (!inside) { lastKey = -1; return; }
      const key = Math.floor(py) * dim.cols + Math.floor(px);
      if (key !== lastKey) {
        lastKey = key;
        const c = cells.current[key];
        if (c) { if (Math.abs(e.clientX - lastX) > 0) c.ry += e.clientX >= lastX ? 90 : -90; else c.rx += 90; }
      }
      lastX = e.clientX;
    };
    const onMove = (e: PointerEvent) => { pending = e; if (!raf) raf = requestAnimationFrame(run); };
    const onLeave = () => { pending = { clientX: -9999, clientY: -9999 } as PointerEvent; if (!raf) raf = requestAnimationFrame(run); };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [interactive, dim, gap, reduced]);

  // ambient: a self-flip every so often (deterministic walk, paused when off-screen)
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !ambient || reduced) return;
    let live = true, n = 0;
    const off = watchLive(el, (v) => { live = v; });
    const id = window.setInterval(() => {
      if (!live) return;
      n++;
      const c = cells.current[(n * 37 + 11) % Math.max(1, cells.current.length)];
      if (!c) return;
      if (n % 2) c.rx += 90; else c.ry -= 90;
      apply(c, 0, 0, 0);
    }, 900);
    return () => { window.clearInterval(id); off(); };
  }, [ambient, reduced, dim]);

  const total = dim.cols * dim.rows;
  return (
    <div
      ref={rootRef}
      className={'ui-cubes' + (reduced ? ' is-still' : '') + (ambient ? ' is-ambient' : '') + (className ? ' ' + className : '')}
      style={{ ['--ui-cubes-edge' as string]: dim.edge + 'px', ['--ui-cubes-gap' as string]: gap + 'px', ['--ui-cubes-cols' as string]: dim.cols, ...style }}
      aria-hidden="true"
    >
      <div className="ui-cubes-grid">
        {Array.from({ length: total }, (_, k) => {
          const i = k % dim.cols, j = Math.floor(k / dim.cols);
          return (
            <div key={k} className="ui-cubes-slot" style={{ ['--d' as string]: (i + j) * 0.12 + 's' }}>
              <div className="ui-cubes-bob">
                <div className="ui-cubes-cube" ref={(el) => { const c = (cells.current[k] ??= { rx: 0, ry: 0, el: null }); c.el = el; }}>
                  {FACES.map((f) => <span key={f} className={'ui-cubes-face ui-cubes-' + f} />)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-cubes-stage">
      <Cubes />
    </div>
  );
}
