import type { Env2D, RGB } from './_bg-a';
import { mixc, rgba } from './_bg-a';

/* Small shared helpers for the bg-f backgrounds (Canvas2D): surface wash and a smoothed pointer follower. */

/** Paint the surface colour plus two faint brand glows so every background starts from the same calm base. */
export function wash(e: Env2D, strength = 1): void {
  const { ctx, w, h, pal, dark } = e;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgba(pal.surface, 1);
  ctx.fillRect(0, 0, w, h);
  const r = Math.hypot(w, h) * 0.6;
  const g1 = ctx.createRadialGradient(w * 0.15, h * 0.1, 0, w * 0.15, h * 0.1, r);
  g1.addColorStop(0, rgba(pal.primary, (dark ? 0.16 : 0.1) * strength));
  g1.addColorStop(1, rgba(pal.primary, 0));
  ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);
  const g2 = ctx.createRadialGradient(w * 0.9, h * 0.95, 0, w * 0.9, h * 0.95, r * 0.9);
  g2.addColorStop(0, rgba(pal.signal, (dark ? 0.14 : 0.08) * strength));
  g2.addColorStop(1, rgba(pal.signal, 0));
  ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
}

export interface Follow { x: number; y: number; a: number }
/** Ease a follower toward the pointer (a = 0..1 presence). Without live input it settles at the middle. */
export function follow(f: Follow, e: Env2D, dt: number, live: boolean): Follow {
  const k = dt ? 1 - Math.exp(-dt * 6) : 1;
  const on = live && e.ptr.inside;
  if (on) {
    if (f.a < 0.02) { f.x = e.ptr.x; f.y = e.ptr.y; }
    f.x += (e.ptr.x - f.x) * k; f.y += (e.ptr.y - f.y) * k;
  }
  f.a += ((on ? 1 : 0) - f.a) * (dt ? k * 0.7 : 1);
  return f;
}

/** Brand ramp: primary -> signal at 0..1. */
export const ramp = (e: Env2D, t: number): RGB => mixc(e.pal.primary, e.pal.signal, Math.min(1, Math.max(0, t)));
