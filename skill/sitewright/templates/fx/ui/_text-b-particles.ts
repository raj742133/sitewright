import { seeded } from './_text-b';

/* Canvas2D particle field used by ParticleText: samples a line of text into target points and runs a spring + repel simulation. */

export interface Field {
  n: number;
  x: Float32Array; y: Float32Array; vx: Float32Array; vy: Float32Array;
  tx: Float32Array; ty: Float32Array;
  /** colour bucket 0..2 */
  c: Uint8Array;
  size: number;
}

export interface Pointer { x: number; y: number; active: boolean }

/** Sample text into dot positions (CSS px) that fit a w x h box. Returns an empty list when no 2D canvas exists. */
export function sampleText(text: string, w: number, h: number, family: string, weight: number, maxN: number): { pts: Float32Array; step: number; fs: number } {
  const empty = { pts: new Float32Array(0), step: 3, fs: 40 };
  if (w < 8 || h < 8 || !text.trim()) return empty;
  const oc = document.createElement('canvas');
  oc.width = Math.ceil(w);
  oc.height = Math.ceil(h);
  const ctx = oc.getContext('2d', { willReadFrequently: true });
  if (!ctx) return empty;
  ctx.font = `${weight} 100px ${family}`;
  const mw = Math.max(1, ctx.measureText(text).width);
  const fs = Math.max(10, Math.min((w * 0.92 * 100) / mw, h * 0.7));
  ctx.font = `${weight} ${fs}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(text, w / 2, h / 2 + fs * 0.04);
  let data: Uint8ClampedArray;
  try { data = ctx.getImageData(0, 0, oc.width, oc.height).data; } catch { return empty; }
  let step = Math.max(2, Math.round(fs / 30));
  for (let tries = 0; tries < 8; tries++) {
    const out: number[] = [];
    for (let y = step / 2; y < oc.height; y += step) {
      for (let x = step / 2; x < oc.width; x += step) {
        const a = data[((y | 0) * oc.width + (x | 0)) * 4 + 3] ?? 0;
        if (a > 128) out.push(x, y);
      }
    }
    if (out.length / 2 <= maxN || tries === 7) return { pts: Float32Array.from(out), step, fs };
    step += 1;
  }
  return empty;
}

/** Build (or retarget) a field. Existing particles keep their positions so a resize does not jump. */
export function makeField(pts: Float32Array, step: number, w: number, h: number, prev: Field | null, settled: boolean): Field {
  const n = pts.length / 2;
  const rnd = seeded(7 + n);
  const f: Field = { n, x: new Float32Array(n), y: new Float32Array(n), vx: new Float32Array(n), vy: new Float32Array(n), tx: new Float32Array(n), ty: new Float32Array(n), c: new Uint8Array(n), size: Math.max(1.6, step * 0.78) };
  for (let i = 0; i < n; i++) {
    f.tx[i] = pts[i * 2] ?? 0;
    f.ty[i] = pts[i * 2 + 1] ?? 0;
    const r = rnd();
    f.c[i] = r < 0.6 ? 0 : r < 0.88 ? 1 : 2;
    if (prev && i < prev.n) { f.x[i] = prev.x[i] ?? 0; f.y[i] = prev.y[i] ?? 0; f.vx[i] = prev.vx[i] ?? 0; f.vy[i] = prev.vy[i] ?? 0; }
    else if (settled) { f.x[i] = f.tx[i] ?? 0; f.y[i] = f.ty[i] ?? 0; }
    else { const a = rnd() * Math.PI * 2; const d = (0.3 + rnd() * 0.7) * Math.max(w, h) * 0.6; f.x[i] = w / 2 + Math.cos(a) * d; f.y[i] = h / 2 + Math.sin(a) * d * 0.6; }
  }
  return f;
}

/** Push every particle away from (x, y) and give it a random kick. */
export function burst(f: Field, x: number, y: number, power: number) {
  for (let i = 0; i < f.n; i++) {
    const dx = (f.x[i] ?? 0) - x, dy = (f.y[i] ?? 0) - y;
    const d = Math.sqrt(dx * dx + dy * dy) + 1;
    const k = (power * (0.4 + Math.random())) / (1 + d / 80);
    f.vx[i] = (f.vx[i] ?? 0) + (dx / d) * k + (Math.random() - 0.5) * power * 0.5;
    f.vy[i] = (f.vy[i] ?? 0) + (dy / d) * k + (Math.random() - 0.5) * power * 0.5;
  }
}

/** One physics step (dt in seconds, normalised to 60fps). Returns a rough energy value; ~0 means everything is at rest. */
export function stepField(f: Field, dt: number, p: Pointer, radius: number, push: number): number {
  const k = 1 - Math.pow(1 - 0.085, dt * 60);
  const damp = Math.pow(0.84, dt * 60);
  const r2 = radius * radius;
  let energy = 0;
  for (let i = 0; i < f.n; i++) {
    let x = f.x[i] ?? 0, y = f.y[i] ?? 0, vx = f.vx[i] ?? 0, vy = f.vy[i] ?? 0;
    const ex = (f.tx[i] ?? 0) - x, ey = (f.ty[i] ?? 0) - y;
    vx += ex * k; vy += ey * k;
    if (p.active) {
      const dx = x - p.x, dy = y - p.y, d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > 0.01) { const d = Math.sqrt(d2); const s = (1 - d / radius) * push * dt * 60; vx += (dx / d) * s; vy += (dy / d) * s; }
    }
    vx *= damp; vy *= damp;
    x += vx; y += vy;
    f.x[i] = x; f.y[i] = y; f.vx[i] = vx; f.vy[i] = vy;
    energy += Math.abs(vx) + Math.abs(vy) + Math.abs(ex) * 0.2 + Math.abs(ey) * 0.2;
  }
  return f.n ? energy / f.n : 0;
}
