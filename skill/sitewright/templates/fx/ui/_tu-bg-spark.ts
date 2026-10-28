import type { Frame, Painter } from './_bg-c-canvas';
import { rng } from './_bg-c-canvas';
import { mix, rgba } from './_t2';
import { accent, accent2, fbm2, smooth } from './_tu-bg-kit';

const BW = 320, BH = 200;

export interface BadgeText { org: string; name: string; role: string }

/** Rasterise a generic credential badge (frame, emblem, three text lines) to an alpha mask. */
function raster(txt: BadgeText, scale: number) {
  const cv = document.createElement('canvas');
  cv.width = Math.round(BW * scale); cv.height = Math.round(BH * scale);
  const c = cv.getContext('2d', { willReadFrequently: true });
  if (!c) return null;
  c.scale(scale, scale);
  c.fillStyle = '#000'; c.strokeStyle = '#000'; c.lineWidth = 5;
  c.beginPath(); c.roundRect(4, 4, BW - 8, BH - 8, 22); c.stroke();
  c.lineWidth = 2.5; c.beginPath(); c.roundRect(12, 12, BW - 24, BH - 24, 15); c.stroke();
  /* emblem: a four-point spark inside a ring */
  const ex = 62, ey = 70;
  c.lineWidth = 4; c.beginPath(); c.arc(ex, ey, 30, 0, 6.2832); c.stroke();
  c.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.2832 - 1.5708, r = i % 2 ? 7 : 22; c.lineTo(ex + Math.cos(a) * r, ey + Math.sin(a) * r); }
  c.closePath(); c.fill();
  c.textBaseline = 'alphabetic';
  c.font = '800 14px system-ui, sans-serif'; c.fillText(txt.org.toUpperCase(), 108, 58);
  c.font = '900 29px system-ui, sans-serif'; c.fillText(txt.name, 108, 92, 195);
  c.fillRect(108, 103, 60, 4);
  c.font = '800 13px ui-monospace, monospace'; c.fillText(txt.role.toUpperCase(), 108, 124);
  c.font = '700 11px ui-monospace, monospace';
  for (let i = 0; i < 26; i++) c.fillRect(34 + i * 10.4 + (i % 3), 156, 3 + (i * 7) % 4, 18);
  return c.getImageData(0, 0, cv.width, cv.height);
}

interface Part { hx: number; hy: number; x: number; y: number; vx: number; vy: number; u: number; v: number; hot: number }
interface Ember { x: number; y: number; vx: number; vy: number; life: number; max: number; hot: number }

export function sparkBadge(f0: Frame, txt: BadgeText, intensity: number): Painter {
  const R = rng(61);
  let parts: Part[] = [], embers: Ember[] = [], ox = 0, oy = 0, sc = 1, cd = 0;
  const build = (f: Frame) => {
    sc = Math.min(f.w * 0.86 / BW, f.h * 0.78 / BH, 1.6);
    ox = (f.w - BW * sc) / 2; oy = (f.h - BH * sc) / 2;
    const img = raster(txt, sc);
    parts = []; embers = [];
    if (!img) return;
    let step = 2;
    for (;;) {
      let n = 0;
      for (let y = 0; y < img.height; y += step) for (let x = 0; x < img.width; x += step) if (img.data[(y * img.width + x) * 4 + 3]! > 120) n++;
      if (n <= 3800 || step >= 6) break;
      step++;
    }
    for (let y = 0; y < img.height; y += step) for (let x = 0; x < img.width; x += step) {
      if (img.data[(y * img.width + x) * 4 + 3]! > 120) {
        const hx = ox + (x / img.width) * BW * sc, hy = oy + (y / img.height) * BH * sc;
        parts.push({ hx, hy, x: hx + (R() - 0.5) * 8, y: hy + (R() - 0.5) * 8, vx: 0, vy: 0, u: x / img.width, v: y / img.height, hot: 0 });
      }
    }
    cd = 0;
  };
  build(f0);
  const burst = (x: number, y: number, str: number) => {
    for (const p of parts) {
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) + 1;
      if (d < 150) { const k = (1 - d / 150) * str; p.vx += (dx / d) * k; p.vy += (dy / d) * k; p.hot = 1; }
    }
  };
  return {
    resize: build,
    draw(f) {
      const A = accent(f), B = accent2(f), c = f.ctx, dt = Math.min(f.dt, 0.04);
      for (const t of f.ptr.taps) burst(t.x, t.y, 520);
      /* idle: an occasional sweep of light + a gentle shove so touch screens have motion too */
      const sweep = (f.t * 0.22) % 1.6, sweepX = ox + (sweep - 0.3) * BW * sc * 1.2;
      const mx = f.ptr.inside ? f.ptr.x : -9999, my = f.ptr.inside ? f.ptr.y : -9999;
      for (const p of parts) {
        let fx = (p.hx - p.x) * 70, fy = (p.hy - p.y) * 70;
        const n = fbm2(p.hx * 0.02 + f.t * 0.35, p.hy * 0.02 - f.t * 0.2) * 6.2832 * 2;
        fx += Math.cos(n) * 26; fy += Math.sin(n) * 26;
        const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
        if (d < 90 && d > 0.5) { const k = (1 - d / 90) * 2800; fx += (dx / d) * k; fy += (dy / d) * k; p.hot = Math.max(p.hot, 0.8); }
        p.vx = (p.vx + fx * dt) * Math.exp(-dt * 7); p.vy = (p.vy + fy * dt) * Math.exp(-dt * 7);
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.hot = Math.max(0, p.hot - dt * 1.2);
        const band = Math.exp(-((p.hx - sweepX) ** 2) / (2 * 22 * 22));
        const col = mix(mix(A, B, smooth(0.3, 0.9, p.u)), B, Math.max(p.hot, band));
        c.fillStyle = rgba(col, Math.min(1, 0.78 + p.hot * 0.3 + band * 0.3));
        const s = 1.7 + p.hot * 1.2 + band * 0.8;
        c.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        if (!f.reduced && parts.length && R() < 0.00018 * intensity * (1 + band * 12)) embers.push({ x: p.x, y: p.y, vx: (R() - 0.5) * 20, vy: -20 - R() * 30, life: 0, max: 1.4 + R() * 1.8, hot: R() });
      }
      if (f.reduced && embers.length === 0 && parts.length) for (let i = 0; i < 26 * intensity; i++) { const p = parts[Math.floor(R() * parts.length)]!; embers.push({ x: p.hx + (R() - 0.5) * 14, y: p.hy - R() * 40, vx: 0, vy: 0, life: R() * 1.2, max: 2.4, hot: R() }); }
      if (!f.reduced) {
        cd -= dt;
        if (cd <= 0 && f.t > 4 && !f.ptr.inside && parts.length) { const p = parts[Math.floor(R() * parts.length)]!; burst(p.x, p.y, 160); cd = 5 + R() * 3; }
      }
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]!;
        if (!f.reduced) {
          e.life += dt;
          const a = fbm2(e.x * 0.012, e.y * 0.012 + f.t * 0.3) * 12.566;
          e.vx += Math.cos(a) * 90 * dt; e.vy += (Math.sin(a) * 60 - 28) * dt;
          e.vx *= Math.exp(-dt * 1.6); e.vy *= Math.exp(-dt * 1.2);
          e.x += e.vx * dt; e.y += e.vy * dt;
        }
        if (e.life >= e.max) { embers.splice(i, 1); continue; }
        const k = 1 - e.life / e.max;
        c.fillStyle = rgba(e.hot > 0.5 ? B : A, k * 0.95);
        c.beginPath(); c.arc(e.x, e.y, 0.8 + k * 1.5, 0, 6.2832); c.fill();
      }
    },
  };
}
