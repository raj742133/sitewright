import type { Frame, Painter } from './_bg-c-canvas';
import { rng } from './_bg-c-canvas';
import { mix, rgba, type RGB } from './_t2';
import { accent, accent2 } from './_tu-bg-kit';

/** Water: a damped wave-equation height field at low resolution, lit by its slope. Rain and the pointer make rings. */
export function water(f0: Frame): Painter {
  const R = rng(7);
  let gw = 1, gh = 1, cur = new Float32Array(1), prev = new Float32Array(1);
  let off: HTMLCanvasElement | null = null, octx: CanvasRenderingContext2D | null = null, img: ImageData | null = null;
  let acc = 0, rain = 0, lx = -1, ly = -1;
  const build = (f: Frame) => {
    const cell = Math.max(3, Math.round(Math.sqrt((f.w * f.h) / 26000)));
    gw = Math.max(16, Math.round(f.w / cell)); gh = Math.max(12, Math.round(f.h / cell));
    cur = new Float32Array(gw * gh); prev = new Float32Array(gw * gh);
    off = document.createElement('canvas'); off.width = gw; off.height = gh;
    octx = off.getContext('2d'); img = octx ? octx.createImageData(gw, gh) : null;
  };
  const drop = (gx: number, gy: number, s: number) => {
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
      const x = Math.round(gx) + i, y = Math.round(gy) + j;
      if (x > 0 && y > 0 && x < gw - 1 && y < gh - 1) cur[y * gw + x] = (cur[y * gw + x] ?? 0) + s * (1 - Math.hypot(i, j) / 3);
    }
  };
  build(f0);
  return {
    resize: build,
    draw(f) {
      if (!off || !octx || !img) return;
      const A = accent(f), B = accent2(f);
      rain -= f.dt;
      if (rain <= 0) { drop(R() * gw, R() * gh, 5 + R() * 4); rain = 0.25 + R() * 0.7; }
      for (const t of f.ptr.taps) drop((t.x / f.w) * gw, (t.y / f.h) * gh, 14);
      if (f.ptr.inside) {
        const gx = (f.ptr.x / f.w) * gw, gy = (f.ptr.y / f.h) * gh;
        if (Math.hypot(gx - lx, gy - ly) > 1.2) { drop(gx, gy, 3.2); lx = gx; ly = gy; }
      }
      acc += f.dt;
      let steps = 0;
      while (acc > 1 / 60 && steps < 3) {
        acc -= 1 / 60; steps++;
        for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
          const k = y * gw + x;
          const v = ((cur[k - 1]! + cur[k + 1]! + cur[k - gw]! + cur[k + gw]!) * 0.5 - prev[k]!) * 0.985;
          prev[k] = v;
        }
        const s = cur; cur = prev; prev = s;
      }
      if (acc > 1 / 60) acc = 0;
      const d = img.data, lightC: RGB = f.dark ? mix(B, [255, 255, 255], 0.55) : mix(B, [255, 255, 255], 0.2), shadeC: RGB = f.dark ? mix(A, f.pal.ink, 0.2) : mix(A, f.pal.ink, 0.45);
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
        const k = y * gw + x, o = k * 4;
        const dx = x > 0 && x < gw - 1 ? cur[k + 1]! - cur[k - 1]! : 0, dy = y > 0 && y < gh - 1 ? cur[k + gw]! - cur[k - gw]! : 0;
        const s = (dx + dy) * 0.5, m = Math.min(1, Math.abs(s) * 0.35);
        const c = s > 0 ? lightC : shadeC;
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
        const base = 22 + 18 * Math.sin(x * 0.18 + y * 0.11 + f.t * 0.5) * Math.sin(y * 0.14 - f.t * 0.3);
        d[o + 3] = Math.min(255, base * (f.dark ? 1 : 0.9) + m * 230);
        if (s <= 0 && base > 0) { d[o] = A[0]; d[o + 1] = A[1]; d[o + 2] = A[2]; if (m > 0.05) { d[o] = shadeC[0]; d[o + 1] = shadeC[1]; d[o + 2] = shadeC[2]; } }
      }
      octx.putImageData(img, 0, 0);
      f.ctx.imageSmoothingEnabled = true; f.ctx.imageSmoothingQuality = 'high';
      f.ctx.drawImage(off, 0, 0, f.w, f.h);
    },
  };
}

interface Seg { x1: number; y1: number; x2: number; y2: number; w: number }
interface Bolt { segs: Seg[]; age: number; life: number }
function makeBolt(R: () => number, x1: number, y1: number, x2: number, y2: number, depth = 0, segs: Seg[] = [], w = 1): Seg[] {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  if (len < 9) { segs.push({ x1, y1, x2, y2, w }); return segs; }
  const nx = -dy / len, ny = dx / len, off = (R() - 0.5) * len * 0.42;
  const mx = (x1 + x2) / 2 + nx * off, my = (y1 + y2) / 2 + ny * off;
  makeBolt(R, x1, y1, mx, my, depth, segs, w); makeBolt(R, mx, my, x2, y2, depth, segs, w);
  if (depth < 2 && len > 40 && R() < 0.2) {
    const a = Math.atan2(dy, dx) + (R() - 0.5) * 1.3, l = len * (0.5 + R() * 0.7);
    makeBolt(R, mx, my, mx + Math.cos(a) * l, my + Math.sin(a) * l, depth + 1, segs, w * 0.55);
  }
  return segs;
}
/** Lightning: recursive midpoint-displaced bolts with branches, drawn in three passes with a sky flash. Click or tap strikes there. */
export function lightning(f0: Frame): Painter {
  const R = rng(13);
  let bolts: Bolt[] = [], next = 1, flash = 0, seeded = false;
  void f0;
  const strike = (f: Frame, tx?: number, ty?: number) => {
    const x1 = tx !== undefined ? tx + (R() - 0.5) * f.w * 0.3 : f.w * (0.15 + R() * 0.7);
    bolts.push({ segs: makeBolt(R, x1, -10, tx ?? x1 + (R() - 0.5) * f.w * 0.25, ty ?? f.h * (0.65 + R() * 0.3)), age: 0, life: 0.75 });
    flash = 1;
  };
  return {
    resize() { seeded = false; bolts = []; },
    draw(f) {
      const A = accent(f), B = accent2(f);
      if (f.reduced) { if (!seeded) { seeded = true; strike(f); const b = bolts[0]!; b.age = 0.12; flash = 0.35; } }
      else {
        next -= f.dt;
        if (next <= 0) { strike(f, f.ptr.inside && R() < 0.5 ? f.ptr.x : undefined, f.ptr.inside && R() < 0.5 ? f.ptr.y : undefined); next = 1.8 + R() * 2.6; }
        for (const t of f.ptr.taps) strike(f, t.x, t.y);
        for (const b of bolts) b.age += f.dt;
        bolts = bolts.filter((b) => b.age < b.life);
        flash = Math.max(0, flash - f.dt * 2.6);
      }
      const c = f.ctx;
      if (flash > 0.01) { c.fillStyle = rgba(A, flash * (f.dark ? 0.3 : 0.22)); c.fillRect(0, 0, f.w, f.h); }
      const core: RGB = f.dark ? [255, 255, 255] : mix(B, [255, 255, 255], 0.4);
      c.lineCap = 'round';
      for (const b of bolts) {
        const k = 1 - b.age / b.life, flick = b.age < 0.18 ? 1 : 0.55 + 0.45 * Math.sin(b.age * 70);
        const a = Math.max(0, k * (b.age < 0.1 ? 1 : flick));
        for (const [lw, col, al] of [[9, A, 0.14], [4, B, 0.4], [1.4, core, 1]] as [number, RGB, number][]) {
          c.strokeStyle = rgba(col, al * a); c.beginPath();
          for (const s of b.segs) { c.lineWidth = lw * s.w; c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); }
          c.stroke();
        }
      }
      if (!bolts.length) { c.fillStyle = rgba(A, 0.04); c.fillRect(0, 0, f.w, f.h); }
    },
  };
}
