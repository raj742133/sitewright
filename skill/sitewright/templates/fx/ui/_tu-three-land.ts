import { clamp, css, fbm2, glowSprite, hash1, hsl, layer, mixc, noise2, smooth, WHITE, type Env, type RGB } from './_tu-three-kit';

/* Landscape pieces: sky palettes per time of day, weather modifiers and a back-to-front heightfield renderer (pseudo-3D, no WebGL). */

export type LandTime = 'sunrise' | 'noon' | 'sunset' | 'night';
export type LandWeather = 'clear' | 'rain' | 'storm' | 'snow' | 'fog';
export const LAND_TIMES: LandTime[] = ['sunrise', 'noon', 'sunset', 'night'];
export const LAND_WEATHER: LandWeather[] = ['clear', 'rain', 'storm', 'snow', 'fog'];

export interface Look { top: RGB; hor: RGB; sun: RGB; sunX: number; sunY: number; light: number; warm: number; fog: number; stars: number; cover: number; moon: boolean }
export function look(env: Env, time: LandTime, wx: LandWeather): Look {
  const p = env.pal, dk: RGB = [0.02, 0.03, 0.07];
  const base: Record<LandTime, Look> = {
    sunrise: { top: mixc(dk, p.primary, 0.55), hor: mixc(p.signal, [1, 0.72, 0.62], 0.45), sun: mixc(p.signal, WHITE, 0.55), sunX: 0.3, sunY: 0.07, light: 0.78, warm: 0.4, fog: 0.016, stars: 0.1, cover: 0, moon: false },
    noon: { top: mixc(p.primary, [0.28, 0.55, 0.92], 0.78), hor: mixc([0.8, 0.9, 1], p.primary, 0.12), sun: [1, 0.97, 0.85], sunX: 0.66, sunY: 0.5, light: 1, warm: 0, fog: 0.012, stars: 0, cover: 0, moon: false },
    sunset: { top: mixc(dk, p.primary, 0.42), hor: mixc(p.signal, [1, 0.5, 0.25], 0.35), sun: mixc(p.signal, [1, 0.8, 0.5], 0.4), sunX: 0.74, sunY: 0.06, light: 0.7, warm: 0.55, fog: 0.017, stars: 0.15, cover: 0, moon: false },
    night: { top: mixc(dk, p.primary, 0.1), hor: mixc(dk, p.primary, 0.34), sun: [0.92, 0.95, 1], sunX: 0.28, sunY: 0.42, light: 0.2, warm: 0, fog: 0.014, stars: 1, cover: 0, moon: true },
  };
  const b = { ...base[time] };
  const grey = (c: RGB, k: number, dim: number): RGB => mixc(c, [lum3(c), lum3(c), lum3(c)], k).map((v) => v * dim) as RGB;
  if (wx === 'rain') { b.top = grey(b.top, 0.5, 0.75); b.hor = grey(b.hor, 0.5, 0.85); b.light *= 0.75; b.stars = 0; b.cover = 0.6; b.fog *= 1.7; b.warm *= 0.4; }
  if (wx === 'storm') { b.top = grey(b.top, 0.65, 0.5); b.hor = grey(b.hor, 0.6, 0.62); b.light *= 0.55; b.stars = 0; b.cover = 1; b.fog *= 2; b.warm *= 0.2; }
  if (wx === 'snow') { b.top = grey(mixc(b.top, WHITE, 0.25), 0.5, 0.9); b.hor = mixc(b.hor, WHITE, 0.45); b.light = Math.min(1, b.light * 1.1 + 0.08); b.stars = 0; b.cover = 0.7; b.fog *= 2.6; }
  if (wx === 'fog') { b.top = mixc(b.top, b.hor, 0.65); b.hor = mixc(b.hor, WHITE, time === 'night' ? 0.05 : 0.3); b.light *= 0.85; b.stars *= 0.1; b.cover = 0.4; b.fog *= 5.5; }
  return b;
}
const lum3 = (c: RGB) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

export function paintSky(env: Env, L: Look, wx: LandWeather): HTMLCanvasElement {
  const { w, h, dpr } = env, hy = h * 0.46;
  return layer(w, h, dpr, (c) => {
    const g = c.createLinearGradient(0, 0, 0, hy + 4); g.addColorStop(0, css(L.top)); g.addColorStop(1, css(L.hor)); c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (L.stars > 0.02) for (let i = 0; i < 90; i++) { c.fillStyle = css(WHITE, (0.2 + hash1(i * 3) * 0.6) * L.stars); const s = hash1(i * 7) < 0.1 ? 2 : 1; c.fillRect(hash1(i) * w, hash1(i * 5 + 1) * hy * 0.95, s, s); }
    const sx = w * L.sunX, sy = hy - L.sunY * hy * 1.3, hide = wx === 'fog' ? 0.3 : wx === 'storm' ? 0.08 : wx === 'rain' ? 0.35 : wx === 'snow' ? 0.4 : 1;
    const sprite = glowSprite(L.sun), R = Math.min(w, h) * (L.moon ? 0.5 : 0.5);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = (L.moon ? 0.5 : 0.55) * hide; c.drawImage(sprite, sx - R, sy - R, R * 2, R * 2); c.globalCompositeOperation = 'source-over'; c.globalAlpha = hide;
    c.fillStyle = css(L.sun); c.beginPath(); c.arc(sx, sy, Math.min(w, h) * (L.moon ? 0.035 : 0.045), 0, 6.3); c.fill();
    if (L.moon) { c.fillStyle = css(L.top, 0.16); for (const [dx, dy, r] of [[-0.3, -0.2, 0.28], [0.25, 0.1, 0.2], [-0.05, 0.4, 0.15]] as const) { c.beginPath(); c.arc(sx + dx * Math.min(w, h) * 0.035, sy + dy * Math.min(w, h) * 0.035, r * Math.min(w, h) * 0.035, 0, 6.3); c.fill(); } }
    c.globalAlpha = 1;
    if (L.cover > 0) { // soft cloud banks
      for (let i = 0; i < 14; i++) { const cx = hash1(i * 11) * w, cy = hash1(i * 13 + 2) * hy * 0.7, r = w * (0.12 + hash1(i * 17) * 0.14); const gg = c.createRadialGradient(cx, cy, 0, cx, cy, r); const cc = mixc(L.top, L.hor, 0.3 + hash1(i) * 0.3); gg.addColorStop(0, css(cc, 0.5 * L.cover)); gg.addColorStop(1, css(cc, 0)); c.fillStyle = gg; c.fillRect(cx - r, cy - r, r * 2, r * 2); }
    }
    const hz = c.createLinearGradient(0, hy - h * 0.12, 0, hy + 2); hz.addColorStop(0, css(L.hor, 0)); hz.addColorStop(1, css(L.hor, 0.8)); c.fillStyle = hz; c.fillRect(0, hy - h * 0.12, w, h * 0.12 + 2);
  });
}

/* ---- terrain: periodic height tiles (built once), sampled by a front-to-back column marcher (voxel-space style) at low resolution ---- */
const N = 256, CELL = 0.6, SPAN = N * CELL, TAU = Math.PI * 2;
interface Tiles { h: Float32Array; m: Float32Array; gx: Float32Array; gz: Float32Array; mgx: Float32Array; mgz: Float32Array }
let tiles: Tiles | null = null;
const hi = (a: number, b: number, P: number, sd: number) => { let k = (((a % P) + P) % P) * 374761393 + (((b % P) + P) % P) * 668265263 + sd * 982451653; k = Math.imul(k ^ (k >>> 13), 1274126177); return ((k ^ (k >>> 16)) >>> 0) / 4294967296; };
function pvn(x: number, y: number, P: number, sd: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hi(ix, iy, P, sd), b = hi(ix + 1, iy, P, sd), c = hi(ix, iy + 1, P, sd), d = hi(ix + 1, iy + 1, P, sd);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
export const pathX = (zw: number) => Math.sin((zw / SPAN) * TAU * 3) * 3.2 + Math.sin((zw / SPAN) * TAU) * 5;
function getTiles(): Tiles {
  if (tiles) return tiles;
  const h = new Float32Array(N * N), m = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = i / N, v = j / N, xw = (i - N / 2) * CELL, zw = j * CELL;
    const n = 0.5 * pvn(u * 8, v * 8, 8, 1) + 0.3 * pvn(u * 16, v * 16, 16, 2) + 0.2 * pvn(u * 32, v * 32, 32, 3);
    const valley = smooth(1.2, 9, Math.abs(xw - pathX(zw)));
    h[j * N + i] = (n - 0.35) * (2 + 8 * valley) * valley + pvn(u * 64, v * 64, 64, 4) * 0.25 * valley;
    const r = 0.55 * pvn(u * 3, v * 3, 3, 5) + 0.3 * pvn(u * 6, v * 6, 6, 6) + 0.15 * pvn(u * 12, v * 12, 12, 7);
    m[j * N + i] = Math.pow(r, 1.5) * 20 + 1;
  }
  const grad = (src: Float32Array, dir: number) => { const g = new Float32Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) g[j * N + i] = dir ? (src[((j + 1) % N) * N + i]! - src[((j + N - 1) % N) * N + i]!) / (2 * CELL) : (src[j * N + ((i + 1) % N)]! - src[j * N + ((i + N - 1) % N)]!) / (2 * CELL); return g; };
  tiles = { h, m, gx: grad(h, 0), gz: grad(h, 1), mgx: grad(m, 0), mgz: grad(m, 1) };
  return tiles;
}
const samp = (a: Float32Array, u: number, v: number) => {
  const iu = Math.floor(u), iv = Math.floor(v), fu = u - iu, fv = v - iv, x0 = ((iu % N) + N) % N, y0 = ((iv % N) + N) % N, x1 = (x0 + 1) % N, y1 = (y0 + 1) % N;
  const p = a[y0 * N + x0]!, q = a[y0 * N + x1]!, r = a[y1 * N + x0]!, t = a[y1 * N + x1]!;
  return p + (q - p) * fu + (r - p) * fv + (p - q - r + t) * fu * fv;
};
/** Terrain height at world (x, zw); `z` is the distance from the camera (far mountains rise with it). */
export function heightAt(x: number, zw: number, z: number) {
  const T = getTiles(), far = smooth(40, 105, z);
  return samp(T.h, x / CELL + N / 2, zw / CELL) + (far > 0 ? far * samp(T.m, x * 0.5 / CELL + N / 2, zw * 0.5 / CELL) : 0);
}

export const VOX_H = 4.4;
/** Marches every screen column front to back into a small RGBA buffer (alpha 0 = sky). Lit by a side/back sun, fogged by distance, snow on peaks. */
export function renderTerrain(img: Uint8ClampedArray, RW: number, RH: number, env: Env, L: Look, wx: LandWeather, scroll: number, camX: number, hyN: number) {
  const T = getTiles(), f = RH * 0.95, hy = RH * hyN, cx = RW / 2;
  img.fill(0);
  const fogC = mixc(L.hor, L.top, 0.15), low = mixc(hsl(100, 0.36, 0.36), env.pal.primary, 0.06), high = hsl(220, 0.08, 0.42);
  const sd = L.sunX < 0.5 ? -1 : 1, lx = sd * 0.6, ly = 0.55, lz = -0.3, ln = Math.hypot(lx, ly, lz);
  const lightC = mixc(WHITE, L.sun, 0.4 + 0.3 * L.warm), snowK = wx === 'snow' ? 0.78 : 0.0, amb = 0.3 + 0.3 * L.light;
  const dens = L.fog * 0.6, camY = VOX_H;
  for (let sx = 0; sx < RW; sx++) {
    const dir = (sx - cx) / f; let yb = RH, z = 3.2;
    while (z < 110 && yb > 0) {
      const x = camX + dir * z, zw = z + scroll, u = x / CELL + N / 2, v = zw / CELL, far = smooth(40, 105, z);
      let H = samp(T.h, u, v), gx = samp(T.gx, u, v), gz = samp(T.gz, u, v);
      if (far > 0) { const um = x * 0.5 / CELL + N / 2, vm = zw * 0.5 / CELL; H += far * samp(T.m, um, vm); gx += far * samp(T.mgx, um, vm) * 0.5; gz += far * samp(T.mgz, um, vm) * 0.5; }
      const y = hy + ((camY - H) * f) / z;
      if (y < yb) {
        const nl = ((-gx * lx + ly - gz * lz) / (ln * Math.hypot(gx, 1, gz))), sh = (amb + (1 - amb) * clamp(nl * 1.2 - 0.1, 0, 1)) * (0.45 + 0.75 * L.light);
        const el = smooth(0, 12, H), snow = clamp(smooth(5, 14, H) * 0.9 + snowK * (0.5 + 0.5 * (1 - el)), 0, 1);
        const fg = clamp(1 - Math.exp(-z * dens), 0, 0.98);
        let r = low[0] + (high[0] - low[0]) * el * 0.8, g = low[1] + (high[1] - low[1]) * el * 0.8, b = low[2] + (high[2] - low[2]) * el * 0.8;
        r += (1 - r) * snow; g += (1 - g) * snow; b += (1 - b) * snow;
        r = r * sh * (0.6 + 0.4 * lightC[0]) ; g = g * sh * (0.6 + 0.4 * lightC[1]); b = b * sh * (0.6 + 0.4 * lightC[2]);
        r += (fogC[0] - r) * fg; g += (fogC[1] - g) * fg; b += (fogC[2] - b) * fg;
        const R = clamp(r, 0, 1) * 255, G = clamp(g, 0, 1) * 255, B = clamp(b, 0, 1) * 255, y0 = Math.max(0, Math.floor(y));
        for (let yy = y0; yy < yb; yy++) { const k = (yy * RW + sx) * 4; img[k] = R; img[k + 1] = G; img[k + 2] = B; img[k + 3] = 255; }
        yb = y0;
      }
      z += Math.max(0.12, z * 0.022);
    }
  }
}
/** Grass tufts and stones scattered on the near field, tied to world positions so they slide past with the scroll. */
export function paintScatter(c: CanvasRenderingContext2D, env: Env, L: Look, wx: LandWeather, scroll: number, cam: number, hy: number) {
  const { w, h } = env, f = h * 0.95, cx = w / 2, camH = VOX_H, span = 16, cell = 1.15;
  const grass = mixc(hsl(95, 0.35, 0.3), env.pal.primary, 0.06).map((v) => v * (0.3 + 0.9 * L.light)) as RGB;
  const stone = mixc(hsl(220, 0.08, 0.4), [0, 0, 0], 0.2).map((v) => v * (0.35 + 0.8 * L.light)) as RGB;
  const items: { z: number; x: number; k: number; id: number }[] = [];
  const iz0 = Math.floor(scroll / cell);
  for (let iz = iz0; iz < iz0 + span / cell; iz++) for (let j = 0; j < 3; j++) {
    const id = iz * 7 + j, x = (hash1(id) - 0.5) * 22 + pathX(iz * cell), z = iz * cell - scroll + hash1(id + 5) * cell;
    if (z > 2.2 && Math.abs(x - pathX(iz * cell)) > 1.3) items.push({ z, x, k: hash1(id + 9), id });
  }
  items.sort((a, b) => b.z - a.z);
  for (const it of items) {
    const zw = it.z + scroll, sx = cx + ((it.x - cam) / it.z) * f, y = hy + ((camH - heightAt(it.x, zw, it.z)) * f) / it.z, s = f / it.z * 0.11;
    if (sx < -30 || sx > w + 30 || y > h + 20) continue;
    if (it.k < 0.7) {
      c.strokeStyle = css(wx === 'snow' ? mixc(grass, WHITE, 0.6) : grass, 0.95); c.lineWidth = Math.max(1, s * 0.12); c.lineCap = 'round'; c.beginPath();
      for (let b = -3; b <= 3; b++) { c.moveTo(sx + b * s * 0.18, y); c.quadraticCurveTo(sx + b * s * 0.3, y - s * 0.7, sx + b * s * 0.5 + Math.sin(env.t * 1.5 + it.id) * s * 0.12, y - s * (1.1 + hash1(it.id + b) * 0.5)); }
      c.stroke();
    } else {
      c.fillStyle = css(wx === 'snow' ? mixc(stone, WHITE, 0.3) : stone); c.beginPath(); c.ellipse(sx, y - s * 0.12, s * 0.7, s * 0.4, 0, 0, 6.3); c.fill();
      c.fillStyle = css(WHITE, wx === 'snow' ? 0.8 : 0.12 * L.light); c.beginPath(); c.ellipse(sx - s * 0.1, y - s * 0.32, s * 0.45, s * 0.14, 0, 0, 6.3); c.fill();
    }
  }
}
export function lightning(c: CanvasRenderingContext2D, env: Env, hy: number): number {
  const { w, t } = env, cyc = t * 0.2, id = Math.floor(cyc), ph = cyc - id;
  if (ph > 0.07) return 0;
  const fl = (1 - ph / 0.07) * (0.6 + 0.4 * Math.sin(ph * 180));
  let x = w * (0.15 + hash1(id * 3) * 0.7), y = 0;
  c.strokeStyle = `rgba(235,240,255,${clamp(fl, 0, 1)})`; c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath(); c.moveTo(x, y);
  for (let k = 0; y < hy; k++) { x += (hash1(id * 17 + k) - 0.5) * w * 0.07; y += hy * (0.06 + hash1(id * 5 + k) * 0.07); c.lineTo(x, Math.min(y, hy)); }
  c.stroke();
  return fl;
}
