import { clamp, css, layer, mixc, scale, WHITE, type Env, type RGB } from './_tu-three-kit';

/* Woven cloth: a verlet-integrated hanging sheet, a procedurally woven + printed texture, and an affine textured-triangle mesh renderer. */

export type Weave = 'plain' | 'twill' | 'basket';
export const WEAVES: Weave[] = ['plain', 'twill', 'basket'];
export interface Cloth { C: number; R: number; x: Float32Array; y: Float32Array; z: Float32Array; px: Float32Array; py: Float32Array; pz: Float32Array; rw: number; rh: number; left: number; top: number; cw: number; ch: number }
export function makeCloth(w: number, h: number): Cloth {
  const ch = h * 0.7, cw = Math.min(w * 0.86, ch * 1.6), left = (w - cw) / 2, top = h * 0.13, C = 28, R = 17, n = (C + 1) * (R + 1);
  const cl: Cloth = { C, R, x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n), px: new Float32Array(n), py: new Float32Array(n), pz: new Float32Array(n), rw: cw / C, rh: ch / R, left, top, cw, ch };
  for (let j = 0; j <= R; j++) for (let i = 0; i <= C; i++) { const k = j * (C + 1) + i; cl.x[k] = cl.px[k] = left + i * cl.rw; cl.y[k] = cl.py[k] = top + j * cl.rh; }
  return cl;
}
export interface Ptr { x: number; y: number; vx: number; vy: number; on: boolean }
/** One fixed step (dt in seconds). Gravity, a travelling wind, the pointer dent/drag, then distance constraints with the top row pinned. */
export function stepCloth(cl: Cloth, t: number, dt: number, ptr: Ptr, wind: number, rad: number) {
  const { C, R, x, y, z, px, py, pz } = cl, n = (C + 1) * (R + 1), g = 360, dt2 = dt * dt;
  for (let k = 0; k < n; k++) {
    const j = Math.floor(k / (C + 1));
    if (j === 0) continue;
    const vx = (x[k]! - px[k]!) * 0.985, vy = (y[k]! - py[k]!) * 0.985, vz = (z[k]! - pz[k]!) * 0.95;
    px[k] = x[k]!; py[k] = y[k]!; pz[k] = z[k]!;
    const lev = j / R, wx = x[k]! * 0.008, wy = y[k]! * 0.011;
    const az = wind * 420 * (0.55 * Math.sin(wx * 1.3 + t * 1.25 + wy) + 0.35 * Math.sin(wy * 1.7 - t * 0.8 + wx * 2) + 0.28) * lev;
    x[k] = x[k]! + vx + Math.sin(t * 0.7 + wy) * wind * 120 * lev * dt2; y[k] = y[k]! + vy + g * dt2; z[k] = z[k]! + vz + az * dt2;
    if (ptr.on) {
      const dx = x[k]! - ptr.x, dy = y[k]! - ptr.y, f = Math.exp(-(dx * dx + dy * dy) / (rad * rad));
      if (f > 0.01) { z[k] = z[k]! + (-70 * f - z[k]!) * 0.1 * f; x[k] = x[k]! + ptr.vx * dt * f * 0.55; y[k] = y[k]! + ptr.vy * dt * f * 0.35; }
    }
  }
  const solve = (a: number, b: number, rest: number, k: number) => {
    const dx = x[b]! - x[a]!, dy = y[b]! - y[a]!, dz = z[b]! - z[a]!, d = Math.hypot(dx, dy, dz) || 1e-4, diff = ((d - rest) / d) * k;
    const pinA = a <= C, pinB = b <= C;
    if (pinA && pinB) return;
    const pa = pinA ? 0 : pinB ? 1 : 0.5, pb = pinB ? 0 : pinA ? 1 : 0.5;
    x[a] = x[a]! + dx * diff * pa; y[a] = y[a]! + dy * diff * pa; z[a] = z[a]! + dz * diff * pa;
    x[b] = x[b]! - dx * diff * pb; y[b] = y[b]! - dy * diff * pb; z[b] = z[b]! - dz * diff * pb;
  };
  for (let it = 0; it < 8; it++) {
    const dir = it % 2 ? -1 : 1;
    for (let jj = 0; jj <= R; jj++) for (let ii = 0; ii <= C; ii++) {
      const j = it % 2 ? jj : R - jj, i = dir > 0 ? ii : C - ii, k = j * (C + 1) + i;
      if (i < C) solve(k, k + 1, cl.rw, 1);
      if (j < R) solve(k, k + C + 1, cl.rh, 1);
      if (i < C - 1 && it < 4) solve(k, k + 2, cl.rw * 2, 0.2);
      if (j < R - 1 && it < 4) solve(k, k + 2 * (C + 1), cl.rh * 2, 0.2);
    }
  }
}

export interface Fabric { warp: RGB; weft: RGB; accent: RGB; ink: RGB }
export function fabricTones(env: Env): Fabric {
  const p = env.pal;
  return { warp: mixc(p.primary, [0.05, 0.05, 0.08], 0.28), weft: mixc(p.primary, WHITE, 0.2), accent: mixc(p.signal, [0.1, 0.1, 0.12], 0.1), ink: mixc(p.surface, WHITE, 0.82) };
}
/** The cloth texture: woven threads in the chosen pattern, border bands, and printed text with the weave still showing through. */
export function weaveTexture(cw: number, ch: number, scaleK: number, F: Fabric, weave: Weave, text: string, font: string): HTMLCanvasElement {
  const tw = Math.round(cw * scaleK), th = Math.round(ch * scaleK), tp = Math.max(3, Math.round(cw * scaleK / 96));
  return layer(tw, th, 1, (c) => {
    const nx = Math.ceil(tw / tp), ny = Math.ceil(th / tp);
    for (let j = 0; j < ny; j++) {
      const yy = j * tp, band = yy < th * 0.07 || (yy > th * 0.9 && yy < th * 0.93);
      for (let i = 0; i < nx; i++) {
        const over = weave === 'plain' ? (i + j) % 2 === 0 : weave === 'twill' ? (i + j) % 4 < 2 : (Math.floor(i / 2) + Math.floor(j / 2)) % 2 === 0;
        const base = band ? F.accent : over ? F.warp : F.weft, xx = i * tp;
        c.fillStyle = css(over ? scale(base, 0.9) : base); c.fillRect(xx, yy, tp, tp);
        c.fillStyle = css(over ? [1, 1, 1] : [0, 0, 0], 0.14); if (over) c.fillRect(xx + tp * 0.28, yy, tp * 0.2, tp); else c.fillRect(xx, yy + tp * 0.28, tp, tp * 0.2);
      }
    }
    const lines = text.split('\n'), size = clamp(Math.min(th * 0.3, (tw / Math.max(...lines.map((l) => l.length), 4)) * 1.5), 10, 200);
    c.font = `800 ${size}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = css(F.ink, 0.94);
    lines.forEach((l, k) => c.fillText(l, tw / 2, th * 0.5 + (k - (lines.length - 1) / 2) * size * 1.12));
    c.fillStyle = css(F.ink, 0.9); c.fillRect(tw * 0.35, th * 0.5 + (lines.length / 2) * size * 1.12 + tp, tw * 0.3, tp * 0.7);
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i <= nx; i++) { c.moveTo(i * tp + 0.5, 0); c.lineTo(i * tp + 0.5, th); }
    for (let j = 0; j <= ny; j++) { c.moveTo(0, j * tp + 0.5); c.lineTo(tw, j * tp + 0.5); }
    c.stroke();
  });
}

/** Draws the cloth as textured triangles (affine per triangle) with a normal-based light/shade overlay. `dpr` is the canvas scale already applied by the host. */
export function drawCloth(c: CanvasRenderingContext2D, cl: Cloth, tex: HTMLCanvasElement, scaleK: number, w: number, h: number, dpr: number, hot: [number, number] | null) {
  const { C, R, x, y, z } = cl, D = Math.max(w, h) * 1.1, cx = w / 2, cy = h * 0.42, n = (C + 1) * (R + 1);
  const sx = new Float32Array(n), sy = new Float32Array(n);
  for (let k = 0; k < n; k++) { const q = D / (D - z[k]!); sx[k] = cx + (x[k]! - cx) * q; sy[k] = cy + (y[k]! - cy) * q; }
  c.save(); c.shadowColor = 'rgba(0,0,0,0.38)'; c.shadowBlur = 22; c.shadowOffsetX = 10; c.shadowOffsetY = 16; c.fillStyle = '#000'; c.beginPath();
  for (let i = 0; i <= C; i++) i ? c.lineTo(sx[i]!, sy[i]!) : c.moveTo(sx[i]!, sy[i]!);
  for (let j = 1; j <= R; j++) c.lineTo(sx[j * (C + 1) + C]!, sy[j * (C + 1) + C]!);
  for (let i = C - 1; i >= 0; i--) c.lineTo(sx[R * (C + 1) + i]!, sy[R * (C + 1) + i]!);
  for (let j = R - 1; j > 0; j--) c.lineTo(sx[j * (C + 1)]!, sy[j * (C + 1)]!);
  c.closePath(); c.fill(); c.restore();
  const tri = (a: number, b: number, d: number, u0: number, v0: number, u1: number, v1: number, u2: number, v2: number) => {
    const x0 = sx[a]!, y0 = sy[a]!, x1 = sx[b]!, y1 = sy[b]!, x2 = sx[d]!, y2 = sy[d]!, mx = (x0 + x1 + x2) / 3, my = (y0 + y1 + y2) / 3, e = (px: number, m: number) => px + Math.sign(px - m) * 0.6;
    const den = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
    if (Math.abs(den) < 1e-6) return;
    const A = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / den, Cc = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / den, E = x0 - A * u0 - Cc * v0;
    const B = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / den, Dd = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / den, Fv = y0 - B * u0 - Dd * v0;
    c.save(); c.beginPath(); c.moveTo(e(x0, mx), e(y0, my)); c.lineTo(e(x1, mx), e(y1, my)); c.lineTo(e(x2, mx), e(y2, my)); c.closePath(); c.clip();
    c.setTransform(dpr * A, dpr * B, dpr * Cc, dpr * Dd, dpr * E, dpr * Fv); c.drawImage(tex, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ax = x1 - x0, ay = y1 - y0, az = z[b]! - z[a]!, bx = x2 - x0, by = y2 - y0, bz = z[d]! - z[a]!;
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const s = Math.abs(nx * -0.35 + ny * -0.5 + nz * 0.8) * (nz < 0 ? -1 : 1), a2 = s < 0.62 ? (0.62 - s) * 0.9 : 0, a3 = s > 0.78 ? (s - 0.78) * 0.7 : 0;
    if (a2 > 0.01) { c.fillStyle = `rgba(6,6,16,${Math.min(0.6, a2)})`; c.fill(); } else if (a3 > 0.01) { c.fillStyle = `rgba(255,255,255,${Math.min(0.3, a3)})`; c.fill(); }
    if (hot) { const d = Math.hypot(mx - hot[0], my - hot[1]); if (d < 40) { c.fillStyle = `rgba(255,255,255,${0.12 * (1 - d / 40)})`; c.fill(); } }
    c.restore();
  };
  const ku = tex.width / C, kv = tex.height / R;
  for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) {
    const a = j * (C + 1) + i, b = a + 1, d = a + C + 1, e = d + 1, u = i * ku, v = j * kv;
    tri(a, b, d, u, v, u + ku, v, u, v + kv); tri(b, e, d, u + ku, v, u + ku, v + kv, u, v + kv);
  }
  // rod
  const rl = sx[0]! - 14, rr = sx[C]! + 14, ry = sy[0]! - 7, g = c.createLinearGradient(0, ry - 5, 0, ry + 5);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.45, 'rgba(120,120,130,1)'); g.addColorStop(1, 'rgba(30,30,38,1)');
  c.fillStyle = g; c.beginPath(); c.roundRect(rl, ry - 5, rr - rl, 10, 5); c.fill();
  c.fillStyle = 'rgba(30,30,38,1)'; for (const kx of [rl, rr]) { c.beginPath(); c.arc(kx, ry, 6, 0, 6.3); c.fill(); }
}
