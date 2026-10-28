import type { Frame, Painter } from './_bg-c-canvas';
import { rng } from './_bg-c-canvas';
import { mix, rgba, type RGB } from './_t2';
import { accent, accent2 } from './_tu-bg-kit';

/** Fire: a classic heat-diffusion grid (cells rise, cool and sway), mapped through a token palette, plus drifting embers. */
export function fire(f0: Frame): Painter {
  const R = rng(19);
  let gw = 1, gh = 1, heat = new Float32Array(1);
  let off: HTMLCanvasElement | null = null, octx: CanvasRenderingContext2D | null = null, img: ImageData | null = null;
  let acc = 0;
  let embers: { x: number; y: number; vx: number; vy: number; life: number; max: number }[] = [];
  const build = (f: Frame) => {
    const cell = Math.max(4, Math.round(Math.sqrt((f.w * f.h) / 14000)));
    gw = Math.max(24, Math.round(f.w / cell)); gh = Math.max(16, Math.round(f.h / cell));
    heat = new Float32Array(gw * gh);
    off = document.createElement('canvas'); off.width = gw; off.height = gh;
    octx = off.getContext('2d'); img = octx ? octx.createImageData(gw, gh) : null;
    embers = [];
  };
  build(f0);
  return {
    resize: build,
    draw(f) {
      if (!off || !octx || !img) return;
      const A = accent(f), B = accent2(f);
      acc += f.dt;
      let n = 0;
      while (acc > 1 / 30 && n < 3) {
        acc -= 1 / 30; n++;
        const px = f.ptr.inside ? (f.ptr.x / f.w) * gw : -99, py = f.ptr.inside ? (f.ptr.y / f.h) * gh : -99;
        for (let x = 0; x < gw; x++) {
          const bump = 0.55 + 0.45 * Math.sin(x * 0.35 + f.t * 2.1) * Math.sin(x * 0.11 - f.t * 0.7);
          heat[(gh - 1) * gw + x] = Math.min(1, (0.55 + R() * 0.55) * bump + 0.15);
        }
        for (let y = 0; y < gh - 1; y++) for (let x = 0; x < gw; x++) {
          const sway = Math.round(Math.sin(f.t * 1.3 + y * 0.18 + x * 0.05) * 0.9 + (R() - 0.5) * 1.6);
          const sx = Math.min(gw - 1, Math.max(0, x + sway));
          const below = heat[(y + 1) * gw + sx]!, l = heat[(y + 1) * gw + Math.max(0, sx - 1)]!, r = heat[(y + 1) * gw + Math.min(gw - 1, sx + 1)]!;
          heat[y * gw + x] = Math.max(0, (below * 2 + l + r) / 4 - (0.028 + R() * 0.03) * (1.3 - (y / gh) * 0.5));
        }
        if (px > 0) { const k = Math.round(py) * gw + Math.round(px); if (k >= 0 && k < heat.length) for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const kk = k + j * gw + i; if (kk >= 0 && kk < heat.length) heat[kk] = Math.min(1, heat[kk]! + 0.35); } }
      }
      if (acc > 1 / 30) acc = 0;
      const hot: RGB = f.dark ? mix(B, [255, 255, 255], 0.6) : mix(B, [255, 255, 255], 0.35), mid = B, low: RGB = f.dark ? mix(A, f.pal.surface, 0.1) : mix(A, f.pal.ink, 0.1);
      const d = img.data;
      for (let k = 0; k < gw * gh; k++) {
        const h = heat[k]!, o = k * 4;
        const c = h > 0.62 ? mix(mid, hot, (h - 0.62) / 0.38) : h > 0.28 ? mix(low, mid, (h - 0.28) / 0.34) : low;
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = Math.min(255, Math.pow(h, 0.85) * 330);
      }
      octx.putImageData(img, 0, 0);
      f.ctx.imageSmoothingEnabled = true; f.ctx.imageSmoothingQuality = 'high';
      f.ctx.drawImage(off, 0, 0, f.w, f.h);
      if (!f.reduced && embers.length < 40 && R() < 0.5) embers.push({ x: R() * f.w, y: f.h * (0.8 + R() * 0.2), vx: (R() - 0.5) * 20, vy: -(30 + R() * 50), life: 0, max: 1.5 + R() * 2 });
      if (f.reduced && embers.length === 0) for (let i = 0; i < 24; i++) embers.push({ x: R() * f.w, y: f.h * (0.2 + R() * 0.7), vx: 0, vy: 0, life: R() * 2, max: 3 });
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]!;
        if (!f.reduced) { e.life += f.dt; e.x += (e.vx + Math.sin(e.life * 3 + i) * 14) * f.dt; e.y += e.vy * f.dt; }
        if (e.life > e.max) { embers.splice(i, 1); continue; }
        const k = 1 - e.life / e.max;
        f.ctx.fillStyle = rgba(k > 0.5 ? hot : B, k);
        f.ctx.beginPath(); f.ctx.arc(e.x, e.y, 0.8 + k * 1.3, 0, 6.2832); f.ctx.fill();
      }
    },
  };
}

interface Drop { x: number; y: number; r: number; slide: number; v: number }
/** Condensation: a frosted layer with beaded droplets; heavy beads slide down and wipe clean streaks, and dragging wipes the glass. */
export function condensation(f0: Frame): Painter {
  const R = rng(41);
  let drops: Drop[] = [], fog: HTMLCanvasElement | null = null, fctx: CanvasRenderingContext2D | null = null, lastX = -1, lastY = -1;
  const build = (f: Frame) => {
    fog = document.createElement('canvas'); fog.width = Math.max(2, Math.round(f.w / 2)); fog.height = Math.max(2, Math.round(f.h / 2)); fctx = fog.getContext('2d');
    const n = Math.round((f.w * f.h) / 1900);
    drops = Array.from({ length: n }, () => { const big = R() < 0.07; return { x: R() * f.w, y: R() * f.h, r: big ? 5 + R() * 5 : 1.2 + R() * 2.6, slide: 0, v: 0 }; });
  };
  build(f0);
  const refog = (f: Frame, A: RGB, strength: number) => {
    if (!fctx || !fog) return;
    fctx.globalCompositeOperation = 'source-over';
    fctx.fillStyle = rgba(f.dark ? mix(f.pal.ink, A, 0.2) : mix(f.pal.surface, A, 0.18), strength);
    fctx.fillRect(0, 0, fog.width, fog.height);
  };
  let started = false;
  return {
    resize: (f) => { build(f); started = false; },
    draw(f) {
      if (!fctx || !fog) return;
      const A = accent(f), B = accent2(f);
      if (!started) { started = true; refog(f, A, 1); for (let i = 0; i < 6; i++) refog(f, A, 0.3); }
      else refog(f, A, f.dt * 0.12);
      const wipe = (x: number, y: number, rad: number) => { if (!fctx) return; fctx.globalCompositeOperation = 'destination-out'; fctx.fillStyle = '#000'; fctx.beginPath(); fctx.arc(x / 2, y / 2, rad / 2, 0, 6.2832); fctx.fill(); };
      if (f.ptr.inside && (f.ptr.down || f.coarse)) { if (lastX >= 0) { const n = Math.ceil(Math.hypot(f.ptr.x - lastX, f.ptr.y - lastY) / 6); for (let i = 0; i <= n; i++) wipe(lastX + ((f.ptr.x - lastX) * i) / (n || 1), lastY + ((f.ptr.y - lastY) * i) / (n || 1), 20); } lastX = f.ptr.x; lastY = f.ptr.y; } else { lastX = -1; lastY = -1; }
      for (const t of f.ptr.taps) drops.push({ x: t.x, y: t.y, r: 8, slide: 0, v: 0 });
      if (!f.reduced) {
        for (const d of drops) {
          if (d.slide === 0 && d.r > 5 && R() < f.dt * 0.12) d.slide = 1;
          if (d.slide) { d.v = Math.min(70, d.v + 90 * f.dt); const dy = d.v * f.dt; d.y += dy; d.x += Math.sin(d.y * 0.05) * 0.2; wipe(d.x, d.y - dy / 2, d.r * 1.5); d.r = Math.max(2.2, d.r - 0.4 * f.dt); if (d.y > f.h + 12) { d.y = -8 - R() * 40; d.x = R() * f.w; d.slide = 0; d.v = 0; d.r = 3 + R() * 3; } }
        }
        if (drops.length > 900) drops.splice(0, drops.length - 900);
      }
      const c = f.ctx;
      c.imageSmoothingEnabled = true;
      c.drawImage(fog, 0, 0, f.w, f.h);
      const rim: RGB = f.dark ? [255, 255, 255] : f.pal.ink;
      for (const d of drops) {
        c.fillStyle = rgba(f.dark ? [255, 255, 255] : B, f.dark ? 0.1 : 0.12);
        c.beginPath(); c.arc(d.x, d.y, d.r, 0, 6.2832); c.fill();
        c.strokeStyle = rgba(rim, f.dark ? 0.42 : 0.4); c.lineWidth = 1; c.stroke();
        if (d.r > 2.2) {
          c.fillStyle = rgba([255, 255, 255], f.dark ? 0.85 : 0.95);
          c.beginPath(); c.arc(d.x - d.r * 0.35, d.y - d.r * 0.38, Math.max(0.7, d.r * 0.22), 0, 6.2832); c.fill();
          c.strokeStyle = rgba(A, 0.5); c.beginPath(); c.arc(d.x, d.y, d.r * 0.7, 0.4, 1.9); c.stroke();
        }
      }
    },
  };
}
