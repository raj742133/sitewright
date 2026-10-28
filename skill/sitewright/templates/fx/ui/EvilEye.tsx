'use client';
import type { CSSProperties } from 'react';
import { DemoShell, clamp, lum, mixc, rgba, rng, useCanvasBg, type Frame } from './_bg-b-kit';

export interface EvilEyeProps {
  /** Blink now and then (default true). With reduced motion the eye stays open and still. */
  blink?: boolean;
  /** How strongly the iris and the eye follow the pointer, 0..1 (default 1). Touch devices get a slow idle glance instead. */
  follow?: number;
  /** Scales the eye relative to its parent, default 1. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const VEIN_SEEDS = (() => {
  const r = rng(77);
  return Array.from({ length: 22 }, (_, i) => ({ side: i % 2 ? 1 : -1, a: (r() - 0.5) * 1.1, len: 0.35 + r() * 0.5, bend: (r() - 0.5) * 0.5, w: 0.5 + r() * 1.1 }));
})();

function blinkAmount(t: number): number {
  const p = (t % 5.4) / 0.34;
  if (p >= 1) return 0;
  return Math.sin(p * Math.PI) ** 1.5;
}

function drawEye(f: Frame, blink: boolean, follow: number, size: number) {
  const { ctx, w, h, t, pal } = f;
  const dark = lum(pal.surface) < 0.5;
  const ink = pal.ink, prim = pal.primary, sig = pal.signal;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const s = Math.min(w * 0.44, h * 0.82) * size;
  // watching shifts the whole eye a touch toward the pointer
  const lx = (f.px - 0.5) * 2 * follow, ly = (f.py - 0.5) * 2 * follow;
  const ex = cx + lx * s * 0.07, ey = cy + ly * s * 0.05;

  // aura: soft glow and slow rays
  const g = ctx.createRadialGradient(ex, ey, s * 0.2, ex, ey, Math.max(w, h) * 0.75);
  g.addColorStop(0, rgba(mixc(prim, sig, 0.35), dark ? 0.28 : 0.22));
  g.addColorStop(0.5, rgba(prim, dark ? 0.1 : 0.07));
  g.addColorStop(1, rgba(prim, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(ex, ey);
  ctx.lineCap = 'round';
  const rays = 44, rot = f.reduced ? 0 : t * 0.025;
  for (let i = 0; i < rays; i++) {
    const a = rot + (i / rays) * Math.PI * 2;
    const r0 = s * (1.1 + 0.18 * Math.sin(i * 2.3)), r1 = r0 + s * (0.25 + 0.35 * ((i * 7) % 5) / 5);
    ctx.strokeStyle = rgba(i % 3 ? prim : sig, 0.16 + 0.1 * Math.sin(i * 1.7 + t * (f.reduced ? 0 : 0.6)));
    ctx.lineWidth = i % 4 ? 1 : 2;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * 0.62); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.62); ctx.stroke();
  }
  ctx.restore();

  // lid shape
  const open = blink ? 1 - blinkAmount(f.reduced ? 0 : t) : 1;
  const A = s, H = s * 0.5 * (0.2 + 0.8 * open) * (1 - 0.08 * Math.max(0, ly));
  const lidPath = () => {
    ctx.beginPath();
    ctx.moveTo(ex - A, ey);
    ctx.quadraticCurveTo(ex - A * 0.15, ey - 2 * H * 1.04, ex + A, ey);
    ctx.quadraticCurveTo(ex + A * 0.1, ey + 2 * H * 0.86, ex - A, ey);
    ctx.closePath();
  };
  // sclera
  ctx.save();
  lidPath(); ctx.clip();
  const sc = mixc(pal.surface, dark ? [235, 228, 220] : [255, 255, 255], dark ? 0.5 : 0.7);
  const scl = ctx.createRadialGradient(ex, ey, s * 0.1, ex, ey, A * 1.05);
  scl.addColorStop(0, rgba(sc, 1));
  scl.addColorStop(0.7, rgba(mixc(sc, sig, 0.18), 1));
  scl.addColorStop(1, rgba(mixc(sc, prim, 0.55), 1));
  ctx.fillStyle = scl; ctx.fillRect(ex - A, ey - H * 2, A * 2, H * 4);
  // veins
  ctx.lineCap = 'round';
  for (const v of VEIN_SEEDS) {
    const x0 = ex + v.side * A * 1.02, y0 = ey + v.a * H * 0.4;
    const x1 = ex + v.side * A * (1 - v.len), y1 = ey + v.a * H * 1.4;
    ctx.strokeStyle = rgba(mixc(sig, [200, 30, 40], 0.5), 0.34);
    ctx.lineWidth = v.w;
    ctx.beginPath(); ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + v.bend * H, x1, y1); ctx.stroke();
  }
  // iris
  const ir = Math.min(H * 0.98, s * 0.42);
  const maxX = Math.max(0, A - ir * 1.15), maxY = H * 0.42;
  const ix = ex + clamp(lx * 1.25, -1, 1) * maxX * 0.92 + (f.reduced ? 0 : Math.sin(t * 7.3) * 0.6 * f.hover);
  const iy = ey + clamp(ly * 1.3, -1, 1) * maxY;
  const ic = mixc(sig, [255, 250, 235], 0.1), ic2 = mixc(mixc(sig, prim, 0.6), [20, 8, 12], 0.3);
  const ig = ctx.createRadialGradient(ix, iy, ir * 0.15, ix, iy, ir);
  ig.addColorStop(0, rgba(mixc(ic, [255, 255, 255], 0.2), 1));
  ig.addColorStop(0.55, rgba(ic, 1));
  ig.addColorStop(0.92, rgba(ic2, 1));
  ig.addColorStop(1, rgba([12, 6, 10], 1));
  ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, Math.PI * 2); ctx.fill();
  // iris fibres
  ctx.lineWidth = 1;
  const rf = rng(5);
  for (let i = 0; i < 70; i++) {
    const a = rf() * Math.PI * 2, r0 = ir * (0.28 + rf() * 0.12), r1 = ir * (0.7 + rf() * 0.28);
    ctx.strokeStyle = rf() > 0.5 ? rgba([20, 6, 8], 0.34) : rgba([255, 240, 200], 0.28);
    ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0); ctx.lineTo(ix + Math.cos(a) * r1, iy + Math.sin(a) * r1); ctx.stroke();
  }
  // slit pupil: narrows in light, widens when the pointer is near
  const pw = ir * (0.12 + 0.09 * f.hover + 0.04 * Math.sin(f.reduced ? 0 : t * 1.3));
  ctx.fillStyle = 'rgb(8,5,9)';
  ctx.beginPath(); ctx.ellipse(ix, iy, pw, ir * 0.78, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath(); ctx.ellipse(ix - ir * 0.3, iy - ir * 0.34, ir * 0.07, ir * 0.05, -0.6, 0, Math.PI * 2); ctx.fill();
  // lid shadow over the top
  const sh = ctx.createLinearGradient(0, ey - H, 0, ey + H * 0.2);
  sh.addColorStop(0, 'rgba(10,4,8,.55)'); sh.addColorStop(0.5, 'rgba(10,4,8,0)');
  ctx.fillStyle = sh; ctx.fillRect(ex - A, ey - H * 2, A * 2, H * 3);
  ctx.restore();
  // lid line
  lidPath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, s * 0.035); ctx.strokeStyle = rgba(mixc(ink, prim, 0.2), 0.88); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = rgba(sig, 0.5);
  ctx.beginPath(); ctx.moveTo(ex - A * 0.8, ey - H * 1.05); ctx.quadraticCurveTo(ex, ey - H * 2.3, ex + A * 0.8, ey - H * 1.05); ctx.stroke();
}

/**
 * A watching eye: an almond lid, bloodshot sclera, slit-pupil iris that tracks the pointer (listened on the
 * parent), blinking now and then and glancing about on its own on touch devices. Fills its parent
 * (`position:absolute; inset:0`; put it first inside a `position:relative` section). Decorative (aria-hidden),
 * pointer-events none; colours come from --primary --signal --surface --ink.
 */
export default function EvilEye({ blink = true, follow = 1, size = 1, className, style }: EvilEyeProps) {
  const { wrapRef, canvasRef, status } = useCanvasBg((f) => drawEye(f, blink, follow, size), { fps: 45 });
  return (
    <div ref={wrapRef} className={'ui-evil-eye' + (className ? ' ' + className : '')} style={style} data-state={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-evil-eye-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <DemoShell bg={<EvilEye />} title="It sees you" sub="Move the pointer and watch it follow." align="start" />
  );
}
