import { css, hsl, lerp, mixc, rng, WHITE, type Env, type RGB } from './_tu-three-kit';
export { glowSprite } from './_tu-three-kit';

/* Painting helpers for the mossy forest scene: seasonal palettes, trunks, the root arch, ground moss, ferns and falling items. */

export type ForestVariant = 'moss' | 'spring' | 'autumn' | 'winter';
export const FOREST_VARIANTS: ForestVariant[] = ['moss', 'spring', 'autumn', 'winter'];
export interface Season { hue: number; sat: number; fall: 'none' | 'petal' | 'leaf' | 'snow'; litter: number; frost: number }
export const SEASONS: Record<ForestVariant, Season> = {
  moss: { hue: 112, sat: 0.42, fall: 'none', litter: 0, frost: 0 },
  spring: { hue: 98, sat: 0.4, fall: 'petal', litter: 0, frost: 0 },
  autumn: { hue: 52, sat: 0.4, fall: 'leaf', litter: 1, frost: 0 },
  winter: { hue: 165, sat: 0.2, fall: 'snow', litter: 0, frost: 1 },
};
export interface Tones { sky0: RGB; sky1: RGB; glow: RGB; bark: RGB; moss: RGB; mossLit: RGB; fog: RGB; accent: RGB; accent2: RGB; hue: number }

export function tones(env: Env, v: ForestVariant): Tones {
  const s = SEASONS[v], d = env.dark, pal = env.pal;
  const f = (l: number, sat = s.sat) => hsl(s.hue, sat, l);
  const tint = (c: RGB) => mixc(c, pal.primary, 0.1);
  const accent = v === 'spring' ? mixc(WHITE, pal.primary, 0.28) : v === 'autumn' ? mixc(pal.signal, [0.8, 0.2, 0.1], 0.35) : mixc(pal.signal, WHITE, 0.45);
  return {
    sky0: tint(d ? f(0.05) : f(0.62, s.sat * 0.8)), sky1: tint(d ? f(0.2, s.sat + 0.1) : f(0.9, s.sat * 0.9)),
    glow: mixc(d ? f(0.45, 0.6) : f(0.96, 0.6), pal.signal, v === 'autumn' ? 0.55 : 0.3), bark: tint(d ? hsl(26, 0.22, 0.1) : hsl(26, 0.22, 0.2)),
    moss: tint(f(d ? 0.2 : 0.3, s.sat + 0.1)), mossLit: tint(f(d ? 0.38 : 0.5, s.sat + 0.2)), fog: tint(d ? f(0.14, s.sat) : f(0.86, s.sat)),
    accent, accent2: mixc(accent, pal.primary, 0.45), hue: s.hue,
  };
}

function trunk(c: CanvasRenderingContext2D, x: number, w: number, h: number, base: RGB, fog: RGB, k: number, r: () => number, y0: number) {
  const col = mixc(base, fog, k);
  const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, css(mixc(col, fog, 0.15))); g.addColorStop(0.55, css(col)); g.addColorStop(1, css(mixc(col, [0, 0, 0], 0.35 * (1 - k))));
  c.fillStyle = g;
  c.beginPath(); c.moveTo(x - w * 0.62, y0); c.quadraticCurveTo(x - w * 0.5, y0 - h * 0.12, x - w / 2, y0 - h * 0.3);
  c.lineTo(x - w * 0.42, -4); c.lineTo(x + w * 0.42, -4); c.lineTo(x + w / 2, y0 - h * 0.3); c.quadraticCurveTo(x + w * 0.5, y0 - h * 0.12, x + w * 0.62, y0); c.closePath(); c.fill();
  c.strokeStyle = css(mixc(col, [0, 0, 0], 0.4), 0.35 * (1 - k * 0.7)); c.lineWidth = 1;
  for (let i = 0; i < w / 5; i++) { const px = x + (r() - 0.5) * w * 0.8; c.beginPath(); c.moveTo(px, y0); c.lineTo(px + (r() - 0.5) * 6, r() * h * 0.5); c.stroke(); }
}
export function paintTrunks(c: CanvasRenderingContext2D, W: number, H: number, T: Tones, seed: number, n: number, wmin: number, wmax: number, fogK: number, frost: number) {
  const r = rng(seed), y0 = H * 0.8;
  for (let i = 0; i < n; i++) {
    const x = ((i + 0.3 + r() * 0.5) / n) * W, w = lerp(wmin, wmax, r());
    trunk(c, x, w, H, T.bark, T.fog, fogK, r, y0);
    c.fillStyle = css(mixc(T.moss, T.fog, fogK), 0.85);
    for (let j = 0; j < w * 0.35; j++) { const yy = y0 - r() * H * 0.34; c.beginPath(); c.arc(x + (r() - 0.5) * w * 0.9, yy, 1 + r() * w * 0.09, 0, 6.3); c.fill(); }
    if (frost) { c.fillStyle = css(mixc(WHITE, T.fog, fogK), 0.6); for (let j = 0; j < 22; j++) c.fillRect(x - w * 0.46 + r() * w * 0.2, r() * H * 0.7, 2, 3 + r() * 8); }
  }
}
export function paintGround(c: CanvasRenderingContext2D, W: number, H: number, T: Tones, seed: number, y: number, amp: number, tone: number, tufts: number, frost: number) {
  const r = rng(seed), ph = r() * 9;
  const g = c.createLinearGradient(0, y - amp, 0, H);
  g.addColorStop(0, css(mixc(T.mossLit, T.fog, 0.2 * (1 - tone)))); g.addColorStop(1, css(mixc(T.moss, [0, 0, 0], 0.5 * tone)));
  c.fillStyle = g; c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) c.lineTo(x, y + Math.sin(x * 0.011 + ph) * amp + Math.sin(x * 0.033 + ph * 2) * amp * 0.35);
  c.lineTo(W, H); c.closePath(); c.fill();
  for (let i = 0; i < tufts; i++) {
    const x = r() * W, yy = y + r() * (H - y) * 0.85 + Math.sin(x * 0.011 + ph) * amp, s = 5 + r() * 12;
    c.fillStyle = css(mixc(r() < 0.5 ? T.moss : T.mossLit, [0, 0, 0], r() * 0.25 * tone), 0.9);
    for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + (k - 1.5) * s * 0.5, yy - (k % 2) * s * 0.2, s * (0.45 + r() * 0.3), 0, 6.3); c.fill(); }
    if (frost) { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x, yy - s * 0.45, s * 0.9, s * 0.28, 0, 0, 6.3); c.fill(); }
  }
}
/** The big root arch: outer/inner ellipse ring with bark strokes, a moss cap and hanging strands. */
export function paintArch(c: CanvasRenderingContext2D, W: number, H: number, T: Tones, seed: number, frost: number) {
  const r = rng(seed), cx = W / 2, gy = H * 0.84, rx = W * 0.3, ry = H * 0.66, th = Math.max(20, Math.min(W * 0.075, 70));
  const ring = (k: number, a0: number, a1: number) => { for (let a = a0; a <= a1; a += 0.04) { const x = cx + Math.cos(a) * (rx + k), y = gy - Math.sin(a) * (ry + k * 0.9); a === a0 ? c.moveTo(x, y) : c.lineTo(x, y); } };
  const g = c.createLinearGradient(cx - rx, 0, cx + rx, 0);
  g.addColorStop(0, css(mixc(T.bark, T.fog, 0.1))); g.addColorStop(0.5, css(mixc(T.bark, [0, 0, 0], 0.3))); g.addColorStop(1, css(mixc(T.bark, [0, 0, 0], 0.5)));
  c.fillStyle = g; c.beginPath(); ring(th * 0.5, 0, Math.PI); for (let a = Math.PI; a >= 0; a -= 0.04) c.lineTo(cx + Math.cos(a) * (rx - th * 0.5), gy - Math.sin(a) * (ry - th * 0.45)); c.closePath(); c.fill();
  c.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI, k = (r() - 0.5) * th * 0.85, x = cx + Math.cos(a) * (rx + k), y = gy - Math.sin(a) * (ry + k * 0.9), ang = a + Math.PI / 2;
    c.strokeStyle = r() < 0.5 ? css([0, 0, 0], 0.22) : css(T.mossLit, 0.1); c.lineWidth = 0.8 + r() * 1.4;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang) * (6 + r() * 14), y - Math.sin(ang) * (6 + r() * 14)); c.stroke();
  }
  for (let i = 0; i < 150; i++) {
    const a = 0.02 + r() * (Math.PI - 0.04), top = 0.5 + 0.5 * Math.sin(a), k = th * (0.38 + r() * 0.22);
    const x = cx + Math.cos(a) * (rx + k), y = gy - Math.sin(a) * (ry + k * 0.9), s = 3 + r() * 9 * (0.5 + top * 0.6);
    c.fillStyle = css(mixc(T.moss, T.mossLit, r()), 0.95); c.beginPath(); c.arc(x, y, s, 0, 6.3); c.fill();
    if (frost && top > 0.6) { c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(x, y - s * 0.4, s * 0.8, 0, 6.3); c.fill(); }
  }
  c.strokeStyle = css(T.mossLit, 0.75); c.lineWidth = 1.1;
  for (let i = 0; i < 70; i++) { const a = 0.15 + r() * (Math.PI - 0.3), x = cx + Math.cos(a) * (rx - th * 0.45), y = gy - Math.sin(a) * (ry - th * 0.42); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + (r() - 0.5) * 4, y + 6, x + (r() - 0.5) * 6, y + 8 + r() * 22); c.stroke(); }
}

/** One fern: `n` fronds fanned from the base, each a drooping stem with paired leaflets; `sway` in radians. */
export function fern(c: CanvasRenderingContext2D, x: number, y: number, s: number, sway: number, col: RGB, stem: RGB, seed: number) {
  const r = rng(seed), n = 9;
  c.lineCap = 'round';
  c.strokeStyle = css(col); c.fillStyle = css(col);
  for (let f = 0; f < n; f++) {
    const a0 = ((f / (n - 1)) * 2 - 1) * 1.25 + (r() - 0.5) * 0.15, L = s * (46 + r() * 30) * (1 - Math.abs(a0) * 0.18), droop = a0 * 0.9 + (r() - 0.5) * 0.3, steps = 13;
    let px = x, py = y, ang = a0 + sway * (0.6 + r() * 0.8);
    const sx: number[] = [px], sy: number[] = [py], sa: number[] = [ang];
    for (let i = 1; i <= steps; i++) { ang += droop / steps + sway * 0.08; px += Math.sin(ang) * (L / steps); py -= Math.cos(ang) * (L / steps); sx.push(px); sy.push(py); sa.push(ang); }
    c.lineWidth = Math.max(0.8, s * 1.1); c.beginPath();
    for (let i = 3; i <= steps; i++) {
      const u = i / steps, ll = s * 15 * Math.sin(Math.PI * Math.pow(u, 0.7)) * (0.5 + 0.5 * (1 - u)) + 1, a = sa[i]!;
      for (const sd of [-1, 1]) { const b = a + sd * 1.15 + droop * 0.2; c.moveTo(sx[i]!, sy[i]!); c.lineTo(sx[i]! + Math.sin(b) * ll, sy[i]! - Math.cos(b) * ll); }
    }
    c.stroke();
    c.strokeStyle = css(stem); c.lineWidth = Math.max(1, s * 1.5); c.beginPath(); c.moveTo(sx[0]!, sy[0]!); for (let i = 1; i <= steps; i++) c.lineTo(sx[i]!, sy[i]!); c.stroke(); c.strokeStyle = css(col);
  }
}

export interface Mote { x: number; y: number; z: number; ph: number; sp: number; rot: number; size: number }
export function makeMotes(n: number, seed: number): Mote[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ x: r(), y: r(), z: 0.3 + r() * 0.7, ph: r() * 6.3, sp: 0.5 + r(), rot: r() * 6.3, size: 0.6 + r() * 0.8 }));
}
export function leafPath(c: CanvasRenderingContext2D, s: number) {
  c.beginPath(); c.moveTo(0, -s);
  c.bezierCurveTo(s * 0.9, -s * 0.5, s * 0.8, s * 0.5, 0, s); c.bezierCurveTo(-s * 0.8, s * 0.5, -s * 0.9, -s * 0.5, 0, -s); c.closePath();
}
