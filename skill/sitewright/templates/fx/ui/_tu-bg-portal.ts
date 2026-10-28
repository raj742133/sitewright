import type { Frame, Painter } from './_bg-c-canvas';
import { rng } from './_bg-c-canvas';
import { mix, rgba } from './_t2';
import { accent, accent2, fbm2, lerp } from './_tu-bg-kit';

export type PortalVariant = 'cloud' | 'bell' | 'flow';

/** A rotating cloud of points shaped by noise, projected with perspective; the pointer tilts it. */
function cloud(): Painter {
  const R = rng(3);
  const pts = Array.from({ length: 1100 }, () => {
    const u = R() * 6.2832, v = Math.acos(2 * R() - 1), r = Math.cbrt(R());
    const n = 0.55 + 0.9 * fbm2(Math.cos(u) * Math.sin(v) * 1.7 + 4, Math.cos(v) * 1.7 + Math.sin(u) * 0.9);
    return { x: Math.cos(u) * Math.sin(v) * r * n * 1.25, y: Math.cos(v) * r * n * 0.78, z: Math.sin(u) * Math.sin(v) * r * n * 1.25, k: R() };
  });
  let tx = 0, ty = 0;
  return {
    draw(f) {
      const A = accent(f), B = accent2(f), c = f.ctx, s = Math.min(f.w, f.h) * 0.46;
      const gx = f.ptr.inside ? (f.ptr.x / f.w - 0.5) * 0.9 : 0, gy = f.ptr.inside ? (f.ptr.y / f.h - 0.5) * 0.6 : 0;
      tx = lerp(tx, gx, 1 - Math.exp(-f.dt * 3)); ty = lerp(ty, gy, 1 - Math.exp(-f.dt * 3));
      const yaw = f.t * 0.12 + tx, pitch = 0.35 + ty, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const g = c.createRadialGradient(f.w / 2, f.h / 2, 0, f.w / 2, f.h / 2, s * 1.5);
      g.addColorStop(0, rgba(A, f.dark ? 0.22 : 0.16)); g.addColorStop(1, rgba(A, 0));
      c.fillStyle = g; c.fillRect(0, 0, f.w, f.h);
      const out: [number, number, number, number][] = pts.map((p) => {
        const x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
        const y2 = p.y * cp - z1 * sp, z2 = p.y * sp + z1 * cp;
        return [x1, y2, z2, p.k];
      });
      out.sort((a, b) => a[2] - b[2]);
      for (const [x, y, z, k] of out) {
        const w = 1 / (1 - z * 0.28), d = (z + 1.4) / 2.8;
        c.fillStyle = rgba(k > 0.8 ? B : mix(A, B, k * 0.3), (f.dark ? 0.25 : 0.2) + d * 0.7);
        const r = (0.8 + d * 1.4) * w;
        c.fillRect(f.w / 2 + x * s * w - r / 2, f.h / 2 + y * s * w - r / 2, r, r);
      }
    },
  };
}

/** Standing-wave plate: grains jitter hard where the plate vibrates and settle on the still nodal lines of changing modes. */
function bell(f0: Frame): Painter {
  const R = rng(17);
  const MODES: [number, number][] = [[2, 3], [3, 4], [1, 4], [4, 5], [2, 5], [3, 5]];
  let g: { x: number; y: number }[] = [];
  const build = (f: Frame) => { g = Array.from({ length: Math.max(300, Math.min(1800, Math.round((f.w * f.h) / 220))) }, () => ({ x: R(), y: R() })); };
  build(f0);
  const field = (n: number, m: number, x: number, y: number) => Math.sin(n * Math.PI * x) * Math.sin(m * Math.PI * y) + Math.sin(m * Math.PI * x) * Math.sin(n * Math.PI * y);
  return {
    resize: build,
    draw(f) {
      const A = accent(f), B = accent2(f), c = f.ctx;
      const period = 7, ph = f.t / period, i0 = Math.floor(ph) % MODES.length, i1 = (i0 + 1) % MODES.length, s = Math.min(1, Math.max(0, (ph % 1 - 0.7) / 0.3));
      const e = s * s * (3 - 2 * s);
      const [n0, m0] = MODES[i0]!, [n1, m1] = MODES[i1]!;
      const F = (x: number, y: number) => field(n0, m0, x, y) * (1 - e) + field(n1, m1, x, y) * e;
      const side = Math.min(f.w, f.h) * 0.92, ox = (f.w - side) / 2, oy = (f.h - side) / 2, h = 0.004, dt = Math.min(f.dt, 0.05);
      c.strokeStyle = rgba(A, f.dark ? 0.18 : 0.14); c.lineWidth = 1;
      c.strokeRect(ox + 0.5, oy + 0.5, side - 1, side - 1);
      for (const p of g) {
        const v = F(p.x, p.y), gx = (F(p.x + h, p.y) - F(p.x - h, p.y)) / (2 * h), gy = (F(p.x, p.y + h) - F(p.x, p.y - h)) / (2 * h);
        let amp = Math.min(1, Math.abs(v)), boost = 1;
        if (f.ptr.inside) { const d = Math.hypot((f.ptr.x - ox) / side - p.x, (f.ptr.y - oy) / side - p.y); boost += Math.max(0, 1 - d / 0.25) * 3; }
        p.x += -v * gx * 0.006 * 60 * dt * 0.5 + (R() - 0.5) * 0.02 * amp * boost * Math.min(1, dt * 60);
        p.y += -v * gy * 0.006 * 60 * dt * 0.5 + (R() - 0.5) * 0.02 * amp * boost * Math.min(1, dt * 60);
        p.x = Math.min(0.999, Math.max(0.001, p.x)); p.y = Math.min(0.999, Math.max(0.001, p.y));
        amp = Math.min(1, amp);
        c.fillStyle = rgba(amp > 0.35 ? B : A, 0.9 - amp * 0.3);
        c.fillRect(ox + p.x * side - 0.9, oy + p.y * side - 0.9, 1.8, 1.8);
      }
    },
  };
}

interface Tr { a: number; r: number; sp: number; h: number[]; k: number }
/** Streams spiral in from the rim and converge on a focal point, which drifts toward the pointer. */
function flow(f0: Frame): Painter {
  const R = rng(29);
  let ts: Tr[] = [], fx = 0, fy = 0;
  const reset = (t: Tr, f: Frame) => { t.a = R() * 6.2832; t.r = Math.hypot(f.w, f.h) * (0.5 + R() * 0.12); t.sp = 0.7 + R() * 0.8; t.h = []; t.k = R() < 0.3 ? 1 : 0; };
  const build = (f: Frame) => { fx = f.w / 2; fy = f.h / 2; ts = Array.from({ length: Math.max(50, Math.min(180, Math.round(f.w / 5))) }, () => { const t: Tr = { a: 0, r: 0, sp: 1, h: [], k: 0 }; reset(t, f); t.r *= R(); return t; }); };
  build(f0);
  return {
    resize: build,
    draw(f) {
      const A = accent(f), B = accent2(f), c = f.ctx;
      const tx = f.ptr.inside ? f.ptr.x : f.w / 2 + Math.sin(f.t * 0.3) * f.w * 0.06, ty = f.ptr.inside ? f.ptr.y : f.h / 2 + Math.cos(f.t * 0.4) * f.h * 0.06;
      fx = lerp(fx, tx, 1 - Math.exp(-f.dt * 2)); fy = lerp(fy, ty, 1 - Math.exp(-f.dt * 2));
      const g = c.createRadialGradient(fx, fy, 0, fx, fy, Math.min(f.w, f.h) * 0.5);
      g.addColorStop(0, rgba(B, f.dark ? 0.5 : 0.34)); g.addColorStop(0.35, rgba(A, f.dark ? 0.2 : 0.14)); g.addColorStop(1, rgba(A, 0));
      c.fillStyle = g; c.fillRect(0, 0, f.w, f.h);
      c.lineWidth = 1.3; c.lineCap = 'round';
      const R0 = Math.hypot(f.w, f.h) * 0.55;
      for (const t of ts) {
        t.r -= (14 + t.r * 0.55) * t.sp * f.dt;
        t.a += (0.25 + 60 / (t.r + 40)) * f.dt;
        if (t.r < 6) { reset(t, f); continue; }
        const wob = (fbm2(t.a * 2, t.r * 0.01 + f.t * 0.1) - 0.5) * 24;
        const x = fx + Math.cos(t.a) * (t.r + wob), y = fy + Math.sin(t.a) * (t.r + wob) * 0.82;
        t.h.push(x, y); if (t.h.length > 28) t.h.splice(0, 2);
        const n = t.h.length / 2, near = Math.min(1, t.r / 70), fade = Math.min(1, (R0 - t.r) / 90);
        for (let i = 1; i < n; i++) {
          c.strokeStyle = rgba(mix(t.k ? B : A, B, 1 - near), (i / n) * fade * (0.3 + 0.55 * (1 - t.r / R0)) * (f.dark ? 1 : 0.9));
          c.beginPath(); c.moveTo(t.h[(i - 1) * 2]!, t.h[(i - 1) * 2 + 1]!); c.lineTo(t.h[i * 2]!, t.h[i * 2 + 1]!); c.stroke();
        }
      }
      c.strokeStyle = rgba(B, 0.55); c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(fx, fy, 14 + Math.sin(f.t * 2) * 1.5, 11.5, 0, 0, 6.2832); c.stroke();
    },
  };
}

export function makePortal(v: PortalVariant, f: Frame): Painter {
  return v === 'bell' ? bell(f) : v === 'flow' ? flow(f) : cloud();
}
