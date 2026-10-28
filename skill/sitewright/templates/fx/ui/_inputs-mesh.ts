/** Procedural meshes and a small software rasteriser helper for the model viewer. All shapes are generated in code. */
export type V3 = [number, number, number];
export interface Mesh { name: string; verts: V3[]; faces: number[][] }

const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** Flip any face whose normal points toward the origin, so every face winds counter-clockwise seen from outside. */
function orient(m: Mesh): Mesh {
  const faces = m.faces.map((f) => {
    const a = m.verts[f[0]!]!, b = m.verts[f[1]!]!, c = m.verts[f[2]!]!;
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const cx = f.reduce((s, i) => s + m.verts[i]![0], 0) / f.length, cy = f.reduce((s, i) => s + m.verts[i]![1], 0) / f.length, cz = f.reduce((s, i) => s + m.verts[i]![2], 0) / f.length;
    return nx * cx + ny * (cy - 0.1) + nz * cz < 0 ? f.slice().reverse() : f;
  });
  return { ...m, faces };
}

export function cube(): Mesh {
  const s = 0.62;
  const verts: V3[] = [[-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s], [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]];
  return orient({ name: 'Cube', verts, faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]] });
}

/** A brilliant-style gem: flat table, a ring of crown facets, a girdle band and a pavilion down to a point. */
export function gem(): Mesh {
  const n = 8, verts: V3[] = [];
  const ring = (r: number, y: number, off: number) => { for (let i = 0; i < n; i++) { const a = ((i + off) / n) * Math.PI * 2; verts.push([Math.cos(a) * r, y, Math.sin(a) * r]); } };
  ring(0.4, 0.55, 0);    // 0..7 table
  ring(0.85, 0.22, 0.5); // 8..15 girdle top
  ring(0.85, 0.08, 0.5); // 16..23 girdle bottom
  verts.push([0, -0.95, 0]); // 24 culet
  const faces: number[][] = [[...Array(n).keys()]];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([i, j, 8 + i]);
    faces.push([j, 8 + j, 8 + i]);
    faces.push([8 + i, 8 + j, 16 + j, 16 + i]);
    faces.push([16 + i, 16 + j, 24]);
  }
  return orient({ name: 'Gem', verts, faces });
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
  return orient({ name: 'Low-poly', verts, faces });
}

export const MESHES = { cube, gem, lowPoly };

export function rotate(v: V3, yaw: number, pitch: number): V3 {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x = v[0] * cy + v[2] * sy, z = -v[0] * sy + v[2] * cy;
  return [x, v[1] * cp - z * sp, v[1] * sp + z * cp];
}
