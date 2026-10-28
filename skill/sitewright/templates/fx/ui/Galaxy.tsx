'use client';
import { useMemo, type CSSProperties } from 'react';
import { DemoShell, clamp, lum, mixc, rgba, rng, useCanvasBg, type Frame } from './_bg-b-kit';

export interface GalaxyProps {
  /** Star count (default 3800; fewer on small parents). */
  stars?: number;
  /** Spin speed multiplier (default 1). */
  speed?: number;
  /** Number of spiral arms (default 3). */
  arms?: number;
  /** The pointer tips the disc and shifts the view (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}
interface Field { x: Float32Array; y: Float32Array; z: Float32Array; kind: Uint8Array; size: Float32Array; tw: Float32Array; n: number }

function build(n: number, arms: number): Field {
  const r = rng(1969);
  const f: Field = { x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n), kind: new Uint8Array(n), size: new Float32Array(n), tw: new Float32Array(n), n };
  const gauss = () => (r() + r() + r() - 1.5) / 1.5;
  for (let i = 0; i < n; i++) {
    const core = r() < 0.22;
    const rad = core ? Math.pow(r(), 2.2) * 0.3 : 0.08 + Math.pow(r(), 1.05) * 0.92;
    const arm = Math.floor(r() * arms);
    const ang = core ? r() * 6.283 : (arm / arms) * 6.283 + rad * 3.7 + gauss() * (0.62 - rad * 0.3);
    f.x[i] = Math.cos(ang) * rad; f.y[i] = Math.sin(ang) * rad;
    f.z[i] = gauss() * 0.05 * (1.2 - rad);
    f.kind[i] = core ? 0 : rad > 0.6 ? 2 : 1;
    f.size[i] = r() < 0.04 ? 2.4 : r() < 0.3 ? 1.6 : 1;
    f.tw[i] = r() * 6.283;
  }
  return f;
}

function draw(f: Frame, fld: Field, speed: number, interactive: boolean) {
  const { ctx, w, h, pal, t } = f;
  const dark = lum(pal.surface) < 0.5;
  const space = dark ? mixc(pal.surface, [0, 0, 6], 0.55) : mixc(pal.surface, pal.primary, 0.07);
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  bg.addColorStop(0, rgba(mixc(space, pal.primary, dark ? 0.2 : 0.1), 1)); bg.addColorStop(1, rgba(space, 1));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const R = Math.min(w * 0.46, h * 0.95) * (w / h > 1.2 ? 1.05 : 1);
  const rot = (f.reduced ? 0 : t * 0.07 * speed) + 1;
  const tilt = 1.12 + (interactive ? (f.py - 0.5) * 0.5 : 0);
  const yaw = interactive ? (f.px - 0.5) * 0.5 : 0;
  const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cx0 = w / 2 + (interactive ? (f.px - 0.5) * w * 0.05 : 0), cy0 = h / 2;
  const core = dark ? mixc(pal.signal, [255, 255, 255], 0.55) : mixc(pal.signal, pal.ink, 0.1);
  const mid = dark ? mixc(pal.primary, [255, 255, 255], 0.45) : mixc(pal.primary, pal.ink, 0.1);
  const edge = dark ? mixc(pal.primary, [255, 255, 255], 0.12) : mixc(pal.primary, pal.ink, 0.45);
  const cols = [core, mid, edge];
  // faint disc haze following the tilt
  ctx.save(); ctx.translate(cx0, cy0); ctx.scale(1, Math.max(0.25, Math.abs(ct)));
  const hz = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  hz.addColorStop(0, rgba(pal.primary, dark ? 0.2 : 0.14)); hz.addColorStop(0.6, rgba(pal.primary, dark ? 0.07 : 0.05)); hz.addColorStop(1, rgba(pal.primary, 0));
  ctx.fillStyle = hz; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
  // glowing core
  const gc = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, R * 0.42);
  gc.addColorStop(0, rgba(pal.signal, dark ? 0.55 : 0.4)); gc.addColorStop(0.4, rgba(pal.signal, dark ? 0.14 : 0.1)); gc.addColorStop(1, rgba(pal.signal, 0));
  ctx.fillStyle = gc; ctx.fillRect(cx0 - R, cy0 - R, R * 2, R * 2);
  // bucket: kind (3) x brightness (3), one path per bucket
  const px = new Float32Array(fld.n * 2), br = new Uint8Array(fld.n);
  for (let i = 0; i < fld.n; i++) {
    const x0 = fld.x[i]! * cr - fld.y[i]! * sr, y0 = fld.x[i]! * sr + fld.y[i]! * cr, z0 = fld.z[i]!;
    const x1 = x0 * cy + z0 * sy, z1 = -x0 * sy + z0 * cy;
    const y2 = y0 * ct - z1 * st, z2 = y0 * st + z1 * ct;
    px[i * 2] = cx0 + x1 * R; px[i * 2 + 1] = cy0 + y2 * R;
    const tw = f.reduced ? 1 : 0.7 + 0.3 * Math.sin(t * 1.6 + fld.tw[i]!);
    const depth = clamp(0.62 + z2 * 1.4, 0.3, 1) * tw;
    br[i] = depth > 0.82 ? 2 : depth > 0.55 ? 1 : 0;
  }
  ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
  const alphas = dark ? [0.4, 0.7, 1] : [0.35, 0.6, 0.85];
  for (let k = 0; k < 3; k++) for (let b = 0; b < 3; b++) {
    ctx.fillStyle = rgba(cols[k]!, alphas[b]!);
    ctx.beginPath();
    for (let i = 0; i < fld.n; i++) {
      if (fld.kind[i] !== k || br[i] !== b) continue;
      const s = fld.size[i]! * (b === 2 ? 1.15 : 1) * (R > 160 ? 1.25 : 1);
      ctx.rect(px[i * 2]! - s / 2, px[i * 2 + 1]! - s / 2, s, s);
    }
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * A spiral galaxy of a couple of thousand stars: a bright core, curved arms and a thin disc, slowly
 * rotating and tilted in 3D. The pointer (listened on the parent) tips the disc; on touch it sways on its own.
 * Dark space in dark themes, a pale star-chart in light ones. Fills its parent (first child of a
 * `position:relative` section). Decorative (aria-hidden); a still frame with reduced motion.
 */
export default function Galaxy({ stars = 3800, speed = 1, arms = 3, interactive = true, className, style }: GalaxyProps) {
  const fld = useMemo(() => build(clamp(Math.round(stars), 200, 6000), clamp(Math.round(arms), 1, 6)), [stars, arms]);
  const { wrapRef, canvasRef, status } = useCanvasBg((f) => draw(f, fld, speed, interactive), { fps: 40, pointer: interactive });
  return (
    <div ref={wrapRef} className={'ui-galaxy' + (className ? ' ' + className : '')} style={style} data-state={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-galaxy-canvas" />
    </div>
  );
}

export function Demo() {
  return <DemoShell bg={<Galaxy />} title="Spiral drift" sub="Tilt the disc with your pointer." align="start" />;
}
