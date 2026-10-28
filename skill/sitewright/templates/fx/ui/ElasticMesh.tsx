'use client';
import { useRef, type CSSProperties } from 'react';
import { clamp01, mix, rgba, useCanvas2D, type Frame } from './_motion-gl-2d';

export interface ElasticMeshProps {
  /** Distance between mesh nodes in px (default 36). */
  spacing?: number;
  /** Spring stiffness 0.2..2: higher snaps back faster (default 1). */
  stiffness?: number;
  /** Pointer pulls the mesh; press (or tap) to pluck it harder (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface Mesh { cols: number; rows: number; rx: Float32Array; ry: Float32Array; x: Float32Array; y: Float32Array; vx: Float32Array; vy: Float32Array; sp: number }
const STEP = 1 / 60;

function build(w: number, h: number, spacing: number): Mesh {
  const cols = Math.max(3, Math.round(w / spacing) + 1), rows = Math.max(3, Math.round(h / spacing) + 1);
  const n = cols * rows;
  const m: Mesh = { cols, rows, rx: new Float32Array(n), ry: new Float32Array(n), x: new Float32Array(n), y: new Float32Array(n), vx: new Float32Array(n), vy: new Float32Array(n), sp: Math.max(w / (cols - 1), h / (rows - 1)) };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i;
    m.rx[k] = m.x[k] = (i / (cols - 1)) * w; m.ry[k] = m.y[k] = (j / (rows - 1)) * h;
  }
  return m;
}

/**
 * A grid of spring-linked nodes that stretches toward the pointer and wobbles back. Press or tap
 * to pluck it. Canvas 2D; fills its parent. Decorative (aria-hidden); the resting grid with a
 * gentle bulge under reduced motion.
 */
export default function ElasticMesh({ spacing = 36, stiffness = 1, interactive = true, className, style }: ElasticMeshProps) {
  const mesh = useRef<Mesh | null>(null);
  const acc = useRef(0);
  const { wrapRef, canvasRef } = useCanvas2D((f: Frame) => {
    const { ctx, w, h, pal, ptr } = f;
    if (!mesh.current || f.fresh) {
      mesh.current = build(w, h, spacing);
      if (f.reduced) { // a composed still: one soft bulge
        const m = mesh.current;
        for (let k = 0; k < m.x.length; k++) {
          const dx = m.rx[k]! - w * 0.38, dy = m.ry[k]! - h * 0.45, g = Math.exp(-(dx * dx + dy * dy) / (Math.min(w, h) * 0.3) ** 2);
          m.x[k] = m.rx[k]! - dx * g * 0.35; m.y[k] = m.ry[k]! - dy * g * 0.35;
        }
      }
    }
    const m = mesh.current;
    const { cols, rows } = m;
    if (!f.reduced) {
      acc.current += Math.min(f.dt, 0.05);
      const R = m.sp * 3.2;
      while (acc.current >= STEP) {
        acc.current -= STEP;
        const grabbing = interactive && ptr.inside && (ptr.down || (!f.coarse));
        for (let tap = 0; tap < ptr.taps.length && interactive; tap++) {
          const tp = ptr.taps[tap]!;
          for (let k = 0; k < m.x.length; k++) {
            const dx = m.x[k]! - tp.x, dy = m.y[k]! - tp.y, d = Math.hypot(dx, dy) + 1, g = Math.exp(-(d * d) / (R * R * 1.4));
            m.vx[k] = m.vx[k]! + (dx / d) * g * 520; m.vy[k] = m.vy[k]! + (dy / d) * g * 520;
          }
        }
        if (acc.current < STEP) ptr.taps.length = 0;
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          let fx = (m.rx[k]! - m.x[k]!) * 90 * stiffness, fy = (m.ry[k]! - m.y[k]!) * 90 * stiffness;
          // neighbours drag each other, which is what makes the wobble travel
          let sx = 0, sy = 0, c = 0;
          if (i > 0) { sx += m.x[k - 1]! - m.rx[k - 1]!; sy += m.y[k - 1]! - m.ry[k - 1]!; c++; }
          if (i < cols - 1) { sx += m.x[k + 1]! - m.rx[k + 1]!; sy += m.y[k + 1]! - m.ry[k + 1]!; c++; }
          if (j > 0) { sx += m.x[k - cols]! - m.rx[k - cols]!; sy += m.y[k - cols]! - m.ry[k - cols]!; c++; }
          if (j < rows - 1) { sx += m.x[k + cols]! - m.rx[k + cols]!; sy += m.y[k + cols]! - m.ry[k + cols]!; c++; }
          fx += (sx / c - (m.x[k]! - m.rx[k]!)) * 70; fy += (sy / c - (m.y[k]! - m.ry[k]!)) * 70;
          if (grabbing) {
            const dx = ptr.x - m.x[k]!, dy = ptr.y - m.y[k]!, g = Math.exp(-(dx * dx + dy * dy) / (R * R));
            const pull = (ptr.down ? 520 : 260) * g;
            fx += (dx / (Math.hypot(dx, dy) + 8)) * pull * 0.5 * m.sp / 10; fy += (dy / (Math.hypot(dx, dy) + 8)) * pull * 0.5 * m.sp / 10;
          }
          m.vx[k] = (m.vx[k]! + fx * STEP) * 0.955; m.vy[k] = (m.vy[k]! + fy * STEP) * 0.955;
        }
        for (let k = 0; k < m.x.length; k++) { m.x[k] = m.x[k]! + m.vx[k]! * STEP; m.y[k] = m.y[k]! + m.vy[k]! * STEP; }
      }
    }
    // ambient breathing so the idle mesh is alive (and touch users see motion)
    const br = f.reduced ? 0 : 1;
    const px = (k: number) => m.x[k]! + br * Math.sin(f.t * 0.8 + m.rx[k]! * 0.02 + m.ry[k]! * 0.015) * 5;
    const py = (k: number) => m.y[k]! + br * Math.cos(f.t * 0.7 + m.rx[k]! * 0.017 - m.ry[k]! * 0.02) * 5;
    const stretch = (k: number) => clamp01(Math.hypot(px(k) - m.rx[k]!, py(k) - m.ry[k]!) / (m.sp * 0.9));
    const cA = mix(pal.muted, pal.primary, 0.45), cB = pal.primary, cC = pal.signal;
    ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    const seg = (a: number, b: number) => {
      const s = (stretch(a) + stretch(b)) / 2;
      const col = s < 0.5 ? mix(cA, cB, s * 2) : mix(cB, cC, (s - 0.5) * 2);
      ctx.strokeStyle = rgba(col, 0.38 + s * 0.6);
      ctx.beginPath(); ctx.moveTo(px(a), py(a)); ctx.lineTo(px(b), py(b)); ctx.stroke();
    };
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      if (i < cols - 1) seg(k, k + 1);
      if (j < rows - 1) seg(k, k + cols);
    }
    for (let k = 0; k < m.x.length; k++) {
      const s = stretch(k);
      ctx.fillStyle = rgba(s > 0.15 ? mix(cB, cC, s) : cA, 0.5 + s * 0.5);
      ctx.beginPath(); ctx.arc(px(k), py(k), 1.6 + s * 2.2, 0, Math.PI * 2); ctx.fill();
    }
  });
  return (
    <div ref={wrapRef} className={'ui-elastic-mesh' + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-elastic-mesh-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-elastic-mesh-stage">
      <ElasticMesh />
      <span className="ui-elastic-mesh-label">Pull &amp; pluck</span>
    </div>
  );
}
