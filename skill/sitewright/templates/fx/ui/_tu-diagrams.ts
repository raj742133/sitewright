import { mix, rgba, type RGB } from './_t2';
import type { CanvasEnv } from './_tu-ui-kit';
import { clamp, rng } from './_tu-ui-kit';

/* Three Canvas 2D diagnostic illustrations drawn with a tiny yaw/pitch/perspective projector: stacked layer planes, a node cube and a rippling mesh. */

type Proj = (x: number, y: number, z: number) => { x: number; y: number; z: number; k: number };
function camera(yaw: number, pitch: number, scale: number, cx: number, cy: number, dist = 7): Proj {
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return (x, y, z) => {
    const X = x * cyw + z * syw;
    let Z = -x * syw + z * cyw;
    const Y = y * cp - Z * sp;
    Z = y * sp + Z * cp;
    const k = dist / (dist + Z);
    return { x: cx + X * scale * k, y: cy - Y * scale * k, z: Z, k };
  };
}
const MONO = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';

export const LAYER_NAMES = ['Input', 'Encode', 'Route', 'Output'];
const LINKS = (() => { const r = rng(7); const a: [number, number][] = []; for (let i = 0; i < 5; i++) a.push([(r() - 0.5) * 2.2, (r() - 0.5) * 2.2]); return a; })();

export function drawLayers(e: CanvasEnv) {
  const { ctx, w, h, t, pal } = e;
  const P = pal.primary, S = pal.signal;
  const sc = Math.min(w * 0.15, h * 0.165);
  const pr = camera(0.75 + Math.sin(t * 0.35) * 0.12, 0.62, sc, w * 0.46, h * 0.52);
  const n = 4, gap = 0.78, half = 1.55;
  const act = Math.floor(t / 1.7) % n;
  const yOf = (i: number) => (i - (n - 1) / 2) * gap;
  const poly = (y: number) => [pr(-half, y, -half), pr(half, y, -half), pr(half, y, half), pr(-half, y, half)];
  // vertical links first (behind the planes' translucency)
  ctx.lineWidth = 1;
  LINKS.forEach(([x, z], li) => {
    const a = pr(x, yOf(0), z), b = pr(x, yOf(n - 1), z);
    ctx.strokeStyle = rgba(pal.muted, 0.35); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    const f = (t * 0.45 + li * 0.21) % 1;
    const pp = pr(x, yOf(0) + (yOf(n - 1) - yOf(0)) * f, z);
    ctx.fillStyle = rgba(S, 0.95); ctx.shadowColor = rgba(S, 0.9); ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(pp.x, pp.y, 2.4, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
  });
  for (let i = 0; i < n; i++) {
    const y = yOf(i), c = poly(y), on = i === act;
    ctx.beginPath(); ctx.moveTo(c[0]!.x, c[0]!.y); for (let q = 1; q < 4; q++) ctx.lineTo(c[q]!.x, c[q]!.y); ctx.closePath();
    ctx.fillStyle = rgba(P, on ? 0.3 : 0.13); ctx.fill();
    ctx.strokeStyle = rgba(on ? mix(P, [255, 255, 255], 0.25) : pal.muted, on ? 1 : 0.7); ctx.lineWidth = on ? 1.8 : 1; ctx.stroke();
    ctx.strokeStyle = rgba(P, on ? 0.45 : 0.2); ctx.lineWidth = 0.7;
    for (let g = 1; g < 6; g++) {
      const u = -half + (g / 6) * half * 2;
      const a = pr(u, y, -half), b = pr(u, y, half), c2 = pr(-half, y, u), d = pr(half, y, u);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(c2.x, c2.y); ctx.lineTo(d.x, d.y); ctx.stroke();
    }
    if (on) { // scanline sweeping across the active plane
      const u = -half + ((t * 0.7) % 1) * half * 2;
      const a = pr(u, y, -half), b = pr(u, y, half);
      ctx.strokeStyle = rgba(S, 0.95); ctx.lineWidth = 2; ctx.shadowColor = rgba(S, 0.9); ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.shadowBlur = 0;
    }
    const tag = pr(half, y, half);
    ctx.font = MONO; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba(on ? pal.ink : pal.muted, on ? 1 : 0.85);
    ctx.fillText(`L${i + 1} ${LAYER_NAMES[i]}`, Math.min(tag.x + 8, w - 72), tag.y + 4);
  }
  for (const [x, z] of LINKS) for (let i = 0; i < n; i++) { const p = pr(x, yOf(i), z); ctx.fillStyle = rgba(pal.ink, 0.8); ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, 6.283); ctx.fill(); }
}

const NODES: [number, number, number][] = [];
for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) NODES.push([x, y, z]);

export function drawCube(e: CanvasEnv) {
  const { ctx, w, h, t, pal } = e;
  const P = pal.primary, S = pal.signal;
  const sc = Math.min(w, h * 1.3) * 0.2;
  const pr = camera(t * 0.45, 0.5 + Math.sin(t * 0.3) * 0.1, sc, w * 0.5, h * 0.52, 7);
  const sp = 0.95;
  const pts = NODES.map(([x, y, z]) => pr(x * sp, y * sp, z * sp));
  const hot = Math.floor(t * 2.2) % NODES.length;
  const hn = NODES[hot]!;
  ctx.lineWidth = 1;
  NODES.forEach((a, i) => {
    NODES.forEach((b, j) => {
      if (j <= i) return;
      const d = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
      if (d !== 1) return;
      const pa = pts[i]!, pb = pts[j]!;
      const depth = 1 - clamp(((pa.z + pb.z) / 2 + 2) / 4, 0, 1);
      const lit = i === hot || j === hot;
      ctx.strokeStyle = lit ? rgba(S, 0.95) : rgba(P, 0.12 + 0.4 * depth);
      ctx.lineWidth = lit ? 1.8 : 1;
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    });
  });
  const ord = pts.map((p, i) => ({ p, i })).sort((a, b) => b.p.z - a.p.z);
  for (const { p, i } of ord) {
    const depth = 1 - clamp((p.z + 2) / 4, 0, 1);
    const near = Math.abs(NODES[i]![0] - hn[0]) + Math.abs(NODES[i]![1] - hn[1]) + Math.abs(NODES[i]![2] - hn[2]) === 1;
    if (i === hot) {
      ctx.fillStyle = rgba(S, 0.25); ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, 6.283); ctx.fill();
      ctx.fillStyle = rgba(S, 1); ctx.shadowColor = rgba(S, 1); ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(p.x, p.y, 4.6, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = near ? rgba(mix(S, [255, 255, 255], 0.2), 0.95) : rgba(mix(P, pal.ink, 0.35), 0.45 + 0.55 * depth);
      ctx.beginPath(); ctx.arc(p.x, p.y, (near ? 3.2 : 2.2) + 1.4 * depth, 0, 6.283); ctx.fill();
    }
  }
  // bounding frame
  const c = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => pr(x * 1.35, y * 1.35, z * 1.35))));
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  ctx.strokeStyle = rgba(pal.muted, 0.55); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
  ctx.beginPath(); for (const [a, b] of edges) { ctx.moveTo(c[a!]!.x, c[a!]!.y); ctx.lineTo(c[b!]!.x, c[b!]!.y); } ctx.stroke(); ctx.setLineDash([]);
}

const COLS = 26, ROWS = 18;
export const MESH_CELLS = (COLS - 1) * (ROWS - 1);
export function drawMesh(e: CanvasEnv) {
  const { ctx, w, h, t, pal } = e;
  const P = pal.primary, S = pal.signal;
  const sc = Math.min(w * 0.14, h * 0.3);
  const pr = camera(0.5 + Math.sin(t * 0.3) * 0.22, 0.66, sc, w * 0.5, h * 0.56, 7);
  const bx = 1.3 * Math.cos(t * 0.4), bz = 0.9 * Math.sin(t * 0.55), ringR = ((t * 0.4) % 1) * 2.4;
  const hf = (x: number, z: number) => {
    const d2 = (x - bx) ** 2 + (z - bz) ** 2;
    const d = Math.sqrt(d2);
    return 0.2 * Math.sin(x * 1.6 + t * 0.9) * Math.cos(z * 1.3 - t * 0.6) + 0.1 * Math.sin(x * 3.1 - z * 2.2 + t * 1.3) + 0.95 * Math.exp(-d2 / 0.32) + 0.14 * Math.exp(-((d - ringR) ** 2) / 0.05) * (1 - ringR / 2.6);
  };
  const g: { x: number; y: number; z: number; v: number }[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: { x: number; y: number; z: number; v: number }[] = [];
    for (let c = 0; c < COLS; c++) {
      const x = (c / (COLS - 1) - 0.5) * 5, z = (r / (ROWS - 1) - 0.5) * 3.6, v = hf(x, z);
      const p = pr(x, v, z);
      row.push({ x: p.x, y: p.y, z: p.z, v });
    }
    g.push(row);
  }
  const col = (v: number, z: number) => {
    const k = clamp((v + 0.15) / 1.0, 0, 1);
    const base = k < 0.5 ? mix(pal.muted, P, k * 2) : mix(P, S, (k - 0.5) * 2);
    return rgba(base, 0.28 + 0.6 * k + 0.2 * (1 - clamp((z + 2.5) / 5, 0, 1)));
  };
  ctx.lineWidth = 1;
  const seg = (a: { x: number; y: number; z: number; v: number }, b: { x: number; y: number; z: number; v: number }) => {
    ctx.strokeStyle = col((a.v + b.v) / 2, (a.z + b.z) / 2);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  for (let r = ROWS - 1; r >= 0; r--) for (let c = 0; c < COLS - 1; c++) seg(g[r]![c]!, g[r]![c + 1]!);
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS - 1; r++) seg(g[r]![c]!, g[r + 1]![c]!);
  const ap = pr(bx, hf(bx, bz) + 0.15, bz);
  ctx.strokeStyle = rgba(S, 0.95); ctx.lineWidth = 1.6; ctx.shadowColor = rgba(S, 0.9); ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(ap.x, ap.y - 10, 5, 0, 6.283); ctx.moveTo(ap.x, ap.y - 5); ctx.lineTo(ap.x, ap.y + 1); ctx.stroke(); ctx.shadowBlur = 0;
}
