'use client';
import type { QrCode } from './_qr';
import { seeded } from './_d6';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

const LEAVES: Record<Season, string[]> = {
  spring: ['#f4b6cc', '#f8d0de', '#8ccf6a', '#a9dd84', '#fbe3ec'],
  summer: ['#5aae2b', '#6dbf3a', '#7ccb4a', '#9ad45f', '#8fd16a', '#62b53a'],
  autumn: ['#f5b53a', '#f7c95b', '#f2993a', '#fbd978', '#e8793a', '#f4a259'],
  winter: ['#ffffff'],
};
const GRASS: Record<Season, string[]> = { spring: ['#5cbf3a', '#7ed151', '#f4a6c0'], summer: ['#4fb21d', '#6cc72e', '#9bd24a'], autumn: ['#e5b52a', '#f2c94c', '#d49a1f', '#f6d56a'], winter: [] };

function shades(hex: string): string[] {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (t: number) => { const f = (c: number) => Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t).toString(16).padStart(2, '0'); return `#${f(r)}${f(g)}${f(b)}`; };
  return [mix(-0.25), mix(-0.1), hex, mix(0.15), mix(0.3)];
}

/** An isometric slab whose tiles follow the QR modules, with a tree growing out of it. Decorative: the flat view is the one to scan. */
export default function TreeScene({ qr, seed, season, leaf, trunk, animate }: { qr: QrCode; seed: number; season: Season; leaf: string | null; trunk: string; animate: boolean }) {
  const N = qr.size, a = 6, T = a * 0.9, W = 2 * N * a;
  const P = (x: number, y: number): [number, number] => [N * a + (x - y) * a, ((x + y) * a) / 2];
  const rnd = seeded(seed ^ 0x51ed270b);
  const ground = season === 'winter' ? ['#f6f9fc', '#e9eff6', '#c6d3e3'] : ['#ebe7df', '#e3ded4', '#c9c3b7'];
  const pal = leaf ? shades(leaf) : LEAVES[season];

  // slab tiles, back to front
  const tiles: Array<{ d: string; fill: string }> = [];
  for (let s = 0; s <= 2 * N - 2; s++) for (let x = 0; x < N; x++) {
    const y = s - x; if (y < 0 || y >= N) continue;
    const [x1, y1] = P(x, y), [x2, y2] = P(x + 1, y), [x3, y3] = P(x + 1, y + 1), [x4, y4] = P(x, y + 1);
    tiles.push({ d: `M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}L${x4} ${y4}Z`, fill: qr.modules[y]![x] ? ground[2]! : ground[(x + y) % 2]! });
  }
  const [lx, ly] = P(0, N), [bx, by] = P(N, N), [rx, ry] = P(N, 0);
  // grass tufts around the rim
  const tufts: Array<{ d: string; c: string }> = [];
  if (season !== 'winter') {
    const g = GRASS[season];
    const edge = (f: (t: number) => [number, number]) => { for (let t = 0.3; t < N; t += 0.6 + rnd() * 0.7) { const [px, py] = f(t); const corner = Math.min(t, N - t) < N * 0.22 ? 1.5 : 0.6; for (let k = 0; k < 6; k++) { const h = (6 + rnd() * 10) * corner, dx = (rnd() - 0.5) * 7; tufts.push({ d: `M${(px + (k - 1.5) * 1.1).toFixed(1)} ${py.toFixed(1)}Q${(px + dx * 0.4).toFixed(1)} ${(py - h * 0.6).toFixed(1)} ${(px + dx).toFixed(1)} ${(py - h).toFixed(1)}`, c: g[Math.floor(rnd() * g.length)]! }); } } };
    edge((t) => P(0.2, t)); edge((t) => P(t, 0.2)); edge((t) => P(N - 0.2, t)); edge((t) => P(t, N - 0.2));
  }
  // tree
  const [cx, cy] = P(N / 2, N / 2);
  const branches: Array<{ d: string; w: number }> = [];
  const tips: Array<[number, number]> = [];
  const walk = (x: number, y: number, ang: number, len: number, lvl: number) => {
    const ex = x + Math.sin(ang) * len, ey = y - Math.cos(ang) * len;
    branches.push({ d: `M${x.toFixed(1)} ${y.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`, w: Math.max(0.9, (5 - lvl) * (W / 150)) });
    if (lvl >= 4) { tips.push([ex, ey]); return; }
    const kids = lvl === 0 ? 3 : 2 + (rnd() < 0.3 ? 1 : 0);
    for (let i = 0; i < kids; i++) walk(ex, ey, ang + (kids === 2 ? (i ? 1 : -1) : i - 1) * (0.35 + rnd() * 0.45), len * (0.72 + rnd() * 0.08), lvl + 1);
  };
  walk(cx, cy, (rnd() - 0.5) * 0.08, W * 0.19, 0);
  const blobs: Array<{ d: string; c: string; y: number; delay: number }> = [];
  if (season !== 'winter') {
    const total = 760, r0 = W * 0.026; const ccx = cx, ccy = cy - W * 0.4;
    for (let i = 0; i < total; i++) {
      const near = rnd() < 0.4; const [tx, ty] = tips[Math.floor(rnd() * tips.length)]!;
      const ang0 = rnd() * Math.PI * 2, rad = Math.sqrt(rnd());
      const x = near ? tx + (rnd() - 0.5) * W * 0.2 : ccx + Math.cos(ang0) * rad * W * 0.33, y = near ? ty + (rnd() - 0.45) * W * 0.18 : ccy + Math.sin(ang0) * rad * W * 0.3, r = r0 * (0.8 + rnd() * 0.6), rot = rnd() * Math.PI * 2;
      // a five-pointed maple-style leaf: straight edges, alternating long and short points
      let d = ''; for (let k = 0; k < 10; k++) { const ang = rot + (k / 10) * Math.PI * 2, rr = r * (k % 2 ? 0.62 : 1); d += `${k ? 'L' : 'M'}${(x + Math.cos(ang) * rr).toFixed(1)} ${(y + Math.sin(ang) * rr * 0.85).toFixed(1)}`; }
      blobs.push({ d: d + 'Z', c: pal[Math.floor(rnd() * pal.length)]!, y, delay: Math.hypot(x - cx, y - cy) / W });
    }
    blobs.sort((p, q) => p.y - q.y);
  }
  const top = cy - W * 0.95, height = by + T - top;
  return (
    <svg viewBox={`0 ${top.toFixed(1)} ${W} ${height.toFixed(1)}`} className="ui-magic-tree-qr-tree" aria-hidden="true" shapeRendering="geometricPrecision">
      <polygon points={`${lx},${ly} ${bx},${by} ${bx},${by + T} ${lx},${ly + T}`} fill="#b9b4ab" />
      <polygon points={`${bx},${by} ${rx},${ry} ${rx},${ry + T} ${bx},${by + T}`} fill="#9f9a91" />
      {tiles.map((t, i) => <path key={i} d={t.d} fill={t.fill} />)}
      {tufts.map((t, i) => <path key={i} d={t.d} stroke={t.c} strokeWidth={1.2} strokeLinecap="round" fill="none" />)}
      <ellipse cx={cx} cy={cy + 1} rx={W * 0.16} ry={W * 0.05} fill="#000" opacity={0.12} />
      <g className={animate ? 'ui-magic-tree-qr-sway' : undefined} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <g stroke={trunk} strokeLinecap="round" fill="none">{branches.map((b, i) => <path key={i} d={b.d} strokeWidth={b.w} />)}</g>
        {blobs.map((b, i) => <path key={i} d={b.d} fill={b.c} stroke={b.c} strokeWidth={W * 0.006} strokeLinejoin="round" className="ui-magic-tree-qr-blob" style={animate ? { animationDelay: `${(b.delay * 0.9).toFixed(2)}s` } : undefined} />)}
        {season === 'winter' && tips.map(([x, y], i) => <circle key={i} cx={x} cy={y - 1} r={W * 0.012} fill="#fff" />)}
      </g>
    </svg>
  );
}
