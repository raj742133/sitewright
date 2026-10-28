'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Gauge } from './_tu-css-gauge';
import { useReducedMotion, watchLive } from './_t2';

export { Gauge };
export interface GaugeValues { tach: number; speed: number; boost: number; power: number }
export interface PerformanceGaugesProps {
  /** Controlled readings: tach (x1000 rpm, 0-8), speed (km/h, 0-280), boost (bar, -1-2), power (kW, -50-150). Missing keys fall back to defaultValues. */
  values?: Partial<GaugeValues>;
  /** Initial readings when `values` is not given. */
  defaultValues?: Partial<GaugeValues>;
  className?: string;
  style?: CSSProperties;
}

const REST: GaugeValues = { tach: 0.9, speed: 0, boost: -0.6, power: -8 };

/** A dashboard of four layered instruments (tachometer, speedometer, boost gauge, EV power meter). Needles ease to the values you pass; under reduced motion they sit at the value with no sweep. */
export default function PerformanceGauges({ values, defaultValues, className, style }: PerformanceGaugesProps) {
  const v = { ...REST, ...defaultValues, ...values };
  return (
    <div className={`ui-performance-gauges-root ${className ?? ''}`} style={style} role="group" aria-label="Vehicle instruments">
      <Gauge kind="tach" value={v.tach} />
      <Gauge kind="speed" value={v.speed} />
      <Gauge kind="boost" value={v.boost} />
      <Gauge kind="ev" value={v.power} />
    </div>
  );
}

/** Maps one throttle position (0-1) onto plausible readings for every instrument. */
export function readingsFor(t: number): GaugeValues {
  const c = Math.max(0, Math.min(1, t));
  return { tach: 0.9 + c * 6.4, speed: Math.round(c * c * 240 + c * 20), boost: -0.7 + c * 2.1, power: Math.round(-30 + c * 165) };
}

const CYCLE = [0.05, 0.38, 0.72, 0.95, 0.52, 0.12];

export function Demo() {
  const [t, setT] = useState(0.38);
  const [auto, setAuto] = useState(true);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const live = useRef(true);
  const step = useRef(0);

  useEffect(() => {
    const el = ref.current;
    const off = el ? watchLive(el, (l) => { live.current = l; }) : undefined;
    return () => off?.();
  }, []);
  useEffect(() => {
    if (!auto || reduced) return;
    const id = setInterval(() => {
      if (!live.current) return;
      step.current = (step.current + 1) % CYCLE.length;
      setT(CYCLE[step.current] ?? 0.4);
    }, 2400);
    return () => clearInterval(id);
  }, [auto, reduced]);

  return (
    <div ref={ref} className="ui-performance-gauges-demo">
      <div className="ui-performance-gauges-stage"><PerformanceGauges values={readingsFor(t)} /></div>
      <div className="ui-performance-gauges-bar">
        <label className="ui-performance-gauges-throttle">
          <span>Throttle</span>
          <input type="range" min={0} max={1} step={0.01} value={t} onChange={(e) => { setAuto(false); setT(+e.target.value); }} />
        </label>
        <button type="button" className="ui-performance-gauges-auto" aria-pressed={auto} onClick={() => setAuto((a) => !a)}>{auto ? 'Auto on' : 'Auto off'}</button>
      </div>
    </div>
  );
}
