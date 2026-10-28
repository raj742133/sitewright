/** Procedural meshes and a small software rasteriser helper for the model viewer. All shapes are generated in code. */
export type V3 = [number, number, number];
export interface Mesh { name: string; verts: V3[]; faces: number[][] }

const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

export function cube(): Mesh {
  const s = 0.62;
  const verts: V3[] = [[-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s], [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]];
  return { name: 'Cube', verts, faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]] };
}

/** A brilliant-style gem: flat table, a ring of crown facets, a ring of pavilion facets down to a point. */
export function gem(): Mesh {
  const n = 8, verts: V3[] = [];
  const ring = (r: number, y: number, off: number) => { for (let i = 0; i < n; i++) { const a = ((i + off) / n) * Math.PI * 2; verts.push([Math.cos(a) * r, y, Math.sin(a) * r]); } };
  ring(0.38, 0.62, 0);   // 0..7 table
  ring(0.82, 0.3, 0.5);  // 8..15 girdle top
  ring(0.82, 0.18, 0.5); // 16..23 girdle bottom
  verts.push([0, -0.95, 0]); // 24 culet
  const faces: number[][] = [[...Array(n).keys()].reverse()];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([i, 8 + i, 8 + ((i + n - 1) % n)].reverse()); // crown kite halves
    faces.push([i, j, 8 + i].reverse());
    faces.push([8 + i, 16 + i, 16 + ((i + n - 1) % n), 8 + ((i + n - 1) % n)].reverse()); // girdle band
    faces.push([16 + i, 24, 16 + ((i + n - 1) % n)].reverse()); // pavilion
  }
  return { name: 'Gem', verts, faces: faces.map((f) => f.slice().reverse()) };
}

/** Subdivided icosahedron with jittered radii: a low-poly rock/planet. */
export function lowPoly(): Mesh {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts: V3[] = ([[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]] as V3[]).map(norm);
  let faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const cache = new Map<string, number>();
  const mid = (a: number, b: number) => {
    const k = a < b ? a + '_' + b : b + '_' + a;
    const hit = cache.get(k);
    if (hit !== undefined) return hit;
    const p = verts[a]!, q = verts[b]!;
    verts.push(norm([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]));
    cache.set(k, verts.length - 1);
    return verts.length - 1;
  };
  const nf: number[][] = [];
  for (const f of faces) { const a = f[0]!, b = f[1]!, c = f[2]!; const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
  faces = nf;
  // deterministic jitter
  verts = verts.map((v, i) => { const j = 0.86 + 0.2 * Math.abs(Math.sin(i * 12.9898 + 4.1) * 43758.5453 % 1); return [v[0] * j * 0.95, v[1] * j * 0.95, v[2] * j * 0.95] as V3; });
  return { name: 'Low-poly', verts, faces };
}

export const MESHES = { cube, gem, lowPoly };

export function rotate(v: V3, yaw: number, pitch: number): V3 {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x = v[0] * cy + v[2] * sy, z = -v[0] * sy + v[2] * cy;
  return [x, v[1] * cp - z * sp, v[1] * sp + z * cp];
}
