// A small QR Code encoder (byte mode, error correction level M, versions 1-10 = up to 213 bytes). Written from the QR spec
// (ISO/IEC 18004) so the kit needs no dependency. encodeQr() returns the finished module matrix.

// [data codewords per block, number of blocks] per group, and EC codewords per block, level M
const VERSIONS: Array<{ ec: number; g1: [number, number]; g2?: [number, number] }> = [
  { ec: 10, g1: [16, 1] }, { ec: 16, g1: [28, 1] }, { ec: 26, g1: [44, 1] }, { ec: 18, g1: [32, 2] }, { ec: 24, g1: [43, 2] },
  { ec: 16, g1: [27, 4] }, { ec: 18, g1: [31, 4] }, { ec: 22, g1: [38, 2], g2: [39, 2] }, { ec: 22, g1: [36, 3], g2: [37, 2] }, { ec: 26, g1: [43, 4], g2: [44, 1] },
];
const ALIGN = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
export const QR_MAX_BYTES = 213;

const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
{ let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255] as number; }
const mul = (a: number, b: number) => (a && b ? (EXP[(LOG[a] as number) + (LOG[b] as number)] as number) : 0);

function rsRemainder(data: number[], ecLen: number): number[] {
  let gen = [1];
  for (let i = 0; i < ecLen; i++) { const next = new Array(gen.length + 1).fill(0); gen.forEach((c, j) => { next[j] ^= c; next[j + 1] ^= mul(c, EXP[i] as number); }); gen = next; }
  const res = new Array(ecLen).fill(0);
  for (const d of data) { const f = d ^ res.shift(); res.push(0); if (f) gen.slice(1).forEach((c, j) => { res[j] ^= mul(c, f); }); }
  return res;
}

const bch = (value: number, poly: number, bits: number) => { let v = value << bits; const top = poly.toString(2).length - 1; for (let i = v.toString(2).length - 1; i >= top; i--) if ((v >> i) & 1) v ^= poly << (i - top); return v; };

export interface QrCode { size: number; version: number; mask: number; modules: boolean[][]; isFunction: boolean[][] }

export function utf8(text: string): number[] { return Array.from(new TextEncoder().encode(text)); }

export function encodeQr(text: string): QrCode | null {
  const bytes = utf8(text);
  const version = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find((v) => {
    const info = VERSIONS[v - 1]!; const data = info.g1[0] * info.g1[1] + (info.g2 ? info.g2[0] * info.g2[1] : 0);
    return Math.ceil((4 + (v < 10 ? 8 : 16) + bytes.length * 8) / 8) <= data;
  });
  if (!version || bytes.length === 0) return null;
  const info = VERSIONS[version - 1]!;
  const blocksSpec: number[] = [...Array(info.g1[1]).fill(info.g1[0]), ...(info.g2 ? Array(info.g2[1]).fill(info.g2[0]) : [])];
  const dataCw = blocksSpec.reduce((a, b) => a + b, 0);
  // bit stream: mode 0100, length, data, terminator, padding
  const bits: number[] = []; const put = (v: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
  put(4, 4); put(bytes.length, version < 10 ? 8 : 16); bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, dataCw * 8 - bits.length)); while (bits.length % 8) bits.push(0);
  for (let pad = 0xec; bits.length < dataCw * 8; pad ^= 0xec ^ 0x11) put(pad, 8);
  const cw: number[] = []; for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  // split into blocks, add error correction, interleave
  const blocks: number[][] = []; let at = 0; for (const n of blocksSpec) { blocks.push(cw.slice(at, at + n)); at += n; }
  const ecs = blocks.map((b) => rsRemainder(b, info.ec));
  const out: number[] = [];
  for (let i = 0; i < Math.max(...blocksSpec); i++) blocks.forEach((b) => { if (i < b.length) out.push(b[i] as number); });
  for (let i = 0; i < info.ec; i++) ecs.forEach((e) => out.push(e[i] as number));

  const size = 17 + version * 4;
  const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, v: boolean) => { if (x < 0 || y < 0 || x >= size || y >= size) return; modules[y]![x] = v; fn[y]![x] = true; };
  const finder = (cx: number, cy: number) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, d !== 4 && d !== 2); } };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  for (let i = 8; i < size - 8; i++) { set(i, 6, i % 2 === 0); set(6, i, i % 2 === 0); }
  const al = ALIGN[version - 1]!;
  for (const ay of al) for (const ax of al) { if ((ax === 6 && ay === 6) || (ax === 6 && ay === al[al.length - 1]) || (ax === al[al.length - 1] && ay === 6)) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }
  set(8, size - 8, true);
  const drawFormat = (mask: number, w: (x: number, y: number, v: boolean) => void = set) => {
    const code = ((mask << 10) | bch(mask, 0x537, 10)) ^ 0x5412; const bit = (i: number) => ((code >> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) w(8, i, bit(i)); w(8, 7, bit(6)); w(8, 8, bit(7)); w(7, 8, bit(8)); for (let i = 9; i < 15; i++) w(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) w(size - 1 - i, 8, bit(i)); for (let i = 8; i < 15; i++) w(8, size - 15 + i, bit(i));
    w(8, size - 8, true);
  };
  if (version >= 7) { const code = (version << 12) | bch(version, 0x1f25, 12); for (let i = 0; i < 18; i++) { const b = ((code >> i) & 1) === 1; const a = size - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, b); set(c, a, b); } }
  drawFormat(0);
  // place data (zig-zag), then pick the mask with the lowest penalty
  const dataBits: boolean[] = []; out.forEach((b) => { for (let i = 7; i >= 0; i--) dataBits.push(((b >> i) & 1) === 1); });
  const place = (grid: boolean[][]) => { let k = 0; for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) { const x = right - j; const up = ((right + 1) & 2) === 0; const y = up ? size - 1 - v : v; if (!fn[y]![x]) { grid[y]![x] = k < dataBits.length ? (dataBits[k] as boolean) : false; k++; } } } };
  const MASKS: Array<(x: number, y: number) => boolean> = [
    (x, y) => (x + y) % 2 === 0, (_x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0, (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  let best: { mask: number; grid: boolean[][]; score: number } | null = null;
  for (let mask = 0; mask < 8; mask++) {
    const grid = modules.map((r) => r.slice()); place(grid);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y]![x] && (MASKS[mask] as (x: number, y: number) => boolean)(x, y)) grid[y]![x] = !grid[y]![x];
    drawFormat(mask, (x, y, v) => { grid[y]![x] = v; });
    const withFormat = grid;
    const score = penalty(withFormat);
    if (!best || score < best.score) best = { mask, grid: withFormat, score };
  }
  return { size, version, mask: best!.mask, modules: best!.grid, isFunction: fn };
}

function penalty(g: boolean[][]): number {
  const n = g.length; let p = 0;
  const run = (line: boolean[]) => { let s = 0, c = 1; for (let i = 1; i <= n; i++) { if (i < n && line[i] === line[i - 1]) c++; else { if (c >= 5) s += c - 2; c = 1; } } return s; };
  for (let i = 0; i < n; i++) { p += run(g[i] as boolean[]); p += run(g.map((r) => r[i] as boolean)); }
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const v = g[y]![x]; if (v === g[y]![x + 1] && v === g[y + 1]![x] && v === g[y + 1]![x + 1]) p += 3; }
  const pat = [true, false, true, true, true, false, true, false, false, false, false], rev = pat.slice().reverse();
  const match = (get: (k: number) => boolean, p2: boolean[]) => p2.every((v, k) => get(k) === v);
  for (let y = 0; y < n; y++) for (let x = 0; x <= n - 11; x++) { if (match((k) => g[y]![x + k] as boolean, pat) || match((k) => g[y]![x + k] as boolean, rev)) p += 40; if (match((k) => g[x + k]![y] as boolean, pat) || match((k) => g[x + k]![y] as boolean, rev)) p += 40; }
  let dark = 0; g.forEach((r) => r.forEach((v) => { if (v) dark++; })); p += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
  return p;
}
