/* Tiny 3x3 rotation maths and a Fibonacci sphere, for the infinite menu. Row-major matrices, x right, y up, z toward the viewer. */
export type M3 = number[];
export type V3 = [number, number, number];
export const I3 = (): M3 => [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const mul3 = (a: M3, b: M3): M3 => {
  const o = new Array<number>(9).fill(0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = (a[r * 3] ?? 0) * (b[c] ?? 0) + (a[r * 3 + 1] ?? 0) * (b[3 + c] ?? 0) + (a[r * 3 + 2] ?? 0) * (b[6 + c] ?? 0);
  return o;
};
export const apply3 = (m: M3, v: V3): V3 => [
  (m[0] ?? 0) * v[0] + (m[1] ?? 0) * v[1] + (m[2] ?? 0) * v[2],
  (m[3] ?? 0) * v[0] + (m[4] ?? 0) * v[1] + (m[5] ?? 0) * v[2],
  (m[6] ?? 0) * v[0] + (m[7] ?? 0) * v[1] + (m[8] ?? 0) * v[2],
];
export const rotY = (a: number): M3 => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
export const rotX = (a: number): M3 => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
/** Rotation by `a` about the unit axis (Rodrigues). */
export function axisAngle(ax: V3, a: number): M3 {
  const [x, y, z] = ax, c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
}
/** Keeps the matrix a pure rotation (Gram-Schmidt on the rows). */
export function orthonormal(m: M3): M3 {
  const n = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const r0 = n([m[0] ?? 1, m[1] ?? 0, m[2] ?? 0]);
  let r1: V3 = [m[3] ?? 0, m[4] ?? 1, m[5] ?? 0];
  const d = dot(r0, r1);
  r1 = n([r1[0] - d * r0[0], r1[1] - d * r0[1], r1[2] - d * r0[2]]);
  const r2: V3 = [r0[1] * r1[2] - r0[2] * r1[1], r0[2] * r1[0] - r0[0] * r1[2], r0[0] * r1[1] - r0[1] * r1[0]];
  return [...r0, ...r1, ...r2];
}
/** n points spread almost evenly over the unit sphere, ordered along a spiral so neighbours in the list are neighbours in space. */
export function fibSphere(n: number): V3[] {
  const out: V3[] = [];
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = g * i;
    out.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  return out;
}
