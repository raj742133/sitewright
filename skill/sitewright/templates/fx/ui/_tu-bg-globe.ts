import { fbm2 } from './_tu-bg-kit';

/* Geometry for NetworkGlobe: land-like dot lattice, hub nodes and great-circle arcs, all on the unit sphere. */
type V3 = [number, number, number];
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const land = (v: V3) => (fbm2(v[0] * 2.4 + 5, v[1] * 2.4 + v[2] * 1.1) + fbm2(v[2] * 2.4 + 9, v[1] * 2.4 + v[0] * 1.1)) / 2;

export interface GlobeGeo {
  /** x,y,z,kind(0 dot, 1 hub) per point */ points: Float32Array<ArrayBuffer>; pointCount: number;
  /** x,y,z,s,phase per line vertex (GL_LINES pairs) */ lines: Float32Array<ArrayBuffer>; lineCount: number;
}
export function buildGlobe(dots: number, arcs: number): GlobeGeo {
  const R = seeded(2024);
  const land3: V3[] = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  const pts: number[] = [];
  for (let i = 0; i < dots; i++) {
    const y = 1 - ((i + 0.5) / dots) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
    const v: V3 = [Math.cos(th) * r, y, Math.sin(th) * r];
    if (land(v) > 0.5) { pts.push(v[0], v[1], v[2], 0); land3.push(v); }
  }
  const hubs: V3[] = [];
  let guard = 0;
  while (hubs.length < 22 && guard++ < 600 && land3.length) {
    const c = land3[Math.floor(R() * land3.length)]!;
    if (hubs.every((h) => dot(h, c) < 0.8)) hubs.push(c);
  }
  hubs.forEach((h) => pts.push(h[0] * 1.004, h[1] * 1.004, h[2] * 1.004, 1));
  const lines: number[] = [];
  const SEG = 30;
  for (let k = 0; k < arcs && hubs.length > 2; k++) {
    const a = hubs[Math.floor(R() * hubs.length)]!;
    let b = hubs[Math.floor(R() * hubs.length)]!;
    let tries = 0;
    while ((b === a || dot(a, b) > 0.93 || dot(a, b) < -0.3) && tries++ < 20) b = hubs[Math.floor(R() * hubs.length)]!;
    if (b === a) continue;
    const om = Math.acos(Math.max(-1, Math.min(1, dot(a, b)))), sn = Math.sin(om) || 1, ph = R();
    const at = (s: number): V3 => {
      const w1 = Math.sin((1 - s) * om) / sn, w2 = Math.sin(s * om) / sn;
      const p = norm([a[0] * w1 + b[0] * w2, a[1] * w1 + b[1] * w2, a[2] * w1 + b[2] * w2]);
      const h = 1.004 + Math.sin(Math.PI * s) * 0.16 * (om / Math.PI + 0.25);
      return [p[0] * h, p[1] * h, p[2] * h];
    };
    for (let i = 0; i < SEG; i++) {
      const s0 = i / SEG, s1 = (i + 1) / SEG, p0 = at(s0), p1 = at(s1);
      lines.push(p0[0], p0[1], p0[2], s0, ph, p1[0], p1[1], p1[2], s1, ph);
    }
  }
  return { points: new Float32Array(pts), pointCount: pts.length / 4, lines: new Float32Array(lines), lineCount: lines.length / 5 };
}
