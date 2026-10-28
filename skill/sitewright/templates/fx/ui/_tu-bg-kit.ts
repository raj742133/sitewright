import type { Frame } from './_bg-c-canvas';
import { mix, type RGB } from './_t2';

/* Small shared helpers for the tu-bg backgrounds: theme-aware accent colours and cheap seeded noise. */

const WHITE: RGB = [255, 255, 255];
/** Primary accent that stays visible on both a light and a dark surface. */
export const accent = (f: Frame): RGB => (f.dark ? mix(f.pal.primary, WHITE, 0.38) : mix(f.pal.primary, f.pal.ink, 0.12));
/** Secondary (signal) accent, same treatment. */
export const accent2 = (f: Frame): RGB => (f.dark ? mix(f.pal.signal, WHITE, 0.3) : mix(f.pal.signal, f.pal.ink, 0.18));
/** Neutral line colour (ink on light, near white on dark). */
export const neutral = (f: Frame): RGB => (f.dark ? mix(f.pal.ink, WHITE, 0.2) : f.pal.ink);

const hash = (x: number, y: number) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** Smooth value noise in 0..1. */
export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm2(x: number, y: number): number {
  return vnoise(x, y) * 0.5 + vnoise(x * 2.03 + 11.3, y * 2.03 + 4.7) * 0.3 + vnoise(x * 4.1 + 3.9, y * 4.1 + 17.2) * 0.2;
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
