'use client';
import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react';
import { GAUGE_SPECS, angleFor, arcPath, buildNumerals, buildTicks, clamp, evSegments, formatValue, polar, type GaugeKind } from './_tu-css-gauges';

export interface GaugeProps {
  /** Which instrument to draw. */
  kind: GaugeKind;
  /** Current reading; the needle animates to it. Clamped to the instrument range. */
  value: number;
  /** Overrides the printed and announced name. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const NEEDLE: Record<GaugeKind, string> = {
  tach: 'M100 100 L97.2 104 L99 22 L101 22 L102.8 104Z',
  speed: 'M100 108 L98 100 L99.2 24 L100.8 24 L102 100Z',
  boost: 'M100 100 L96.8 100 L100 30 L103.2 100Z',
  ev: 'M100 100 L98.6 100 L100 20 L101.4 100Z',
};
const SEGMENTS = 40;

/** One layered instrument: bezel, face, ticks, zones, needle, hub and glass. role="meter" with aria values; the needle eases to `value` (jumps under reduced motion). */
export function Gauge({ kind, value, label, className, style }: GaugeProps) {
  const spec = GAUGE_SPECS[kind];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 60); return () => clearTimeout(t); }, []);
  const v = clamp(Number.isFinite(value) ? value : spec.min, spec.min, spec.max);
  const shown = ready ? v : spec.min;
  const deg = angleFor(spec, shown);
  const name = label ?? spec.label;
  const ticks = useMemo(() => buildTicks(spec), [spec]);
  const numerals = useMemo(() => buildNumerals(spec), [spec]);
  const segs = useMemo(() => (kind === 'ev' ? evSegments(spec, SEGMENTS) : []), [kind, spec]);
  const text = `${formatValue(spec, v)} ${spec.unit}`;
  const zeroDeg = angleFor(spec, 0);

  return (
    <div className={`ui-performance-gauges-gauge ui-performance-gauges-k-${kind} ${className ?? ''}`} style={style}
      role="meter" aria-label={name} aria-valuemin={spec.min} aria-valuemax={spec.max} aria-valuenow={+v.toFixed(3)} aria-valuetext={text}>
      <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${uid}b`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f2f4f7" /><stop offset="0.35" stopColor="#9aa0aa" /><stop offset="0.6" stopColor="#e4e7ec" /><stop offset="1" stopColor="#4a4f59" />
          </linearGradient>
          <linearGradient id={`${uid}r`} x1="1" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#2a2d34" /><stop offset="1" stopColor="#0b0c0f" />
          </linearGradient>
          <radialGradient id={`${uid}f`} cx="0.5" cy="0.4" r="0.7">
            <stop offset="0" stopColor="#24272e" /><stop offset="0.7" stopColor="#14161a" /><stop offset="1" stopColor="#0a0b0e" />
          </radialGradient>
          <radialGradient id={`${uid}h`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#f5f6f8" /><stop offset="0.5" stopColor="#8b919c" /><stop offset="1" stopColor="#30333a" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="99" fill={`url(#${uid}b)`} />
        <circle cx="100" cy="100" r="93.5" fill={`url(#${uid}r)`} />
        <circle cx="100" cy="100" r="90" fill={`url(#${uid}f)`} />
        <circle cx="100" cy="100" r="90" className="ui-performance-gauges-rim" />

        <g className="ui-performance-gauges-zones">
          {spec.zones.map((z) => (
            <path key={z.from + z.tone} d={arcPath(84, angleFor(spec, z.from), angleFor(spec, z.to))} className={`ui-performance-gauges-zone ui-performance-gauges-z-${z.tone}`} />
          ))}
        </g>
        {kind === 'ev' && (
          <g className="ui-performance-gauges-segs">
            {segs.map((s, i) => {
              const lit = v >= 0 ? s.value >= 0 && s.value <= v : s.value < 0 && s.value >= v;
              return <path key={i} d={s.d} className={`ui-performance-gauges-seg${s.value < 0 ? ' is-regen' : ''}${lit ? ' is-lit' : ''}`} />;
            })}
          </g>
        )}
        <g className="ui-performance-gauges-ticks">
          {ticks.map((t) => <path key={t.value} d={t.d} className={t.major ? 'is-major' : 'is-minor'} />)}
        </g>
        <g className="ui-performance-gauges-numerals">
          {numerals.map((n) => <text key={n.text} x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central">{n.text}</text>)}
        </g>
        {kind === 'ev' && (() => { const [x, y] = polar(60, zeroDeg); return <circle cx={x} cy={y} r="1.8" className="ui-performance-gauges-zero" />; })()}

        <g className="ui-performance-gauges-readout">
          <text x="100" y="142" textAnchor="middle" className="ui-performance-gauges-value">{formatValue(spec, v)}</text>
          <text x="100" y="154" textAnchor="middle" className="ui-performance-gauges-unit">{spec.unit}</text>
          <text x="100" y="170" textAnchor="middle" className="ui-performance-gauges-name">{name}</text>
        </g>

        <g className="ui-performance-gauges-needle" style={{ transform: `rotate(${deg.toFixed(2)}deg)` }}>
          <path d={NEEDLE[kind]} className="ui-performance-gauges-needle-body" />
          {kind === 'tach' && <path d="M100 100 L99 52 L101 52Z" className="ui-performance-gauges-needle-glow" />}
        </g>
        <circle cx="100" cy="100" r="9" fill={`url(#${uid}h)`} />
        <circle cx="100" cy="100" r="3" className="ui-performance-gauges-pin" />
      </svg>
      <span className="ui-performance-gauges-glass" aria-hidden="true" />
    </div>
  );
}
