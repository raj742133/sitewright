import { clamp, mix, rgba, seeded, type Palette, type RGB } from './_text-c';

/* Procedural flat-colour tiles for GalleryHeading: each treatment is a different print-like finish. */

export type TileKind = 'flat' | 'grain' | 'dither' | 'halftone' | 'glitch' | 'noise';
export const TILE_KINDS: TileKind[] = ['flat', 'grain', 'dither', 'halftone', 'glitch', 'noise'];
export const TILE_W = 300, TILE_H = 400;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function paintTile(cv: HTMLCanvasElement, kind: TileKind, seed: number, pal: Palette) {
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  cv.width = TILE_W; cv.height = TILE_H;
  const rnd = seeded(seed * 7919 + 13);
  const hue: RGB[] = [pal.primary, pal.signal, mix(pal.primary, pal.signal, 0.5), mix(pal.ink, pal.primary, 0.4)];
  const base = mix(pal.surface, hue[seed % hue.length]!, 0.55 + (seed % 3) * 0.1);
  const accent = hue[(seed + 1) % hue.length]!;
  const dark = mix(pal.ink, base, 0.25);
  ctx.fillStyle = rgba(base, 1); ctx.fillRect(0, 0, TILE_W, TILE_H);
  // a bold flat composition: a sun disc, a hill and a bar, positioned by seed
  ctx.fillStyle = rgba(accent, 1);
  ctx.beginPath(); ctx.arc(70 + rnd() * 160, 90 + rnd() * 80, 52 + rnd() * 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgba(dark, 1);
  ctx.beginPath(); ctx.moveTo(0, 400); ctx.lineTo(0, 270 + rnd() * 40); ctx.quadraticCurveTo(110 + rnd() * 60, 190 + rnd() * 40, 300, 280 + rnd() * 50); ctx.lineTo(300, 400); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(mix(pal.raised, base, 0.25), 1); ctx.fillRect(24, 330 + rnd() * 20, 90 + rnd() * 80, 10);
  if (kind === 'flat') return;
  const img = ctx.getImageData(0, 0, TILE_W, TILE_H), d = img.data;
  if (kind === 'grain' || kind === 'noise') {
    const amt = kind === 'grain' ? 34 : 70;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rnd() - 0.5) * amt;
      d[i] = clamp(d[i]! + n, 0, 255); d[i + 1] = clamp(d[i + 1]! + n, 0, 255); d[i + 2] = clamp(d[i + 2]! + n, 0, 255);
    }
  } else if (kind === 'dither') {
    for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
      const i = (y * TILE_W + x) * 4, lum = (d[i]! * 0.3 + d[i + 1]! * 0.59 + d[i + 2]! * 0.11) / 255;
      const th = (BAYER[(y % 4) * 4 + (x % 4)]! + 0.5) / 16, on = lum + (y / TILE_H - 0.5) * 0.5 > th;
      const c = on ? mix(pal.raised, base, 0.2) : dark;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
    }
  }
  ctx.putImageData(img, 0, 0);
  if (kind === 'halftone') {
    ctx.fillStyle = rgba(base, 1); ctx.fillRect(0, 0, TILE_W, TILE_H);
    const step = 10;
    for (let y = 0; y < TILE_H; y += step) for (let x = 0; x < TILE_W; x += step) {
      const px = img.data, i = ((y + 5) * TILE_W + x + 5) * 4;
      const lum = (px[i]! * 0.3 + px[i + 1]! * 0.59 + px[i + 2]! * 0.11) / 255;
      const r = (1 - lum) * step * 0.62 + 0.8;
      ctx.fillStyle = rgba(px[i]! > 200 && px[i + 2]! < 120 ? accent : dark, 1);
      ctx.beginPath(); ctx.arc(x + 5, y + 5, r, 0, Math.PI * 2); ctx.fill();
    }
  } else if (kind === 'glitch') {
    for (let k = 0; k < 7; k++) {
      const y = Math.floor(rnd() * TILE_H), hh = 6 + Math.floor(rnd() * 26), dx = Math.floor((rnd() - 0.5) * 70);
      ctx.drawImage(cv, 0, y, TILE_W, hh, dx, y, TILE_W, hh);
      ctx.fillStyle = rgba(rnd() > 0.5 ? accent : pal.raised, 0.35); ctx.fillRect(0, y, TILE_W, 2);
    }
  }
}
