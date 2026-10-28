/* Geometry and instrument specs for the performance-gauges component (pure maths, no DOM). */

export type GaugeKind = 'tach' | 'speed' | 'boost' | 'ev';
export type ZoneTone = 'warn' | 'hot' | 'regen' | 'vac';

export interface GaugeZone { from: number; to: number; tone: ZoneTone }
export interface GaugeSpec {
  label: string;
  unit: string;
  min: number;
  max: number;
  /** Needle angle (degrees clockwise from straight up) at min and max. */
  a0: number;
  a1: number;
  major: number;
  minor: number;
  /** Numerals are written every `numeralEvery` units. */
  numeralEvery: number;
  zones: GaugeZone[];
  decimals: number;
  /** Optional divisor for the numerals (the tachometer reads in thousands). */
  scale?: number;
}

export const GAUGE_SPECS: Record<GaugeKind, GaugeSpec> = {
  tach: { label: 'Engine', unit: 'x1000 rpm', min: 0, max: 8, a0: -135, a1: 135, major: 1, minor: 0.25, numeralEvery: 1, decimals: 1,
    zones: [{ from: 6, to: 7, tone: 'warn' }, { from: 7, to: 8, tone: 'hot' }] },
  speed: { label: 'Speed', unit: 'km/h', min: 0, max: 280, a0: -120, a1: 120, major: 20, minor: 10, numeralEvery: 40, decimals: 0, zones: [] },
  boost: { label: 'Boost', unit: 'bar', min: -1, max: 2, a0: -110, a1: 110, major: 0.5, minor: 0.1, numeralEvery: 0.5, decimals: 1,
    zones: [{ from: -1, to: 0, tone: 'vac' }, { from: 1.6, to: 2, tone: 'hot' }] },
  ev: { label: 'Power', unit: 'kW', min: -50, max: 150, a0: -135, a1: 135, major: 25, minor: 5, numeralEvery: 50, decimals: 0,
    zones: [{ from: -50, to: 0, tone: 'regen' }] },
};

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const angleFor = (s: GaugeSpec, v: number) => s.a0 + ((clamp(v, s.min, s.max) - s.min) / (s.max - s.min)) * (s.a1 - s.a0);

/** Point at radius r and angle deg (clockwise from up) around the 200x200 centre. */
export function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [+(100 + r * Math.sin(a)).toFixed(2), +(100 - r * Math.cos(a)).toFixed(2)];
}

export function arcPath(r: number, from: number, to: number): string {
  const [x0, y0] = polar(r, from);
  const [x1, y1] = polar(r, to);
  return `M${x0} ${y0}A${r} ${r} 0 ${Math.abs(to - from) > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}

export interface Tick { d: string; major: boolean; value: number }
export function buildTicks(s: GaugeSpec): Tick[] {
  const out: Tick[] = [];
  const n = Math.round((s.max - s.min) / s.minor);
  for (let i = 0; i <= n; i++) {
    const value = +(s.min + i * s.minor).toFixed(4);
    const major = Math.abs(((value - s.min) / s.major) - Math.round((value - s.min) / s.major)) < 1e-6;
    const a = angleFor(s, value);
    const [x0, y0] = polar(major ? 66 : 72, a);
    const [x1, y1] = polar(78, a);
    out.push({ d: `M${x0} ${y0}L${x1} ${y1}`, major, value });
  }
  return out;
}
export function buildNumerals(s: GaugeSpec): { x: number; y: number; text: string }[] {
  const out: { x: number; y: number; text: string }[] = [];
  const n = Math.round((s.max - s.min) / s.numeralEvery);
  for (let i = 0; i <= n; i++) {
    const value = s.min + i * s.numeralEvery;
    const [x, y] = polar(54, angleFor(s, value));
    const d = s.numeralEvery < 1 ? 1 : 0;
    out.push({ x, y, text: (+value.toFixed(d)).toString() });
  }
  return out;
}

export function formatValue(s: GaugeSpec, v: number): string {
  return clamp(v, s.min, s.max).toFixed(s.decimals);
}

/** Segment ring used by the EV meter: [segment centre value, angle]. */
export function evSegments(s: GaugeSpec, count: number): { value: number; d: string }[] {
  const out: { value: number; d: string }[] = [];
  const span = s.a1 - s.a0;
  const gap = 0.9;
  for (let i = 0; i < count; i++) {
    const a = s.a0 + (i / count) * span + gap / 2;
    const b = s.a0 + ((i + 1) / count) * span - gap / 2;
    out.push({ value: s.min + ((i + 0.5) / count) * (s.max - s.min), d: arcPath(91, a, b) });
  }
  return out;
}
