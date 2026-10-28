'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { cx, useControlled } from './_micro-a';
import { useReducedMotion } from './_t2';

export interface CometDialProps {
  value?: number;
  defaultValue?: number;
  onChange?: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Accessible name. */
  label?: string;
  /** Unit shown after the number (e.g. "%"). */
  unit?: string;
  /** Builds the spoken value, e.g. (v) => `${v} degrees`. */
  format?: (v: number) => string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

const START = 135; // degrees, clockwise from 3 o'clock: bottom-left
const SWEEP = 270;
const C = 100, R = 74;
const rad = (d: number) => (d * Math.PI) / 180;
const pt = (deg: number, r = R) => [C + r * Math.cos(rad(deg)), C + r * Math.sin(rad(deg))] as const;
function arc(a0: number, a1: number, r = R) {
  const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${large} ${a1 >= a0 ? 1 : 0} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
const TICKS = Array.from({ length: 28 }, (_, i) => i / 27);
const SEG = 7;

/** A round dial with a glowing comet head: drag around the ring or use arrows / PageUp / PageDown / Home / End. The head leaves a tail that stretches while it moves and settles when it stops. */
export default function CometDial({ value, defaultValue = 40, onChange, min = 0, max = 100, step = 1, label = 'Level', unit = '', format, disabled, className, style }: CometDialProps) {
  const [v, setV] = useControlled(value, defaultValue, onChange);
  const reduced = useReducedMotion();
  const svg = useRef<SVGSVGElement>(null);
  const [lag, setLag] = useState(v);
  const lagRef = useRef(v);
  const raf = useRef(0);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    if (reduced) { lagRef.current = v; setLag(v); return; }
    const tick = () => {
      raf.current = 0;
      const d = v - lagRef.current;
      const settled = Math.abs(d) < (max - min) * 0.002;
      lagRef.current = settled ? v : lagRef.current + d * 0.2;
      setLag(lagRef.current);
      if (!settled) raf.current = requestAnimationFrame(tick);
    };
    if (!raf.current) raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = 0; };
  }, [v, reduced, min, max]);

  const frac = (n: number) => (Math.max(min, Math.min(max, n)) - min) / (max - min || 1);
  const head = START + frac(v) * SWEEP;
  const lagA = START + frac(lag) * SWEEP;
  const dir = lagA > head ? 1 : -1;
  const tail = Math.min(70, 16 + Math.abs(lagA - head) * 1.4);
  const clampStep = useCallback((n: number) => {
    const s = Math.round((n - min) / step) * step + min;
    return Math.max(min, Math.min(max, +s.toFixed(6)));
  }, [min, max, step]);

  const fromPointer = (e: PointerEvent) => {
    const el = svg.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
    let rel = (Math.atan2(dy, dx) * 180) / Math.PI - START;
    rel = ((rel % 360) + 360) % 360;
    if (rel > SWEEP) rel = rel - SWEEP < (360 - SWEEP) / 2 ? SWEEP : 0;
    const next = clampStep(min + (rel / SWEEP) * (max - min));
    if (next !== v) setV(next);
  };
  const onKey = (e: KeyboardEvent) => {
    if (disabled) return;
    const big = step * Math.max(1, Math.round((max - min) / step / 10));
    const map: Record<string, number> = { ArrowRight: v + step, ArrowUp: v + step, ArrowLeft: v - step, ArrowDown: v - step, PageUp: v + big, PageDown: v - big, Home: min, End: max };
    const n = map[e.key];
    if (n === undefined) return;
    e.preventDefault();
    setV(clampStep(n));
  };
  const text = format ? format(v) : `${v}${unit}`;
  const [hx, hy] = pt(head);
  const segs = Array.from({ length: SEG }, (_, k) => {
    const a = head + dir * tail * (k / SEG), b = head + dir * tail * ((k + 1) / SEG);
    const lo = Math.max(START, Math.min(START + SWEEP, a)), hi = Math.max(START, Math.min(START + SWEEP, b));
    return { d: arc(lo, hi), o: 1 - k / SEG, w: 7 - k * 0.7, skip: Math.abs(hi - lo) < 0.05 };
  });

  return (
    <div className={cx('ui-comet-dial', drag && 'is-drag', disabled && 'is-disabled', className)} style={style}>
      <div className="ui-comet-dial-face" role="slider" tabIndex={disabled ? -1 : 0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={v} aria-valuetext={text} aria-disabled={disabled || undefined}
        onKeyDown={onKey}
        onPointerDown={(e) => { if (disabled) return; e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); fromPointer(e); }}
        onPointerMove={(e) => { if (drag) fromPointer(e); }}
        onPointerUp={() => setDrag(false)} onPointerCancel={() => setDrag(false)}>
        <svg ref={svg} viewBox="0 0 200 200" className="ui-comet-dial-svg" aria-hidden="true" focusable="false">
          {TICKS.map((t, i) => {
            const a = START + t * SWEEP;
            const [x0, y0] = pt(a, 88), [x1, y1] = pt(a, i % 9 === 0 ? 81 : 84);
            return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} className={cx('ui-comet-dial-tick', t <= frac(v) + 0.001 && 'is-on')} />;
          })}
          <path d={arc(START, START + SWEEP)} className="ui-comet-dial-track" />
          {frac(v) > 0 && <path d={arc(START, head)} className="ui-comet-dial-fill" />}
          {segs.map((s, i) => !s.skip && <path key={i} d={s.d} className="ui-comet-dial-tail" style={{ strokeOpacity: s.o, strokeWidth: s.w }} />)}
          <circle cx={hx} cy={hy} r="15" className="ui-comet-dial-halo" />
          <circle cx={hx} cy={hy} r="8.5" className="ui-comet-dial-head" />
          <circle cx={hx} cy={hy} r="3.2" className="ui-comet-dial-core" />
        </svg>
        <div className="ui-comet-dial-read" aria-hidden="true">
          <strong>{v}<small>{unit}</small></strong>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

export function Demo() {
  const [v, setV] = useState(64);
  return (
    <div className="ui-comet-dial-demo">
      <CometDial value={v} onChange={setV} label="Brightness" unit="%" />
    </div>
  );
}
