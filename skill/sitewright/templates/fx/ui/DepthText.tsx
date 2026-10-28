'use client';
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { useCoarsePointer, useDamped, useReducedMotion } from './_t2';

export interface DepthTextProps {
  /** The text to extrude. */
  text?: string;
  /** Total extrusion length in px at full lean. */
  depth?: number;
  /** Number of stacked layers that build the extrusion (more = smoother). */
  layers?: number;
  className?: string;
  style?: CSSProperties;
}

const RANGE = 20;
const REST = { x: 10, y: 15 };

/** Big text with a solid, shaded extrusion whose direction follows the pointer (it leans away from it). Arrow keys steer it, Home resets; touch screens get a slow sway. */
export default function DepthText({ text = 'Depth', depth = 34, layers = 18, className, style }: DepthTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const coarse = useCoarsePointer();
  const reduced = useReducedMotion();
  const n = Math.max(2, Math.min(40, Math.round(layers)));

  const drive = useDamped(ref, (x, y) => {
    const el = ref.current;
    if (!el) return;
    const sx = (x / RANGE) * (depth / n);
    const sy = (y / RANGE) * (depth / n);
    el.style.setProperty('--dx', sx.toFixed(3) + 'px');
    el.style.setProperty('--dy', sy.toFixed(3) + 'px');
    el.style.setProperty('--cx', (-sx * n * 0.5).toFixed(2) + 'px');
    el.style.setProperty('--cy', (-sy * n * 0.5).toFixed(2) + 'px');
    el.style.setProperty('--lean', Math.min(1, Math.hypot(x, y) / RANGE).toFixed(3));
  }, { sway: coarse && !reduced, instant: reduced });

  useEffect(() => { drive.set(REST.x, REST.y); }, [drive]);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    drive.set(-nx * RANGE, -ny * RANGE);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const { x, y } = drive.get();
    const c = (v: number) => Math.max(-RANGE, Math.min(RANGE, v));
    if (e.key === 'ArrowLeft') drive.set(c(x - 6), y);
    else if (e.key === 'ArrowRight') drive.set(c(x + 6), y);
    else if (e.key === 'ArrowUp') drive.set(x, c(y - 6));
    else if (e.key === 'ArrowDown') drive.set(x, c(y + 6));
    else if (e.key === 'Home' || e.key === 'Escape') drive.set(REST.x, REST.y);
    else return;
    e.preventDefault();
  };

  const stack = [];
  for (let k = n; k >= 1; k--) {
    stack.push(<span key={k} className="ui-depth-text-layer" style={{ ['--k' as string]: k / n, ['--i' as string]: k }}>{text}</span>);
  }
  return (
    <div ref={ref} className={`ui-depth-text-root ${className ?? ''}`} tabIndex={0} role="group" aria-label={`${text}. Extruded text; arrow keys steer the depth, Home resets.`}
      style={{ ['--dx' as string]: (REST.x / RANGE) * (depth / n) + 'px', ['--dy' as string]: (REST.y / RANGE) * (depth / n) + 'px', ['--cx' as string]: -((REST.x / RANGE) * depth * 0.5) + 'px', ['--cy' as string]: -((REST.y / RANGE) * depth * 0.5) + 'px', ...style }}
      onPointerMove={onMove} onPointerLeave={() => drive.set(REST.x, REST.y)}
      onFocus={() => drive.set(REST.x, REST.y)}>
      <div className="ui-depth-text-scene" aria-hidden="true">
        {stack}
        <span className="ui-depth-text-face">{text}</span>
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-depth-text-stage">
      <DepthText text="Depth" />
    </div>
  );
}
