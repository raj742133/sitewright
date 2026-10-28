'use client';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { clamp, springStep, useFrameLoop, type SpringState } from './_micro-c';
import { useReducedMotion } from './_t2';

export interface SloshGaugeProps {
  /** Controlled value, 0..100. */
  value?: number;
  /** Initial value when uncontrolled. */
  defaultValue?: number;
  onChange?: (value: number) => void;
  /** Accessible name. */
  label?: string;
  /** Unit text shown after the number. */
  unit?: string;
  /** Pixel height of the tank (width follows). */
  height?: number;
  disabled?: boolean;
  className?: string;
}

const W = 100;
const H = 150;
const PAD = 6;

function surface(level: number, amp: number, phase: number): string {
  const top = PAD + (H - PAD * 2) * (1 - level / 100);
  let d = `M0 ${H} L0 ${top.toFixed(2)}`;
  for (let i = 1; i <= 20; i++) {
    const x = (i / 20) * W;
    const y = top + amp * (Math.sin(phase + x * 0.095) + 0.45 * Math.sin(phase * 1.7 + x * 0.19));
    d += ` L${x.toFixed(1)} ${y.toFixed(2)}`;
  }
  return `${d} L${W} ${H}Z`;
}

/** A tank-style gauge whose liquid sloshes when the value changes. Drag it, use the arrow keys (Shift or PageUp/PageDown for big steps, Home/End for the ends) or drive it from props. Reduced motion: the level jumps with a flat surface. */
export default function SloshGauge({ value, defaultValue = 62, onChange, label = 'Tank level', unit = '%', height = 150, disabled, className = '' }: SloshGaugeProps) {
  const reduced = useReducedMotion();
  const [inner, setInner] = useState(defaultValue);
  const v = clamp(Math.round(value ?? inner), 0, 100);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const front = useRef<SVGPathElement>(null);
  const back = useRef<SVGPathElement>(null);
  const s = useRef<SpringState & { amp: number; phase: number; target: number }>({ x: v, v: 0, amp: 0, phase: 0, target: v });
  const drag = useRef(false);
  const tank = useRef<SVGSVGElement>(null);

  const paint = () => {
    const a = s.current;
    front.current?.setAttribute('d', surface(a.x, a.amp, a.phase));
    back.current?.setAttribute('d', surface(a.x, a.amp * 0.8, a.phase * 0.8 + 1.7));
  };
  const loop = useFrameLoop((dt) => {
    const a = s.current;
    springStep(a, a.target, dt, 90, 11);
    a.phase += dt * 7;
    a.amp *= Math.exp(-dt * 1.5);
    a.amp = Math.min(a.amp, 5);
    paint();
    const live = Math.abs(a.x - a.target) > 0.05 || Math.abs(a.v) > 0.05 || a.amp > 0.12;
    if (!live) { a.x = a.target; a.v = 0; a.amp = 0; paint(); }
    return live;
  });

  useEffect(() => {
    const a = s.current;
    const delta = v - a.target;
    a.target = v;
    if (reduced) { a.x = v; a.v = 0; a.amp = 0; paint(); loop.stop(); return; }
    if (delta !== 0) { a.amp = Math.min(5, a.amp + Math.abs(delta) * 0.25 + 0.8); loop.start(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, reduced]);

  const set = (n: number) => {
    const next = clamp(Math.round(n), 0, 100);
    if (value === undefined) setInner(next);
    if (next !== v) onChange?.(next);
  };
  const fromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = (e.clientY - r.top) / r.height;
    set(((1 - (t * H - PAD) / (H - PAD * 2))) * 100);
  };
  const key = (e: KeyboardEvent<SVGSVGElement>) => {
    const big = e.shiftKey ? 10 : 1;
    const map: Record<string, number> = { ArrowUp: v + big, ArrowRight: v + big, ArrowDown: v - big, ArrowLeft: v - big, PageUp: v + 10, PageDown: v - 10, Home: 0, End: 100 };
    if (e.key in map) { set(map[e.key]); e.preventDefault(); }
  };

  return (
    <div className={`ui-slosh-gauge ${className}`.trim()} data-disabled={disabled || undefined} style={{ ['--sg-h' as string]: `${height}px` }}>
      <svg ref={tank} className="ui-slosh-gauge-tank" viewBox={`0 0 ${W} ${H}`} role="slider" tabIndex={disabled ? -1 : 0} aria-label={label} aria-orientation="vertical"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-valuetext={`${v}${unit === '%' ? ' percent' : ' ' + unit}`} aria-disabled={disabled || undefined}
        onKeyDown={disabled ? undefined : key}
        onPointerDown={(e) => { if (disabled) return; drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
        onPointerMove={(e) => { if (drag.current) fromPointer(e); }}
        onPointerUp={() => { drag.current = false; }} onPointerCancel={() => { drag.current = false; }}>
        <defs><clipPath id={`${uid}c`}><rect x="0" y="0" width={W} height={H} rx="22" /></clipPath></defs>
        <rect className="ui-slosh-gauge-glass" x="0" y="0" width={W} height={H} rx="22" />
        <g clipPath={`url(#${uid}c)`}>
          <path ref={back} className="ui-slosh-gauge-liquid-back" d={surface(v, 0, 0)} />
          <path ref={front} className="ui-slosh-gauge-liquid" d={surface(v, 0, 0)} />
        </g>
        <g className="ui-slosh-gauge-ticks" aria-hidden="true">
          {[0, 25, 50, 75, 100].map((t) => { const y = PAD + (H - PAD * 2) * (1 - t / 100); return <path key={t} d={`M${W - 18} ${y}h12`} />; })}
        </g>
        <rect className="ui-slosh-gauge-rim" x="1" y="1" width={W - 2} height={H - 2} rx="21" />
      </svg>
      <div className="ui-slosh-gauge-read" aria-hidden="true"><b>{v}</b><span>{unit}</span></div>
    </div>
  );
}

export function Demo() {
  const [v, setV] = useState(62);
  return (
    <div className="ui-slosh-gauge-stage">
      <SloshGauge value={v} onChange={setV} height={140} />
      <div className="ui-slosh-gauge-btns" role="group" aria-label="Adjust level">
        <button type="button" aria-label="Drain 20" onClick={() => setV((x) => clamp(x - 20, 0, 100))}>-20</button>
        <button type="button" aria-label="Fill 20" onClick={() => setV((x) => clamp(x + 20, 0, 100))}>+20</button>
      </div>
    </div>
  );
}
