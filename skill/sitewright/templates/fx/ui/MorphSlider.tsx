'use client';
import { useId, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { clampN, snapTo, useControlled } from './_inputs-ui';

export interface MorphSliderProps {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const N = 16;
type Pts = [number, number][];
const ring = (f: (a: number) => number): Pts => Array.from({ length: N }, (_, i) => { const a = (i / N) * Math.PI * 2 - Math.PI / 2; const r = f(a); return [Math.cos(a) * r, Math.sin(a) * r] as [number, number]; });
const circle = ring(() => 1);
const squareR = (a: number) => 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) * 0.86;
const square = ring(squareR);
const diamond = ring((a) => 1 / (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a))) * 1.05);
const star = ring((a) => 0.55 + 0.45 * Math.max(0, Math.cos(((a + Math.PI / 2) * 4) / 2 * 1)) ** 1.5 * 1);
const SHAPES: Pts[] = [circle, square, diamond, star, circle];
const NAMES = ['circle', 'square', 'diamond', 'star', 'circle'];

function shapeAt(t: number): Pts {
  const x = clampN(t, 0, 1) * (SHAPES.length - 1);
  const i = Math.min(SHAPES.length - 2, Math.floor(x));
  const f = x - i;
  const e = f * f * (3 - 2 * f);
  const a = SHAPES[i] as Pts;
  const b = SHAPES[i + 1] as Pts;
  return a.map((p, k) => [p[0] + ((b[k] as [number, number])[0] - p[0]) * e, p[1] + ((b[k] as [number, number])[1] - p[1]) * e] as [number, number]);
}
/** Closed smooth path through the points (Catmull-Rom to Bezier), centred at (cx, cy) with radius r. */
function smooth(pts: Pts, cx: number, cy: number, r: number): string {
  const P = pts.map((p) => [cx + p[0] * r, cy + p[1] * r] as [number, number]);
  const n = P.length;
  let d = `M${P[0]![0].toFixed(2)} ${P[0]![1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n]!, p1 = P[i]!, p2 = P[(i + 1) % n]!, p3 = P[(i + 2) % n]!;
    const t = 0.18;
    d += `C${(p1[0] + (p2[0] - p0[0]) * t).toFixed(2)} ${(p1[1] + (p2[1] - p0[1]) * t).toFixed(2)} ${(p2[0] - (p3[0] - p1[0]) * t).toFixed(2)} ${(p2[1] - (p3[1] - p1[1]) * t).toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d + 'Z';
}

/** A slider whose thumb and preview morph through circle, square, diamond and star as the value moves. */
export default function MorphSlider({ value, defaultValue = 30, onChange, min = 0, max = 100, step = 1, label = 'Shape', className, style }: MorphSliderProps) {
  const [v, setV] = useControlled(value, clampN(defaultValue, min, max), onChange);
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const t = max > min ? (v - min) / (max - min) : 0;
  const pts = shapeAt(t);
  const name = NAMES[Math.min(NAMES.length - 1, Math.round(t * (NAMES.length - 1)))] as string;
  const set = (n: number) => setV(clampN(snapTo(n, min, step), min, max));
  const fromPointer = (e: PointerEvent) => {
    const r = track.current?.getBoundingClientRect();
    if (r && r.width) set(min + clampN((e.clientX - r.left) / r.width, 0, 1) * (max - min));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key; const big = (max - min) / 10;
    if (k === 'ArrowRight' || k === 'ArrowUp') set(v + step);
    else if (k === 'ArrowLeft' || k === 'ArrowDown') set(v - step);
    else if (k === 'PageUp') set(v + big);
    else if (k === 'PageDown') set(v - big);
    else if (k === 'Home') set(min);
    else if (k === 'End') set(max);
    else return;
    e.preventDefault();
  };
  const hue = `color-mix(in srgb, var(--primary, #2563eb) ${Math.round((1 - t) * 100)}%, var(--signal, #f59e0b))`;
  return (
    <div className={`ui-morph-slider-root ${className ?? ''}`} style={{ ...style, ['--ui-ms-c' as string]: hue }}>
      <svg className="ui-morph-slider-preview" viewBox="-50 -50 100 100" aria-hidden="true" focusable="false"><path d={smooth(pts, 0, 0, 40)} /></svg>
      <div className="ui-morph-slider-head"><span id={id}>{label}</span><output>{v} - {name}</output></div>
      <div ref={track} className="ui-morph-slider-track" role="slider" tabIndex={0} aria-labelledby={id} aria-valuemin={min} aria-valuemax={max} aria-valuenow={v} aria-valuetext={`${v}, ${name}`}
        onKeyDown={onKey}
        onPointerDown={(e) => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = true; fromPointer(e); }}
        onPointerMove={(e) => { if (drag.current) fromPointer(e); }} onPointerUp={() => { drag.current = false; }} onPointerCancel={() => { drag.current = false; }}>
        <span className="ui-morph-slider-rail"><span className="ui-morph-slider-fill" style={{ width: `${t * 100}%` }} /></span>
        <svg className="ui-morph-slider-thumb" viewBox="-50 -50 100 100" style={{ left: `${t * 100}%` }} aria-hidden="true" focusable="false"><path d={smooth(pts, 0, 0, 42)} /></svg>
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-morph-slider-demo">
      <MorphSlider defaultValue={38} />
    </div>
  );
}
