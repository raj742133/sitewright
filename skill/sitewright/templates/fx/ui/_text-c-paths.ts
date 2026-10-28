import { clamp, mix, rgba, smooth, type Frame } from './_text-c';

/* Glyph-on-path renderers for TextPathStudies: shared state, glyph placement, globe, cloth and ripple. */

export type PathVariant = 'globe' | 'cloth' | 'ripple' | 'ball' | 'morph';
export const PATH_VARIANTS: { id: PathVariant; label: string }[] = [
  { id: 'globe', label: 'Globe' }, { id: 'cloth', label: 'Cloth' }, { id: 'ripple', label: 'Ripple' }, { id: 'ball', label: 'Ball' }, { id: 'morph', label: 'Morph' },
];

export interface Burst { t0: number; x: number; y: number }
export interface PathState {
  px: number; py: number; inside: boolean; down: boolean; dragging: boolean;
  yaw: number; vyaw: number; pitch: number; zoom: number;
  bursts: Burst[]; now: number; lastSpawn: number;
  ball: { x: number; y: number; vx: number; vy: number; spin: number; squash: number; rest: number; init: boolean };
  mA: number; mB: number; mK: number; mHold: number; advance: boolean;
}
export const newPathState = (): PathState => ({
  px: 0, py: 0, inside: false, down: false, dragging: false, yaw: 0.6, vyaw: 0.25, pitch: 0.35, zoom: 1, bursts: [], now: 0, lastSpawn: -9,
  ball: { x: 0, y: 0, vx: 90, vy: 0, spin: 0, squash: 0, rest: 0, init: false }, mA: 3, mB: 3, mK: 1, mHold: 0, advance: false,
});

/** Places one glyph with an affine transform (no save/restore): angle in radians, sx/sy stretch. */
export function put(f: Frame, ch: string, x: number, y: number, ang: number, sx: number, sy: number) {
  const c = Math.cos(ang), s = Math.sin(ang), d = f.dpr;
  f.ctx.setTransform(c * sx * d, s * sx * d, -s * sy * d, c * sy * d, x * d, y * d);
  f.ctx.fillText(ch, 0, 0);
}
export const resetTransform = (f: Frame) => f.ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
export const glyphAt = (chars: string[], i: number) => chars[((i % chars.length) + chars.length) % chars.length] ?? '*';

/** Orthographic projection of a lat/lon point with yaw and pitch: returns x, y (up), depth z (1 = facing the viewer). */
export function project(lat: number, lon: number, yaw: number, pitch: number) {
  const l = lon + yaw;
  const x = Math.cos(lat) * Math.sin(l), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(l);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  return { x, y: y * cp - z * sp, z: y * sp + z * cp, ex: Math.cos(l), ey: Math.sin(l) * sp };
}

/** A procedural "land" mask so the globe shows continents without shipping map data. */
const land = (lat: number, lon: number) => Math.sin(lon * 2 + lat * 3) + Math.sin(lon * 3 - lat * 2 + 1) * 0.8 + Math.cos(lat * 5 + lon) * 0.5 > 0.1;
const MARKERS: [number, number][] = [[0.5, 0.8], [-0.3, 2.4], [0.15, 4.1], [0.8, 5.3]];

export function drawGlobe(f: Frame, s: PathState, chars: string[]) {
  const { ctx, w, h, pal, t } = f;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.4 * s.zoom;
  if (!s.dragging && !f.still) { s.vyaw += (0.25 - s.vyaw) * Math.min(1, f.dt * 1.5); s.yaw += s.vyaw * f.dt; }
  const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
  g.addColorStop(0, rgba(pal.primary, 0.14)); g.addColorStop(1, rgba(pal.primary, 0.02));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(pal.ink, 0.28); ctx.lineWidth = 1.2; ctx.stroke();
  const fs = clamp(R * 0.075, 7, 17);
  ctx.font = `600 ${fs.toFixed(1)}px ${f.family}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const step = (fs * 1.45) / R;
  let gi = 0;
  const landC = mix(pal.ink, pal.primary, 0.55);
  for (let lat = -Math.PI / 2 + step; lat < Math.PI / 2 - step * 0.5; lat += step) {
    const n = Math.max(5, Math.floor((2 * Math.PI * R * Math.cos(lat)) / (fs * 0.78)));
    for (let i = 0; i < n; i++) {
      const lon0 = (i / n) * Math.PI * 2;
      const isLand = land(lat, lon0);
      const p = project(lat, lon0, s.yaw, s.pitch);
      const ch = glyphAt(chars, gi++);
      if (p.z < 0) { if (isLand && p.z > -0.9) { ctx.fillStyle = rgba(pal.ink, 0.07); put(f, '·', cx + p.x * R, cy - p.y * R, 0, 1, 1); } continue; }
      ctx.fillStyle = isLand ? rgba(landC, 0.35 + 0.65 * p.z) : rgba(pal.muted, (0.2 + 0.5 * p.z) * 0.9);
      const sz = isLand ? 1.05 : 0.55;
      put(f, isLand ? ch : '·', cx + p.x * R, cy - p.y * R, Math.atan2(-p.ey, p.ex), Math.max(0.2, Math.sqrt(p.z)) * sz, sz);
    }
  }
  resetTransform(f);
  MARKERS.forEach(([la, lo], i) => {
    const p = project(la, lo, s.yaw, s.pitch);
    if (p.z < 0.05) return;
    const x = cx + p.x * R, y = cy - p.y * R, ph = f.still ? 0.4 : ((t * 0.7 + i * 0.25) % 1);
    ctx.fillStyle = rgba(pal.signal, 1); ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(pal.signal, (1 - ph) * 0.8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 4 + ph * 12, 0, Math.PI * 2); ctx.stroke();
  });
}

export function drawCloth(f: Frame, s: PathState, chars: string[]) {
  const { ctx, w, h, pal, t } = f;
  const fs = clamp(Math.min(w, h) * 0.05, 9, 15), lineH = fs * 1.9, step = fs * 0.66;
  ctx.font = `600 ${fs.toFixed(1)}px ${f.family}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const ax = s.inside ? s.px : w * (0.5 + 0.3 * Math.sin(t * 0.7)), ay = s.inside ? s.py : h * (0.5 + 0.2 * Math.cos(t * 0.9));
  const lift = (s.inside && s.down ? 1.6 : 1) * lineH * 1.5, sig = Math.min(w, h) * 0.2;
  const A = lineH * 0.5;
  const yAt = (x: number, y0: number, r: number) => {
    const bump = Math.exp(-(((x - ax) ** 2 + (y0 - ay) ** 2) / (sig * sig)));
    return y0 + A * Math.sin(x * 0.02 + t * 1.1 + r * 0.4) + A * 0.6 * Math.sin(x * 0.009 - t * 0.7 + r * 0.15) - bump * lift;
  };
  const rows = Math.ceil(h / lineH) + 2;
  for (let r = -1; r < rows; r++) {
    const y0 = r * lineH + lineH / 2;
    const count = Math.ceil(w / step) + 1;
    for (let i = 0; i < count; i++) {
      const x = i * step, y = yAt(x, y0, r), slope = (yAt(x + 2, y0, r) - y) / 2;
      const lit = clamp(0.5 - slope * 1.4, 0, 1);
      ctx.fillStyle = rgba(mix(pal.ink, pal.primary, lit), 0.28 + lit * 0.6);
      put(f, glyphAt(chars, i + r * 7), x, y, Math.atan(slope), 1, 0.85 + lit * 0.5);
    }
  }
  resetTransform(f);
}

export function drawRipple(f: Frame, s: PathState, chars: string[]) {
  const { ctx, w, h, pal, t } = f;
  const fs = clamp(Math.min(w, h) * 0.055, 9, 16), lineH = fs * 1.9, step = fs * 0.66;
  ctx.font = `600 ${fs.toFixed(1)}px ${f.family}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const src: Burst[] = s.bursts.filter((b) => t - b.t0 < 4.5);
  for (let k = Math.max(0, Math.floor(t / 2.4) - 1); k <= Math.floor(t / 2.4); k++) src.push({ t0: k * 2.4, x: ((k * 0.618) % 1) * w * 0.8 + w * 0.1, y: ((k * 0.382 + 0.3) % 1) * h * 0.7 + h * 0.15 });
  s.bursts = s.bursts.filter((b) => t - b.t0 < 4.5);
  const lam = Math.min(w, h) * 0.2, speed = Math.min(w, h) * 0.45;
  const rows = Math.ceil(h / lineH) + 1;
  for (let r = 0; r < rows; r++) {
    const y0 = r * lineH + lineH / 2;
    const count = Math.ceil(w / step) + 1;
    for (let i = 0; i < count; i++) {
      const x = i * step;
      let dy = 0, e = 0;
      for (const b of src) {
        const age = t - b.t0;
        if (age < 0) continue;
        const d = Math.hypot(x - b.x, y0 - b.y);
        const env = Math.exp(-(((d - age * speed) / (lam * 0.9)) ** 2)) * Math.exp(-age * 0.45);
        dy += env * Math.sin(((d - age * speed) / lam) * Math.PI * 2) * lineH * 0.9; e = Math.max(e, env);
      }
      ctx.fillStyle = e > 0.08 ? rgba(mix(pal.primary, pal.signal, clamp(e * 1.2 - 0.3, 0, 1)), 0.5 + e * 0.5) : rgba(pal.muted, 0.5);
      put(f, glyphAt(chars, i + r * 5), x, y0 + dy, 0, 1 + e * 0.5, 1 + e * 0.7);
    }
  }
  resetTransform(f);
}
export { smooth };
