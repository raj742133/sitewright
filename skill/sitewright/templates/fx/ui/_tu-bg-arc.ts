import type { Frame, Painter } from './_bg-c-canvas';
import { rng } from './_bg-c-canvas';
import { mix, rgba } from './_t2';
import { accent, accent2, fbm2, neutral, smooth } from './_tu-bg-kit';

export type ArcVariant = 'arc' | 'signals' | 'ribbon' | 'dots' | 'flow';

/** A big arch on the horizon drawn as a pixel grid: cells light up by their distance to the arc, with a pulse running along it. */
function arc(): Painter {
  return {
    draw(f) {
      const A = accent(f), B = accent2(f), c = f.ctx;
      const cell = Math.max(7, Math.round(Math.min(f.w, f.h) / 26)), gap = 1.5;
      const R = Math.max(f.w * 0.62, f.h * 0.95), cx = f.w / 2 + (f.ptr.inside ? (f.ptr.x / f.w - 0.5) * 30 : 0), cy = f.h + R * 0.34;
      const rr = R * (1 + Math.sin(f.t * 0.5) * 0.012);
      const cols = Math.ceil(f.w / cell), rows = Math.ceil(f.h / cell);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = i * cell + cell / 2, y = j * cell + cell / 2;
        const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) - rr;
        const ang = Math.atan2(dy, dx);
        const pulse = 0.5 + 0.5 * Math.sin(ang * 9 - f.t * 1.6);
        const near = Math.exp(-(d * d) / (2 * cell * cell * 2.2));
        const inner = d < 0 ? Math.exp(d / (cell * 7)) * 0.16 : 0;
        const v = Math.min(1, near * (0.55 + pulse * 0.6) + inner * (0.6 + 0.4 * pulse));
        if (v < 0.04) continue;
        const col = mix(A, B, smooth(-0.2, 0.2, Math.cos(ang * 2 + f.t * 0.2)) * 0.8 + (d > 0 ? 0 : 0.1));
        c.fillStyle = rgba(col, Math.min(1, v) * (f.dark ? 0.95 : 0.8));
        c.fillRect(i * cell + gap / 2, j * cell + gap / 2, cell - gap, cell - gap);
      }
      const g = c.createRadialGradient(cx, cy, rr * 0.96, cx, cy, rr * 1.12);
      g.addColorStop(0, rgba(A, 0)); g.addColorStop(0.5, rgba(B, f.dark ? 0.18 : 0.12)); g.addColorStop(1, rgba(A, 0));
      c.fillStyle = g; c.fillRect(0, 0, f.w, f.h);
    },
  };
}

interface Pulse { e: number; t: number; sp: number }
/** Telemetry network: fixed nodes joined by faint edges; bright pulses travel along them and ignite the nodes they reach. */
function signals(f0: Frame): Painter {
  const R = rng(5);
  let nodes: { x: number; y: number; hot: number }[] = [], edges: [number, number][] = [];
  let pulses: Pulse[] = [];
  const build = (f: Frame) => {
    const cols = Math.max(3, Math.round(f.w / 120)), rows = Math.max(2, Math.round(f.h / 100));
    nodes = []; edges = []; pulses = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) nodes.push({ x: ((i + 0.5 + (R() - 0.5) * 0.6) / cols) * f.w, y: ((j + 0.5 + (R() - 0.5) * 0.6) / rows) * f.h, hot: 0 });
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      if (i + 1 < cols && R() < 0.85) edges.push([k, k + 1]);
      if (j + 1 < rows && R() < 0.85) edges.push([k, k + cols]);
      if (i + 1 < cols && j + 1 < rows && R() < 0.3) edges.push([k, k + cols + 1]);
    }
    for (let i = 0; i < Math.min(10, edges.length); i++) pulses.push({ e: Math.floor(R() * edges.length), t: R(), sp: 0.25 + R() * 0.3 });
  };
  build(f0);
  return {
    resize: build,
    draw(f) {
      const A = accent(f), B = accent2(f), N = neutral(f), c = f.ctx;
      c.lineWidth = 1;
      for (const [a, b] of edges) {
        const p = nodes[a]!, q = nodes[b]!;
        c.strokeStyle = rgba(N, f.dark ? 0.2 : 0.16); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke();
      }
      for (const u of pulses) {
        u.t += u.sp * f.dt;
        const [a, b] = edges[u.e]!;
        let p = nodes[a]!, q = nodes[b]!;
        if (u.e % 2) { const s = p; p = q; q = s; }
        if (u.t >= 1) {
          q.hot = 1;
          const out = edges.map((e, i) => (e[0] === (u.e % 2 ? a : b) || e[1] === (u.e % 2 ? a : b) ? i : -1)).filter((i) => i >= 0);
          u.e = out.length ? out[Math.floor(((f.t * 7919 + u.e * 31) % 1 + 1) % 1 * out.length) % out.length]! : u.e;
          u.t = 0; u.sp = 0.22 + ((f.t * 13.7 + u.e) % 1) * 0.35;
          continue;
        }
        const x = p.x + (q.x - p.x) * u.t, y = p.y + (q.y - p.y) * u.t;
        const t0 = Math.max(0, u.t - 0.22), tx = p.x + (q.x - p.x) * t0, ty = p.y + (q.y - p.y) * t0;
        const g = c.createLinearGradient(tx, ty, x, y);
        g.addColorStop(0, rgba(A, 0)); g.addColorStop(1, rgba(B, 1));
        c.strokeStyle = g; c.lineWidth = 2; c.beginPath(); c.moveTo(tx, ty); c.lineTo(x, y); c.stroke();
        c.fillStyle = rgba(B, 1); c.beginPath(); c.arc(x, y, 2.4, 0, 6.2832); c.fill();
      }
      for (const n of nodes) {
        n.hot = Math.max(0, n.hot - f.dt * 1.4);
        if (n.hot > 0) { c.strokeStyle = rgba(B, n.hot * 0.7); c.lineWidth = 1.5; c.beginPath(); c.arc(n.x, n.y, 4 + (1 - n.hot) * 14, 0, 6.2832); c.stroke(); }
        c.fillStyle = rgba(A, 0.9); c.beginPath(); c.arc(n.x, n.y, 2.6, 0, 6.2832); c.fill();
      }
    },
  };
}

/** Layered translucent ribbons riding sums of sines. */
function ribbon(): Painter {
  return {
    draw(f) {
      const A = accent(f), B = accent2(f), c = f.ctx, steps = Math.max(24, Math.round(f.w / 14));
      const pr = f.ptr.inside ? (f.ptr.y / f.h - 0.5) * 0.4 : 0;
      for (let k = 0; k < 4; k++) {
        const base = f.h * (0.3 + k * 0.14 + pr * (k - 1.5) * 0.3), amp = f.h * (0.08 + k * 0.025), ph = k * 1.7;
        const top: number[] = [], bot: number[] = [];
        for (let i = 0; i <= steps; i++) {
          const u = i / steps, x = u * f.w;
          const y = base + Math.sin(u * 5 + f.t * (0.5 + k * 0.12) + ph) * amp + Math.sin(u * 11 - f.t * 0.7 + ph * 2) * amp * 0.28;
          const th = f.h * (0.025 + 0.05 * (0.5 + 0.5 * Math.sin(u * 3.2 + f.t * 0.4 + k)));
          top.push(x, y - th); bot.push(x, y + th);
        }
        c.beginPath(); c.moveTo(top[0]!, top[1]!);
        for (let i = 2; i < top.length; i += 2) c.lineTo(top[i]!, top[i + 1]!);
        for (let i = bot.length - 2; i >= 0; i -= 2) c.lineTo(bot[i]!, bot[i + 1]!);
        c.closePath();
        const g = c.createLinearGradient(0, 0, f.w, 0);
        g.addColorStop(0, rgba(A, 0)); g.addColorStop(0.3, rgba(k % 2 ? B : A, f.dark ? 0.4 : 0.3)); g.addColorStop(0.75, rgba(k % 2 ? A : B, f.dark ? 0.34 : 0.26)); g.addColorStop(1, rgba(B, 0));
        c.fillStyle = g; c.fill();
        c.strokeStyle = rgba(k % 2 ? B : A, f.dark ? 0.7 : 0.55); c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(top[0]!, top[1]!);
        for (let i = 2; i < top.length; i += 2) c.lineTo(top[i]!, top[i + 1]!);
        c.stroke();
      }
    },
  };
}

/** Halftone dot matrix: dot radius follows a travelling wave field; the pointer adds a ripple. */
function dots(): Painter {
  return {
    draw(f) {
      const A = accent(f), B = accent2(f), c = f.ctx;
      const step = Math.max(10, Math.round(Math.min(f.w, f.h) / 20));
      const cols = Math.ceil(f.w / step) + 1, rows = Math.ceil(f.h / step) + 1;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = i * step, y = j * step;
        let v = 0.5 + 0.25 * Math.sin(x * 0.018 + f.t * 0.8) + 0.25 * Math.sin(y * 0.022 - f.t * 0.6 + x * 0.006);
        if (f.ptr.inside) { const d = Math.hypot(x - f.ptr.x, y - f.ptr.y); v += 0.5 * Math.sin(d * 0.07 - f.t * 4) * Math.exp(-d / 110); }
        v = Math.max(0, Math.min(1, v));
        const r = (step * 0.46) * v * v;
        if (r < 0.5) continue;
        c.fillStyle = rgba(mix(A, B, smooth(0.55, 1, v)), 0.35 + 0.55 * v);
        c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
      }
    },
  };
}

interface P { x: number; y: number; h: number[]; age: number; life: number; k: number }
/** Particles tracing a slowly evolving noise flow field, drawn as short fading trails. */
function flow(f0: Frame): Painter {
  const R = rng(91);
  let ps: P[] = [];
  const spawn = (f: Frame, p?: P): P => {
    const q = p ?? { x: 0, y: 0, h: [], age: 0, life: 0, k: 0 };
    q.x = R() * f.w; q.y = R() * f.h; q.h = []; q.age = 0; q.life = 3 + R() * 4; q.k = R() < 0.25 ? 1 : 0;
    return q;
  };
  const build = (f: Frame) => { ps = Array.from({ length: Math.max(40, Math.min(220, Math.round((f.w * f.h) / 2600))) }, () => spawn(f)); };
  build(f0);
  return {
    resize: build,
    draw(f) {
      const A = accent(f), B = accent2(f), c = f.ctx, sc = 0.0042;
      c.lineWidth = 1.4; c.lineCap = 'round';
      for (const p of ps) {
        const a = fbm2(p.x * sc, p.y * sc + f.t * 0.05) * 9.4;
        p.x += Math.cos(a) * 80 * f.dt; p.y += Math.sin(a) * 80 * f.dt;
        if (f.ptr.inside) { const dx = p.x - f.ptr.x, dy = p.y - f.ptr.y, d = Math.hypot(dx, dy); if (d < 120 && d > 1) { p.x += (dx / d) * (1 - d / 120) * 90 * f.dt; p.y += (dy / d) * (1 - d / 120) * 90 * f.dt; } }
        p.age += f.dt; p.h.push(p.x, p.y); if (p.h.length > 56) p.h.splice(0, 2);
        if (p.age > p.life || p.x < -20 || p.y < -20 || p.x > f.w + 20 || p.y > f.h + 20) { spawn(f, p); continue; }
        const fade = Math.min(1, p.age / 0.6) * Math.min(1, (p.life - p.age) / 0.8);
        const n = p.h.length / 2;
        for (let i = 1; i < n; i++) {
          c.strokeStyle = rgba(p.k ? B : A, (i / n) * fade * (f.dark ? 0.85 : 0.7));
          c.beginPath(); c.moveTo(p.h[(i - 1) * 2]!, p.h[(i - 1) * 2 + 1]!); c.lineTo(p.h[i * 2]!, p.h[i * 2 + 1]!); c.stroke();
        }
      }
    },
  };
}

export function makeArc(v: ArcVariant, f: Frame): Painter {
  switch (v) {
    case 'signals': return signals(f);
    case 'ribbon': return ribbon();
    case 'dots': return dots();
    case 'flow': return flow(f);
    default: return arc();
  }
}
