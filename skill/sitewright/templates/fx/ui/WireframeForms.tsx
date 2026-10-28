'use client';
import { useMemo, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { rgba, mix } from './_t2';
import { clamp, useCanvas2D, type CanvasEnv } from './_tu-ui-kit';

export type WireframeVariant = 'cube' | 'cylinders' | 'sphere';
export interface WireframeFormsProps {
  /** The solid to draw. */
  variant?: WireframeVariant;
  /** Radians per second of automatic spin (default 0.45, 0 = none). */
  spin?: number;
  className?: string;
  style?: CSSProperties;
}

type V = [number, number, number];
interface Line { pts: V[]; tone: 0 | 1 | 2 }
const TAU = Math.PI * 2;
const circle = (axis: 0 | 1 | 2, r: number, at: number, n = 40): V[] => Array.from({ length: n + 1 }, (_, i) => {
  const a = (i / n) * TAU, c = Math.cos(a) * r, s = Math.sin(a) * r;
  return axis === 0 ? [at, c, s] : axis === 1 ? [c, at, s] : [c, s, at];
});

function build(v: WireframeVariant): Line[] {
  const out: Line[] = [];
  if (v === 'cube') {
    const box = (k: number, tone: 0 | 1 | 2, div: number) => {
      for (let a = 0; a < 3; a++) for (let g = 0; g <= div; g++) for (const s of [-1, 1]) {
        const u = -k + (2 * k * g) / div;
        const p = (t: number): V => { const o: V = [0, 0, 0]; o[a] = s * k; o[(a + 1) % 3] = u; o[(a + 2) % 3] = t; return o; };
        const q = (t: number): V => { const o: V = [0, 0, 0]; o[a] = s * k; o[(a + 2) % 3] = u; o[(a + 1) % 3] = t; return o; };
        out.push({ pts: [p(-k), p(k)], tone }, { pts: [q(-k), q(k)], tone });
      }
    };
    box(1, 0, 4);
    box(0.4, 1, 1);
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) out.push({ pts: [[x, y, z], [x * 0.4, y * 0.4, z * 0.4]], tone: 2 });
  } else if (v === 'cylinders') {
    for (let ax = 0 as 0 | 1 | 2; ax < 3; ax++) {
      const tone = ax as 0 | 1 | 2;
      for (let i = 0; i <= 8; i++) out.push({ pts: circle(ax, 0.58, -1 + (i / 8) * 2), tone });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU, c = Math.cos(a) * 0.58, s = Math.sin(a) * 0.58;
        out.push({ pts: ax === 0 ? [[-1, c, s], [1, c, s]] : ax === 1 ? [[c, -1, s], [c, 1, s]] : [[c, s, -1], [c, s, 1]], tone });
      }
    }
  } else {
    for (let i = 1; i < 9; i++) { const phi = -Math.PI / 2 + (i / 9) * Math.PI; out.push({ pts: circle(1, Math.cos(phi), Math.sin(phi), 48), tone: i === 5 ? 1 : 0 }); }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI;
      out.push({ pts: Array.from({ length: 49 }, (_, j) => { const b = (j / 48) * TAU; return [Math.cos(b) * Math.cos(a), Math.sin(b), Math.cos(b) * Math.sin(a)] as V; }), tone: 0 });
    }
  }
  return out;
}

const LABEL: Record<WireframeVariant, string> = { cube: 'a cube inside a cube', cylinders: 'three crossing cylinders', sphere: 'a latitude and longitude sphere' };

/** A rotating wireframe solid drawn with Canvas 2D line segments that fade with depth. Drag to spin it with inertia, arrow keys nudge it; under reduced motion it holds one pose (dragging and keys still turn it). */
export default function WireframeForms({ variant = 'cube', spin = 0.45, className, style }: WireframeFormsProps) {
  const lines = useMemo(() => build(variant), [variant]);
  const st = useRef({ yaw: 0.7, pitch: 0.5, vy: 0, vp: 0, drag: false, lx: 0, ly: 0 });
  const draw = (e: CanvasEnv) => {
    const { ctx, w, h, pal } = e;
    const s = st.current;
    if (!s.drag) {
      s.yaw += (e.reduced ? 0 : spin) * e.dt + s.vy * e.dt;
      s.pitch = clamp(s.pitch + s.vp * e.dt, -1.35, 1.35);
      const d = Math.pow(0.03, e.dt); s.vy *= d; s.vp *= d;
    }
    const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw), cp = Math.cos(s.pitch), sp = Math.sin(s.pitch);
    const scale = Math.min(w, h) * (variant === 'cube' ? 0.22 : 0.3), dist = 5;
    const cols = [pal.primary, pal.signal, mix(pal.primary, pal.ink, 0.5)];
    const proj = (p: V) => {
      const x = p[0] * cy + p[2] * sy, z0 = -p[0] * sy + p[2] * cy;
      const y = p[1] * cp - z0 * sp, z = p[1] * sp + z0 * cp;
      const k = dist / (dist + z);
      return { x: w / 2 + x * scale * k, y: h / 2 - y * scale * k, z };
    };
    ctx.lineCap = 'round';
    for (const ln of lines) {
      const c = cols[ln.tone]!;
      let a = proj(ln.pts[0]!);
      for (let i = 1; i < ln.pts.length; i++) {
        const b = proj(ln.pts[i]!);
        const depth = 1 - clamp(((a.z + b.z) / 2 + 1.8) / 3.6, 0, 1);
        ctx.strokeStyle = rgba(c, 0.12 + 0.78 * depth * depth);
        ctx.lineWidth = 0.7 + 0.9 * depth;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        a = b;
      }
    }
  };
  const { canvasRef, invalidate } = useCanvas2D(draw, { staticT: 0 });
  const down = (e: PointerEvent<HTMLCanvasElement>) => { const s = st.current; s.drag = true; s.lx = e.clientX; s.ly = e.clientY; s.vy = s.vp = 0; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const s = st.current;
    if (!s.drag) return;
    const dx = (e.clientX - s.lx) * 0.012, dy = (e.clientY - s.ly) * 0.012;
    s.lx = e.clientX; s.ly = e.clientY;
    s.yaw += dx; s.pitch = clamp(s.pitch + dy, -1.35, 1.35); s.vy = dx * 50; s.vp = dy * 50;
    invalidate();
  };
  const up = () => { st.current.drag = false; invalidate(); };
  const key = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const s = st.current;
    if (e.key === 'ArrowLeft') s.yaw -= 0.25; else if (e.key === 'ArrowRight') s.yaw += 0.25;
    else if (e.key === 'ArrowUp') s.pitch = clamp(s.pitch - 0.2, -1.35, 1.35); else if (e.key === 'ArrowDown') s.pitch = clamp(s.pitch + 0.2, -1.35, 1.35);
    else if (e.key === 'Home') { s.yaw = 0.7; s.pitch = 0.5; } else return;
    e.preventDefault(); invalidate();
  };
  return (
    <div className={`ui-wireframe-forms-root ${className ?? ''}`} style={style}>
      <canvas ref={canvasRef} className="ui-wireframe-forms-cv" tabIndex={0} role="img" aria-label={`Wireframe of ${LABEL[variant]}. Drag or use the arrow keys to turn it; Home resets.`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key} />
    </div>
  );
}

export function Demo() {
  const set: WireframeVariant[] = ['cube', 'cylinders', 'sphere'];
  return (
    <div className="ui-wireframe-forms-demo">
      {set.map((v) => (
        <figure key={v} className="ui-wireframe-forms-fig">
          <WireframeForms variant={v} />
          <figcaption>{v}</figcaption>
        </figure>
      ))}
    </div>
  );
}
