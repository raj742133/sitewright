import { clamp, lerp, mix, rgba, smooth, type Frame } from './_text-c';
import { glyphAt, project, put, resetTransform, type PathState } from './_text-c-paths';

/* Ball (spiral text on a bouncing sphere) and Morph (text along a shape that flows into the next) for TextPathStudies. */

export function drawBall(f: Frame, s: PathState, chars: string[]) {
  const { ctx, w, h, pal } = f;
  const R = Math.min(w, h) * 0.26 * s.zoom, b = s.ball;
  const floor = h - R - 56, g = 1500;
  if (!b.init) { b.init = true; b.x = w / 2; b.y = f.still ? floor : h * 0.35; b.vx = 100; b.vy = 0; }
  if (!f.still && !s.dragging && f.dt > 0) {
    b.vy += g * f.dt; b.x += b.vx * f.dt; b.y += b.vy * f.dt;
    if (b.y > floor) { b.y = floor; if (b.vy > 60) b.squash = Math.min(0.28, b.vy / 4200); b.vy = -b.vy * 0.8; b.vx *= 0.98; b.rest = Math.abs(b.vy) < 90 ? b.rest + f.dt : 0; if (b.rest > 0.5) { b.vy = -Math.sqrt(2 * g * (h - 2 * R) * 0.5); b.rest = 0; } }
    if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx) * 0.9; } else if (b.x > w - R) { b.x = w - R; b.vx = -Math.abs(b.vx) * 0.9; }
    if (Math.abs(b.vx) < 40) b.vx = b.vx < 0 ? -90 : 90;
    b.spin += (b.vx / R) * f.dt; b.squash *= Math.pow(0.02, f.dt);
  }
  s.yaw = b.spin + 0.6;
  const air = clamp((floor - b.y) / Math.max(1, h * 0.6), 0, 1);
  ctx.fillStyle = rgba(pal.ink, 0.16 * (1 - air * 0.7)); ctx.beginPath(); ctx.ellipse(b.x, floor + R + 4, R * (0.95 - air * 0.35), R * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  const sq = b.squash, sx = 1 + sq, sy = 1 - sq;
  const cx = b.x, cy = b.y + (1 - sy) * R;
  const gr = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.05);
  gr.addColorStop(0, rgba(mix(pal.raised, pal.primary, 0.12), 1)); gr.addColorStop(1, rgba(mix(pal.surface, pal.primary, 0.3), 1));
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(cx, cy, R * sx, R * sy, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(pal.primary, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
  const n = Math.floor(R * 1.5), fs = clamp(R * 0.15, 8, 20);
  ctx.font = `700 ${fs.toFixed(1)}px ${f.family}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 0.8;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, lat = -Math.PI / 2 + Math.PI * u, lon = u * Math.PI * 2 * 7;
    const p = project(lat, lon, s.yaw, 0.45);
    const ch = glyphAt(chars, i), x = cx + p.x * R * sx, y = cy - p.y * R * sy;
    if (p.z < 0) { ctx.fillStyle = rgba(pal.ink, 0.1); put(f, ch, x, y, 0, 0.6, 0.6); continue; }
    ctx.fillStyle = rgba(mix(pal.ink, pal.primary, 0.5), 0.35 + p.z * 0.65);
    put(f, ch, x, y, Math.atan2(-p.ey, p.ex), Math.max(0.25, Math.sqrt(p.z)), 1);
    if (p.z > 0.6) { ctx.strokeStyle = rgba(pal.signal, 0.6); ctx.strokeText(ch, 0, 0); }
  }
  resetTransform(f);
}

type Pt = [number, number];
const SHAPES: ((u: number, w: number, h: number) => Pt)[] = [
  (u, w, h) => [lerp(w * 0.08, w * 0.92, u), h / 2],
  (u, w, h) => [lerp(w * 0.08, w * 0.92, u), h / 2 + Math.sin(u * Math.PI * 4) * h * 0.2],
  (u, w, h) => { const a = u * Math.PI * 6, r = lerp(0.04, 0.4, u) * Math.min(w, h); return [w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r]; },
  (u, w, h) => { const a = u * Math.PI * 2, d = 1 + Math.sin(a) ** 2; return [w / 2 + (Math.cos(a) / d) * w * 0.4, h / 2 + ((Math.sin(a) * Math.cos(a)) / d) * h * 0.8]; },
  (u, w, h) => { const a = u * Math.PI * 2 - Math.PI / 2; return [w / 2 + Math.cos(a) * Math.min(w, h) * 0.38, h / 2 + Math.sin(a) * Math.min(w, h) * 0.38]; },
];
export const MORPH_SHAPES = SHAPES.length;

export function drawMorph(f: Frame, s: PathState, chars: string[]) {
  const { ctx, w, h, pal } = f;
  if (!f.still && f.dt > 0) {
    if (s.mK < 1) s.mK = Math.min(1, s.mK + f.dt / 1.8); else s.mHold += f.dt;
    if (s.advance || s.mHold > 2.2) { s.advance = false; s.mA = s.mB; s.mB = (s.mB + 1) % SHAPES.length; s.mK = 0; s.mHold = 0; }
  }
  const at = (u: number): Pt => {
    const k = smooth(clamp(s.mK * 1.7 - u * 0.7, 0, 1));
    const a = SHAPES[s.mA]!(u, w, h), b = SHAPES[s.mB]!(u, w, h);
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  };
  const n = Math.round(clamp(Math.min(w, h) * 0.38, 60, 130)), fs = clamp(Math.min(w, h) * 0.075, 11, 24);
  ctx.font = `700 ${fs.toFixed(1)}px ${f.family}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), p = at(u), q = at(Math.min(1, u + 0.004)), q0 = at(Math.max(0, u - 0.004));
    const near = s.inside ? Math.exp(-(((p[0] - s.px) ** 2 + (p[1] - s.py) ** 2) / (Math.min(w, h) * 0.2) ** 2)) : 0;
    ctx.fillStyle = rgba(mix(mix(pal.primary, pal.ink, 0.35), pal.signal, clamp(u + near * 0.5 - 0.3, 0, 1) * 0.8), 0.9);
    put(f, glyphAt(chars, i), p[0], p[1], Math.atan2(q[1] - q0[1], q[0] - q0[0]), 1 + near * 0.8, 1 + near * 0.8);
  }
  resetTransform(f);
}
