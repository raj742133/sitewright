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
    noon: { top: mixc(p.primary, [0.45, 0.7, 1], 0.55), hor: mixc(WHITE, mixc(p.primary, [0.6, 0.8, 1], 0.5), 0.35), sun: [1, 0.97, 0.85], sunX: 0.66, sunY: 0.5, light: 1, warm: 0, fog: 0.012, stars: 0, cover: 0, moon: false },
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
    const sprite = glowSprite(L.sun), R = Math.min(w, h) * (L.moon ? 0.5 : 0.7);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = (L.moon ? 0.5 : 0.9) * hide; c.drawImage(sprite, sx - R, sy - R, R * 2, R * 2); c.globalCompositeOperation = 'source-over'; c.globalAlpha = hide;
    c.fillStyle = css(L.sun); c.beginPath(); c.arc(sx, sy, Math.min(w, h) * (L.moon ? 0.035 : 0.045), 0, 6.3); c.fill();
    if (L.moon) { c.fillStyle = css(mixc(L.top, L.hor, 0.5)); c.beginPath(); c.arc(sx + Math.min(w, h) * 0.014, sy - Math.min(w, h) * 0.008, Math.min(w, h) * 0.03, 0, 6.3); c.fill(); }
    c.globalAlpha = 1;
    if (L.cover > 0) { // soft cloud banks
      for (let i = 0; i < 14; i++) { const cx = hash1(i * 11) * w, cy = hash1(i * 13 + 2) * hy * 0.7, r = w * (0.12 + hash1(i * 17) * 0.14); const gg = c.createRadialGradient(cx, cy, 0, cx, cy, r); const cc = mixc(L.top, L.hor, 0.3 + hash1(i) * 0.3); gg.addColorStop(0, css(cc, 0.5 * L.cover)); gg.addColorStop(1, css(cc, 0)); c.fillStyle = gg; c.fillRect(cx - r, cy - r, r * 2, r * 2); }
    }
    const hz = c.createLinearGradient(0, hy - h * 0.12, 0, hy + 2); hz.addColorStop(0, css(L.hor, 0)); hz.addColorStop(1, css(L.hor, 0.8)); c.fillStyle = hz; c.fillRect(0, hy - h * 0.12, w, h * 0.12 + 2);
  });
}

const pathX = (zw: number) => Math.sin(zw * 0.045) * 3.2 + Math.sin(zw * 0.013) * 5;
export function heightAt(x: number, zw: number, z: number) {
  const dx = Math.abs(x - pathX(zw)), valley = smooth(1.2, 9, dx);
  const hills = (fbm2(x * 0.09 + 3, zw * 0.09) - 0.3) * (2.5 + 9 * valley);
  const far = smooth(34, 95, z) * (fbm2(x * 0.04 + 20, zw * 0.035) * 20 + 2);
  return hills * valley + far + noise2(x * 0.7, zw * 0.7) * 0.25 * valley;
}

export interface Rig { rows: number; zNear: number; zFar: number }
/** Draws the terrain rows far to near. `scroll` moves the camera forward, `cam` shifts it sideways. */
export function paintTerrain(c: CanvasRenderingContext2D, env: Env, L: Look, wx: LandWeather, scroll: number, cam: number, hy: number, rig: Rig) {
  const { w, h } = env, f = h * 0.95, cx = w / 2, camH = 3.4, step = Math.max(5, Math.round(w / 110));
  const low = mixc(hsl(98, 0.3, 0.32), env.pal.primary, 0.07), high = hsl(220, 0.1, 0.45), snowK = wx === 'snow' ? 0.82 : 0.1;
  const fogC = mixc(L.hor, L.top, 0.15);
  const lightC = mixc(WHITE, L.sun, 0.35 * L.warm + 0.1);
  for (let i = 0; i < rig.rows; i++) {
    const u = 1 - i / (rig.rows - 1), z = rig.zNear * Math.pow(rig.zFar / rig.zNear, u), zw = z + scroll;
    const pts: number[] = []; let top = h, sumH = 0, n = 0;
    for (let sx = -step; sx <= w + step; sx += step) {
      const x = ((sx - cx) / f) * z + cam, Ht = heightAt(x, zw, z), y = hy + ((camH - Ht) * f) / z;
      pts.push(sx, y); top = Math.min(top, y); sumH += Ht; n++;
    }
    const avg = sumH / n, fogF = clamp(1 - Math.exp(-z * L.fog * 1.6), 0, 0.97);
    const elev = smooth(-1, 12, avg), snow = clamp(smooth(5, 15, avg) * 0.85 + snowK * (0.4 + 0.6 * (1 - elev)), 0, 1);
    let col = mixc(low, high, elev * 0.8);
    col = col.map((v) => v * (0.25 + 0.95 * L.light)) as RGB; col = mixc(col, lightC, 0.1 * L.light);
    const topCol = mixc(mixc(col, WHITE, snow * 0.9 * (0.3 + L.light)), lightC, 0.2 * L.light), nearTone = mixc(col, [0, 0, 0], 0.25);
    const g = c.createLinearGradient(0, top, 0, Math.min(h, top + (h - hy) * 0.22 + 30));
    g.addColorStop(0, css(mixc(topCol, fogC, fogF))); g.addColorStop(1, css(mixc(nearTone, fogC, fogF)));
    c.fillStyle = g; c.beginPath(); c.moveTo(pts[0]!, h + 2);
    for (let k = 0; k < pts.length; k += 2) c.lineTo(pts[k]!, pts[k + 1]!);
    c.lineTo(pts[pts.length - 2]!, h + 2); c.closePath(); c.fill();
    if (z > 7) { c.strokeStyle = css(mixc(lightC, fogC, fogF * 0.9), 0.18 * L.light + 0.04); c.lineWidth = 1; c.beginPath(); for (let k = 0; k < pts.length; k += 2) k ? c.lineTo(pts[k]!, pts[k + 1]!) : c.moveTo(pts[k]!, pts[k + 1]!); c.stroke(); }
  }
}
/** Grass tufts and stones scattered on the near field, tied to world positions so they slide past with the scroll. */
export function paintScatter(c: CanvasRenderingContext2D, env: Env, L: Look, wx: LandWeather, scroll: number, cam: number, hy: number) {
  const { w, h } = env, f = h * 0.95, cx = w / 2, camH = 3.4, span = 16, cell = 1.15;
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
