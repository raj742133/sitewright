'use client';
import { useState, type CSSProperties } from 'react';
import { Chips } from './_tu-three-chips';
import { FLOW_CAM, FLOW_FN, FLOW_VARIANTS, flowSeed, type FlowSeed, type FlowVariant } from './_tu-three-flow';
import { clamp, css, mixc, useScene, type Env, type RGB } from './_tu-three-kit';

export type { FlowVariant } from './_tu-three-flow';
export interface StructureFlowProps {
  /** Which study: dome, horizon, orbital, vortex, matrix or embers (default 'dome'). */
  variant?: FlowVariant;
  /** Particle count multiplier (default 1). */
  density?: number;
  className?: string;
  style?: CSSProperties;
}
interface State { v: FlowVariant; n: number; seed: FlowSeed; o: Float64Array; col: string[][]; buf: Float32Array }
const LEVELS = 4;

function build(env: Env, v: FlowVariant, density: number): State {
  const n = Math.round(clamp(Math.sqrt(env.w * env.h) * 3.6, 700, 2600) * clamp(density, 0.2, 2.5));
  const p = env.pal, base: RGB = p.ink, tints: RGB[] = [mixc(base, p.muted, 0.15), mixc(base, p.primary, 0.85), mixc(base, p.signal, 0.9)];
  return { v, n, seed: flowSeed(n, 17), o: new Float64Array(6), col: tints.map((c) => Array.from({ length: LEVELS }, (_, k) => css(c, (k + 1) / LEVELS))), buf: new Float32Array(n * 6) };
}
function frame(c: CanvasRenderingContext2D, env: Env, s: State) {
  const { w, h, t, px, py } = env, cam = FLOW_CAM[s.v], fn = FLOW_FN[s.v];
  c.clearRect(0, 0, w, h);
  const yaw = px * 0.7 + t * cam.spin, pitch = cam.pitch + py * 0.28, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const F = Math.min(w, h * 1.25) * 0.5 * cam.zoom, o = s.o, buf = s.buf, X0 = w / 2, Y0 = h / 2 + cam.cy * h;
  let m = 0;
  for (let i = 0; i < s.n; i++) {
    fn(i, s.n, t, s.seed, o);
    const x1 = o[0]! * cy + o[2]! * sy, z1 = -o[0]! * sy + o[2]! * cy, y2 = o[1]! * cp - z1 * sp, z2 = o[1]! * sp + z1 * cp, d = cam.dist + z2;
    if (d < 0.3) continue;
    const k = F / d, depth = clamp(1.25 - d / (cam.dist * 1.45), 0.08, 1), a = o[5]! * (0.45 + 0.55 * depth);
    if (a < 0.04) continue;
    buf[m++] = X0 + x1 * k * 1.0; buf[m++] = Y0 - y2 * k; buf[m++] = Math.max(1, o[4]! * (0.7 + k / F * 0.5) * (w > 600 ? 1.25 : 1)); buf[m++] = o[3]!; buf[m++] = Math.min(LEVELS - 1, Math.floor(a * LEVELS)); buf[m++] = 0;
  }
  if (env.dark) c.globalCompositeOperation = 'lighter';
  for (let tint = 0; tint < 3; tint++) for (let lv = 0; lv < LEVELS; lv++) {
    c.fillStyle = s.col[tint]![lv]!;
    for (let q = 0; q < m; q += 6) if (buf[q + 3] === tint && buf[q + 4] === lv) { const z = buf[q + 2]!; c.fillRect(buf[q]! - z / 2, buf[q + 1]! - z / 2, z, z); }
  }
}

/**
 * A family of particle studies drawn as projected 3-D points in Canvas 2D, monochrome in the host ink with primary and signal accents:
 * a geodesic dome, a receding horizon field, nested orbits, a funnel vortex, a data matrix lattice and rising embers. The pointer turns the view
 * (touch gets a slow sway). Decorative (aria-hidden); fills its parent; one still frame with reduced motion.
 */
export default function StructureFlow({ variant = 'dome', density = 1, className, style }: StructureFlowProps) {
  const v = FLOW_VARIANTS.includes(variant) ? variant : 'dome';
  const { wrapRef, canvasRef } = useScene<State>((env) => build(env, v, density), frame, { key: v + ':' + density, fps: 30, maxPixels: 1.6e6 });
  return (
    <div ref={wrapRef} className={'ui-structure-flow' + (className ? ' ' + className : '')} style={style} data-variant={v} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-structure-flow-canvas" />
    </div>
  );
}

export function Demo() {
  const [v, setV] = useState<FlowVariant>('dome');
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)' }}>
      <StructureFlow variant={v} />
      <div className="ui-structure-flow-bar"><Chips prefix="ui-structure-flow" label="Study" value={v} options={FLOW_VARIANTS} onChange={setV} /></div>
    </div>
  );
}
