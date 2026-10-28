import { clamp, css, mixc, type RGB } from './_tu-three-kit';

/* Generic procedural tower silhouettes (all invented forms, not any real monument): a tiered pagoda, a slender balconied minaret-like
   tower, a stepped stupa-like mound with a stacked spire, a lighthouse-like tower with a sweeping beam, and a corncob-like stacked spire. */

export type TowerKind = 'pagoda' | 'minaret' | 'stupa' | 'pharos' | 'spire';
export const TOWER_KINDS: TowerKind[] = ['pagoda', 'minaret', 'stupa', 'pharos', 'spire'];
export interface TowerStyle { body: RGB; roof: RGB; trim: RGB; lit: RGB; /** 0..1 lamp strength */ lamp: number; /** seconds, drives flicker and beams */ t: number; seed?: number }
type C = CanvasRenderingContext2D;

const win = (c: C, x: number, y: number, w: number, h: number, s: TowerStyle, k: number, arch = false) => {
  const f = s.lamp * (0.8 + 0.2 * Math.sin(s.t * 5 + k * 2.7) * Math.sin(s.t * 3.1 + k));
  c.fillStyle = css(s.lit, clamp(f, 0, 1));
  if (arch) { c.beginPath(); c.moveTo(x - w / 2, y + h); c.lineTo(x - w / 2, y); c.arc(x, y, w / 2, Math.PI, 0); c.lineTo(x + w / 2, y + h); c.closePath(); c.fill(); }
  else c.fillRect(x - w / 2, y, w, h);
};

function pagoda(c: C, x: number, by: number, H: number, s: TowerStyle) {
  const n = 5;
  c.fillStyle = css(s.trim); c.fillRect(x - H * 0.23, by - H * 0.035, H * 0.46, H * 0.035); c.fillRect(x - H * 0.2, by - H * 0.06, H * 0.4, H * 0.03);
  let y = by - H * 0.06;
  for (let i = 0; i < n; i++) {
    const k = 1 - i * 0.14, w = H * 0.3 * k, bh = H * 0.1 * (1 - i * 0.05), rw = w * 1.7, rh = H * 0.07 * (1 - i * 0.04);
    c.fillStyle = css(s.body); c.fillRect(x - w / 2, y - bh, w, bh);
    c.fillStyle = css(s.trim, 0.9); c.fillRect(x - w / 2 - 1, y - bh, w + 2, Math.max(1.5, H * 0.008)); for (const d of [-0.5, 0.5]) c.fillRect(x + d * w * 0.9 - H * 0.004, y - bh, Math.max(2, H * 0.008), bh);
    win(c, x, y - bh * 0.75, w * 0.22, bh * 0.55, s, i, true);
    const yt = y - bh;
    c.fillStyle = css(s.roof); c.beginPath(); c.moveTo(x - rw / 2, yt - rh * 0.55); c.quadraticCurveTo(x - rw * 0.3, yt + rh * 0.12, x - w * 0.5, yt + 1);
    c.lineTo(x + w * 0.5, yt + 1); c.quadraticCurveTo(x + rw * 0.3, yt + rh * 0.12, x + rw / 2, yt - rh * 0.55);
    c.quadraticCurveTo(x + rw * 0.28, yt - rh * 0.72, x + w * 0.2, yt - rh * 1.2); c.lineTo(x - w * 0.2, yt - rh * 1.2); c.quadraticCurveTo(x - rw * 0.28, yt - rh * 0.72, x - rw / 2, yt - rh * 0.55); c.closePath(); c.fill();
    c.strokeStyle = css(s.trim, 0.8); c.lineWidth = Math.max(1, H * 0.006); c.beginPath(); c.moveTo(x - rw / 2, yt - rh * 0.55); c.quadraticCurveTo(x, yt + rh * 0.35, x + rw / 2, yt - rh * 0.55); c.stroke();
    y = yt - rh * 1.0;
  }
  c.fillStyle = css(s.trim); c.fillRect(x - H * 0.006, y - H * 0.14, H * 0.012, H * 0.14);
  for (let i = 0; i < 5; i++) { const w = H * (0.05 - i * 0.007); c.fillRect(x - w / 2, y - H * 0.025 * (i + 1) - H * 0.005, w, H * 0.01); }
  c.beginPath(); c.arc(x, y - H * 0.15, H * 0.012, 0, 6.3); c.fill();
}

function minaret(c: C, x: number, by: number, H: number, s: TowerStyle) {
  const w0 = H * 0.075, w1 = H * 0.055, top = by - H * 0.7;
  c.fillStyle = css(s.trim); c.fillRect(x - H * 0.065, by - H * 0.1, H * 0.13, H * 0.1); c.fillRect(x - H * 0.075, by - H * 0.11, H * 0.15, H * 0.014);
  c.fillStyle = css(s.body); c.beginPath(); c.moveTo(x - w0, by - H * 0.1); c.lineTo(x - w1, top); c.lineTo(x + w1, top); c.lineTo(x + w0, by - H * 0.1); c.closePath(); c.fill();
  c.fillStyle = css(s.trim, 0.7); for (const f of [0.28, 0.46, 0.62]) c.fillRect(x - mixW(w0, w1, f) - 1, by - H * (0.1 + f * 0.6), mixW(w0, w1, f) * 2 + 2, Math.max(1.5, H * 0.007));
  for (let i = 0; i < 4; i++) win(c, x, by - H * (0.18 + i * 0.12), w0 * 0.3, H * 0.045, s, i, true);
  for (const [yy, ww] of [[by - H * 0.5, 1.9], [top, 1.75]] as [number, number][]) {
    c.fillStyle = css(s.trim); c.beginPath(); c.moveTo(x - w1 * ww, yy - H * 0.02); c.lineTo(x + w1 * ww, yy - H * 0.02); c.lineTo(x + w1 * 1.15, yy + H * 0.02); c.lineTo(x - w1 * 1.15, yy + H * 0.02); c.closePath(); c.fill();
    c.fillStyle = css(s.body); c.fillRect(x - w1 * ww, yy - H * 0.05, w1 * ww * 2, H * 0.03);
    c.fillStyle = css(s.lit, 0.35 * s.lamp); for (let k = -3; k <= 3; k++) c.fillRect(x + (k / 3) * w1 * (ww - 0.1) - 0.8, yy - H * 0.05, 1.6, H * 0.03);
  }
  c.fillStyle = css(s.roof); c.beginPath(); c.moveTo(x - w1 * 1.2, top - H * 0.05); c.quadraticCurveTo(x - w1 * 1.0, top - H * 0.17, x, top - H * 0.3); c.quadraticCurveTo(x + w1 * 1.0, top - H * 0.17, x + w1 * 1.2, top - H * 0.05); c.closePath(); c.fill();
  c.fillStyle = css(s.trim); c.beginPath(); c.arc(x, top - H * 0.31, H * 0.012, 0, 6.3); c.fill(); c.fillRect(x - H * 0.003, top - H * 0.36, H * 0.006, H * 0.05);
}
const mixW = (a: number, b: number, f: number) => a + (b - a) * f;

function stupa(c: C, x: number, by: number, H: number, s: TowerStyle) {
  let y = by;
  [[0.62, 0.05], [0.52, 0.05], [0.43, 0.05]].forEach(([w, h], i) => {
    c.fillStyle = css(i % 2 ? s.trim : s.body); c.fillRect(x - H * w! / 2, y - H * h!, H * w!, H * h!);
    c.fillStyle = css(s.lit, 0.55 * s.lamp); for (let k = -3; k <= 3; k++) c.fillRect(x + k * H * w! * 0.13 - 1, y - H * h! * 0.6, 2, 3);
    y -= H * h!;
  });
  const dw = H * 0.17, dh = H * 0.27;
  c.fillStyle = css(s.body); c.beginPath(); c.ellipse(x, y, dw, dh, 0, Math.PI, 0); c.closePath(); c.fill();
  const g = c.createLinearGradient(x - dw, 0, x + dw, 0); g.addColorStop(0, css(s.trim, 0.35)); g.addColorStop(0.5, css(s.trim, 0)); g.addColorStop(1, css([0, 0, 0], 0.25));
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, dw, dh, 0, Math.PI, 0); c.closePath(); c.fill();
  win(c, x, y - dh * 0.42, dw * 0.3, dh * 0.34, s, 1, true);
  y -= dh;
  c.fillStyle = css(s.trim); c.fillRect(x - H * 0.05, y - H * 0.04, H * 0.1, H * 0.04); c.fillStyle = css(s.body); c.fillRect(x - H * 0.04, y - H * 0.08, H * 0.08, H * 0.04); y -= H * 0.08;
  for (let i = 0; i < 7; i++) { const w = H * (0.075 - i * 0.008); c.fillStyle = css(i % 2 ? s.trim : s.roof); c.fillRect(x - w / 2, y - H * 0.028, w, H * 0.026); y -= H * 0.028; }
  c.fillStyle = css(s.trim); c.fillRect(x - H * 0.004, y - H * 0.06, H * 0.008, H * 0.06); c.beginPath(); c.arc(x, y - H * 0.065, H * 0.01, 0, 6.3); c.fill();
}

function pharos(c: C, x: number, by: number, H: number, s: TowerStyle) {
  const secs: [number, number, number][] = [[0.2, 0.15, 0.4], [0.14, 0.115, 0.24], [0.1, 0.09, 0.14]];
  let y = by;
  c.fillStyle = css(s.trim); c.fillRect(x - H * 0.15, by - H * 0.025, H * 0.3, H * 0.025);
  y -= H * 0.025;
  secs.forEach(([w0, w1, h], i) => {
    c.fillStyle = css(s.body); c.beginPath(); c.moveTo(x - H * w0 / 2, y); c.lineTo(x - H * w1 / 2, y - H * h); c.lineTo(x + H * w1 / 2, y - H * h); c.lineTo(x + H * w0 / 2, y); c.closePath(); c.fill();
    c.fillStyle = css(s.roof, 0.55); for (let k = 0; k < 3; k++) { const yy = y - H * h * (0.2 + k * 0.3); c.fillRect(x - H * mixW(w0, w1, (0.2 + k * 0.3)) / 2, yy, H * mixW(w0, w1, (0.2 + k * 0.3)), Math.max(1, H * 0.006)); }
    for (let k = 0; k < 2 + (i === 0 ? 1 : 0); k++) win(c, x, y - H * h * (0.25 + k * 0.28), H * 0.014, H * 0.03, s, i * 3 + k);
    y -= H * h;
    c.fillStyle = css(s.trim); c.fillRect(x - H * w1 * 0.7, y - H * 0.012, H * w1 * 1.4, H * 0.014);
  });
  const lw = H * 0.075, lh = H * 0.08, ly = y - H * 0.012;
  c.fillStyle = css(s.lit, 0.95 * Math.max(0.35, s.lamp)); c.fillRect(x - lw / 2, ly - lh, lw, lh);
  c.fillStyle = css(s.body); for (const d of [-1, 0, 1]) c.fillRect(x + d * lw * 0.33 - H * 0.004, ly - lh, H * 0.008, lh);
  c.fillStyle = css(s.roof); c.beginPath(); c.moveTo(x - lw * 0.7, ly - lh); c.lineTo(x, ly - lh - H * 0.07); c.lineTo(x + lw * 0.7, ly - lh); c.closePath(); c.fill();
  c.fillStyle = css(s.trim); c.fillRect(x - H * 0.003, ly - lh - H * 0.11, H * 0.006, H * 0.04);
  if (s.lamp > 0.05) {
    const a = s.t * 0.7, len = H * 2.6, sp = 0.09, ox = x, oy = ly - lh / 2;
    const dir = Math.cos(a), g = c.createLinearGradient(ox, oy, ox + dir * len, oy);
    g.addColorStop(0, css(s.lit, 0.42 * s.lamp * Math.abs(dir))); g.addColorStop(1, css(s.lit, 0));
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + dir * len, oy - len * sp * Math.abs(dir)); c.lineTo(ox + dir * len, oy + len * sp * Math.abs(dir)); c.closePath(); c.fill(); c.restore();
  }
}

function spire(c: C, x: number, by: number, H: number, s: TowerStyle) {
  let y = by;
  c.fillStyle = css(s.trim); c.fillRect(x - H * 0.2, y - H * 0.03, H * 0.4, H * 0.03); y -= H * 0.03;
  for (let i = 0; i < 6; i++) {
    const w = H * 0.34 * Math.pow(0.8, i), h = H * 0.125 * (1 - i * 0.04);
    c.fillStyle = css(s.body); c.fillRect(x - w / 2, y - h, w, h);
    c.fillStyle = css(s.roof); c.beginPath(); c.moveTo(x - w * 0.58, y - h); c.lineTo(x - w * 0.44, y - h * 1.28); c.lineTo(x + w * 0.44, y - h * 1.28); c.lineTo(x + w * 0.58, y - h); c.closePath(); c.fill();
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x + d * w * 0.5 - w * 0.07, y - h * 1.28); c.lineTo(x + d * w * 0.5, y - h * 1.28 - h * 0.5); c.lineTo(x + d * w * 0.5 + w * 0.07, y - h * 1.28); c.closePath(); c.fill(); }
    win(c, x, y - h * 0.8, w * 0.2, h * 0.55, s, i, true);
    c.fillStyle = css(s.trim, 0.8); c.fillRect(x - w * 0.5, y - h * 0.08, w, Math.max(1, h * 0.06));
    y -= h * 1.1;
  }
  c.fillStyle = css(s.roof); c.beginPath(); c.moveTo(x - H * 0.04, y); c.quadraticCurveTo(x - H * 0.045, y - H * 0.06, x, y - H * 0.1); c.quadraticCurveTo(x + H * 0.045, y - H * 0.06, x + H * 0.04, y); c.closePath(); c.fill();
  c.fillStyle = css(s.trim); c.fillRect(x - H * 0.003, y - H * 0.16, H * 0.006, H * 0.07);
}
const DRAW: Record<TowerKind, (c: C, x: number, by: number, H: number, s: TowerStyle) => void> = { pagoda, minaret, stupa, pharos, spire };

/** Draws one tower with its foot at (x, by) and its top about H above. `progress` (0..1) builds it up from the base behind a bright scan line. */
export function drawTower(c: C, kind: TowerKind, x: number, by: number, H: number, s: TowerStyle, progress = 1) {
  if (progress <= 0) return;
  c.save();
  if (progress < 1) { const top = by - H * 1.2 * progress; c.beginPath(); c.rect(x - H, top, H * 2, by - top + H); c.clip(); }
  DRAW[kind](c, x, by, H, s);
  c.restore();
  if (progress < 1) { const yy = by - H * 1.2 * progress; c.fillStyle = css(mixc(s.lit, [1, 1, 1], 0.4), 0.8 * (1 - progress)); c.fillRect(x - H * 0.3, yy, H * 0.6, 1.5); }
}
/** Rough height of a drawn tower relative to H (for fitting it into a frame). */
export const TOWER_TOP: Record<TowerKind, number> = { pagoda: 1.05, minaret: 1.0, stupa: 0.95, pharos: 1.0, spire: 1.0 };
