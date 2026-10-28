import { rng } from './_tu-three-kit';

/* Structure-flow studies: each variant places particle i of n at time t (stateless, so one still frame is just t = const). Output slots:
   o = [x, y, z, tint (0 ink, 1 primary, 2 signal), size, alpha]. */

export type FlowVariant = 'dome' | 'horizon' | 'orbital' | 'vortex' | 'matrix' | 'embers';
export const FLOW_VARIANTS: FlowVariant[] = ['dome', 'horizon', 'orbital', 'vortex', 'matrix', 'embers'];
export interface FlowCam { pitch: number; dist: number; zoom: number; cy: number; spin: number }
export const FLOW_CAM: Record<FlowVariant, FlowCam> = {
  dome: { pitch: 0.3, dist: 3.8, zoom: 1.8, cy: 0.12, spin: 0.04 },
  horizon: { pitch: 0.0, dist: 1.5, zoom: 0.62, cy: -0.14, spin: 0 },
  orbital: { pitch: 0.55, dist: 4.2, zoom: 2.5, cy: 0, spin: 0.03 },
  vortex: { pitch: 0.24, dist: 4.4, zoom: 1.9, cy: 0, spin: 0 },
  matrix: { pitch: 0.4, dist: 4.6, zoom: 1.6, cy: 0, spin: 0.09 },
  embers: { pitch: 0.05, dist: 3.4, zoom: 1.65, cy: 0, spin: 0 },
};
export interface FlowSeed { a: Float32Array; b: Float32Array; c: Float32Array }
export function flowSeed(n: number, seed: number): FlowSeed {
  const r = rng(seed), a = new Float32Array(n), b = new Float32Array(n), c = new Float32Array(n);
  for (let i = 0; i < n; i++) { a[i] = r(); b[i] = r(); c[i] = r(); }
  return { a, b, c };
}
const TAU = Math.PI * 2;
type Fn = (i: number, n: number, t: number, s: FlowSeed, o: Float64Array) => void;

const GA = 2.39996;
const dome: Fn = (i, n, t, s, o) => {
  const body = Math.floor(n * 0.58), inner = Math.floor(n * 0.17);
  if (i < body) {
    const y = (i + 0.5) / body, ph = i * GA + t * 0.05, r = 1 + 0.02 * Math.sin(y * 10 - t * 1.3), q = Math.sqrt(1 - y * y) * r, wave = Math.abs(y - ((t * 0.22) % 1.3)) < 0.035;
    o[0] = Math.cos(ph) * q; o[1] = y * r; o[2] = Math.sin(ph) * q; o[3] = wave ? 2 : i % 19 === 0 ? 1 : 0; o[4] = wave ? 2.4 : 1.5; o[5] = wave ? 1 : 0.8;
  } else if (i < body + inner) {
    const j = i - body, y = (j + 0.5) / inner, ph = -j * GA - t * 0.08, q = Math.sqrt(1 - y * y) * 0.62;
    o[0] = Math.cos(ph) * q; o[1] = y * 0.62; o[2] = Math.sin(ph) * q; o[3] = j % 11 === 0 ? 1 : 0; o[4] = 1.1; o[5] = 0.5;
  } else {
    const j = i - body - inner, m = n - body - inner, q = Math.sqrt((j + 0.5) / m), r = 1.08 + 1.5 * q, ph = j * GA + t * 0.02;
    o[0] = Math.cos(ph) * r; o[1] = 0.025 * Math.sin(r * 7 - t * 1.3); o[2] = Math.sin(ph) * r; o[3] = j % 29 === 0 ? 2 : 0; o[4] = 1.1; o[5] = 0.75 * (1.05 - q);
  }
};
const horizon: Fn = (i, n, t, s, o) => {
  const sunN = 72, grid = n - sunN, rows = 34, cols = Math.max(24, Math.floor(grid / rows));
  if (i >= grid) { const a = ((i - grid) / sunN) * TAU; o[0] = Math.sin(a) * 1.1 + 1.2; o[1] = 0.55 + Math.cos(a) * 1.1; o[2] = 11; o[3] = 2; o[4] = 2; o[5] = 0.9; return; }
  const c = i % cols, r = Math.floor(i / cols) % rows, sc = t * 0.45, f = sc - Math.floor(sc), W = r + Math.floor(sc), zz = (r + 1 - f) * 0.3, x = (c / (cols - 1) - 0.5) * 8.6;
  const hill = (Math.sin(x * 0.9 + W * 0.17) * 0.5 + Math.sin(x * 2.3 - W * 0.11) * 0.3 + 0.3) * smoothF(0.9, 3.6, Math.abs(x)) * (0.5 + zz * 0.14);
  o[0] = x; o[1] = -0.85 + Math.max(0, hill) + Math.sin(W * 0.9 + x * 1.4) * 0.03; o[2] = zz - 1.0;
  o[3] = hill > 0.9 ? 2 : (c + W) % 13 === 0 ? 1 : 0; o[4] = 1.5; o[5] = Math.min(1, zz * 2) * (1 - (r / rows) * 0.75);
};
const smoothF = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const orbital: Fn = (i, n, t, s, o) => {
  const core = Math.floor(n * 0.08);
  if (i < core) { const a = s.a[i]!, b = s.b[i]!, c = s.c[i]!, r = 0.16 * Math.cbrt(a); o[0] = r * Math.sin(b * Math.PI) * Math.cos(c * TAU + t * 0.8); o[1] = r * Math.cos(b * Math.PI); o[2] = r * Math.sin(b * Math.PI) * Math.sin(c * TAU + t * 0.8); o[3] = 2; o[4] = 1.4; o[5] = 0.9; return; }
  const rings = 8, per = Math.floor((n - core) / rings), k = Math.min(rings - 1, Math.floor((i - core) / per)), j = (i - core) % per;
  const R = 0.35 + k * 0.16, inc = (k * 0.55 + 0.3) % 1.3, w = 0.55 / Math.pow(R, 1.5), an = (j / per) * TAU + t * w + k;
  const x = Math.cos(an) * R, z = Math.sin(an) * R, ci = Math.cos(inc), si = Math.sin(inc);
  o[0] = x; o[1] = z * si; o[2] = z * ci; o[3] = j % 37 === 0 ? 2 : k % 3 === 0 ? 1 : 0; o[4] = 1.1 + (j % 37 === 0 ? 1 : 0); o[5] = 0.35 + 0.6 * (0.5 + 0.5 * Math.sin(an * 2 - k));
};
const vortex: Fn = (i, n, t, s, o) => {
  const u = (s.a[i]! + t * 0.045) % 1, arm = Math.floor(s.b[i]! * 5), r = 0.07 + 1.5 * Math.pow(1 - u, 1.9), an = (arm * TAU) / 5 + u * 5.5 + t * 0.35 + (s.c[i]! - 0.5) * 0.35 * (0.3 + (1 - u));
  o[0] = Math.cos(an) * r; o[1] = 1.45 - u * 2.9; o[2] = Math.sin(an) * r; o[3] = u > 0.9 ? 2 : arm === 0 ? 1 : 0; o[4] = 1.2 + u * 1.2; o[5] = Math.min(1, u * 6) * Math.min(1, (1 - u) * 14 + 0.15);
};
const matrix: Fn = (i, n, t, s, o) => {
  const m = Math.max(2, Math.round(Math.cbrt(n))), x = i % m, y = Math.floor(i / m) % m, z = Math.floor(i / (m * m)) % m, g = (v: number) => (v / (m - 1) - 0.5) * 2;
  const px = g(x), py = g(y), pz = g(z), w = 0.5 + 0.5 * Math.sin(Math.hypot(px - Math.sin(t * 0.5) * 0.8, py - Math.cos(t * 0.4) * 0.8, pz) * 4 - t * 2);
  o[0] = px + Math.sin(t + py * 3) * 0.015; o[1] = py; o[2] = pz; o[3] = w > 0.92 ? 2 : w > 0.8 ? 1 : 0; o[4] = 1 + w * 1.8; o[5] = 0.25 + 0.75 * w;
};
const embers: Fn = (i, n, t, s, o) => {
  const sp = 0.06 + s.c[i]! * 0.1, u = (s.a[i]! + t * sp) % 1, ang = s.b[i]! * TAU, rad = (0.08 + s.c[i]! * 0.5) * (0.4 + u * 1.4);
  o[0] = Math.cos(ang) * rad + Math.sin(t * 0.8 + s.b[i]! * 20 + u * 6) * 0.12 * u; o[1] = -1.25 + u * 2.7; o[2] = Math.sin(ang) * rad;
  o[3] = u < 0.55 ? 1 : 2; o[4] = (1 - u) * 2.2 + 0.7; o[5] = Math.min(1, u * 8) * (1 - u * u) * (0.6 + 0.4 * Math.sin(t * 8 + s.b[i]! * 50));
};
export const FLOW_FN: Record<FlowVariant, Fn> = { dome, horizon, orbital, vortex, matrix, embers };
