import type { Frame, Painter } from './_bg-c-canvas';
import { rng } from './_bg-c-canvas';
import { rgba } from './_t2';
import { accent, accent2, neutral } from './_tu-bg-kit';

export type ConstellationVariant = 'network' | 'stars' | 'lattice' | 'orbits';

interface Node { x: number; y: number; vx: number; vy: number; r: number; k: number }

function line(f: Frame, x1: number, y1: number, x2: number, y2: number, col: string, w = 1) {
  const c = f.ctx;
  c.strokeStyle = col; c.lineWidth = w;
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
}
function dot(f: Frame, x: number, y: number, r: number, col: string) {
  f.ctx.fillStyle = col; f.ctx.beginPath(); f.ctx.arc(x, y, r, 0, 6.2832); f.ctx.fill();
}

/** Drifting particles, linked when close; the pointer pulls nearby nodes and joins them with extra links. */
function network(f0: Frame, density: number): Painter {
  const R = rng(11);
  let nodes: Node[] = [];
  const build = (f: Frame) => {
    const n = Math.max(14, Math.min(150, Math.round((f.w * f.h) / 9500 * density)));
    nodes = Array.from({ length: n }, () => {
      const a = R() * 6.283, s = 6 + R() * 16;
      return { x: R() * f.w, y: R() * f.h, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 1.2 + R() * 1.6, k: R() < 0.18 ? 1 : 0 };
    });
  };
  build(f0);
  return {
    resize: build,
    draw(f) {
      const L = Math.min(150, Math.max(80, Math.min(f.w, f.h) * 0.3)), L2 = L * L;
      const A = accent(f), B = accent2(f), N = neutral(f);
      for (const n of nodes) {
        if (f.ptr.inside) {
          const dx = f.ptr.x - n.x, dy = f.ptr.y - n.y, d2 = dx * dx + dy * dy;
          if (d2 < 190 * 190 && d2 > 1) { const k = (1 - Math.sqrt(d2) / 190) * 60 * f.dt; n.vx += (dx / Math.sqrt(d2)) * k; n.vy += (dy / Math.sqrt(d2)) * k; }
        }
        const sp = Math.hypot(n.vx, n.vy);
        if (sp > 26) { n.vx *= 26 / sp; n.vy *= 26 / sp; }
        n.x += n.vx * f.dt; n.y += n.vy * f.dt;
        if (n.x < -10) n.x = f.w + 10; else if (n.x > f.w + 10) n.x = -10;
        if (n.y < -10) n.y = f.h + 10; else if (n.y > f.h + 10) n.y = -10;
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]!, dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < L2) line(f, a.x, a.y, b.x, b.y, rgba(a.k || b.k ? B : N, (1 - d2 / L2) * (f.dark ? 0.38 : 0.3)));
        }
        if (f.ptr.inside) {
          const dx = a.x - f.ptr.x, dy = a.y - f.ptr.y, d2 = dx * dx + dy * dy;
          if (d2 < 170 * 170) line(f, a.x, a.y, f.ptr.x, f.ptr.y, rgba(A, (1 - d2 / (170 * 170)) * 0.6), 1.2);
        }
      }
      for (const n of nodes) dot(f, n.x, n.y, n.r, rgba(n.k ? B : A, 0.9));
    },
  };
}

interface Star { x: number; y: number; z: number; ph: number; b: number }
/** A parallax sky: twinkling stars, a fixed constellation drawn between the brightest, and the odd shooting star. */
function stars(f0: Frame, density: number): Painter {
  const R = rng(23);
  const list: Star[] = Array.from({ length: Math.round(170 * density) }, () => ({ x: R(), y: R(), z: 0.15 + R() * 0.85, ph: R() * 6.28, b: R() }));
  const bright = list.filter((s) => s.b > 0.82).slice(0, 16);
  const links: [Star, Star][] = [];
  bright.forEach((s, i) => {
    let best: Star | null = null, bd = 9;
    bright.forEach((o, j) => { if (j === i) return; const d = Math.hypot(o.x - s.x, (o.y - s.y) * 0.6); if (d < bd && d > 0.03) { bd = d; best = o; } });
    if (best && !links.some(([a, b]) => (a === s && b === best) || (a === best && b === s))) links.push([s, best]);
  });
  let shoot = { t: -1, x: 0, y: 0, a: 0 }, nextShoot = 2.2;
  void f0;
  return {
    draw(f) {
      const A = accent(f), B = accent2(f), N = neutral(f);
      const px = f.ptr.inside ? (f.ptr.x / f.w - 0.5) : 0, py = f.ptr.inside ? (f.ptr.y / f.h - 0.5) : 0;
      const drift = (f.t * 0.004) % 1;
      const pos = (s: Star): [number, number] => [((s.x + drift * s.z + 2 - px * 0.04 * s.z) % 1) * f.w, (s.y - py * 0.04 * s.z + 1) % 1 * f.h];
      for (const [a, b] of links) {
        const [x1, y1] = pos(a), [x2, y2] = pos(b);
        if (Math.abs(x1 - x2) < f.w * 0.5) line(f, x1, y1, x2, y2, rgba(A, f.dark ? 0.32 : 0.28), 1);
      }
      for (const s of list) {
        const [x, y] = pos(s);
        const tw = 0.6 + 0.4 * Math.sin(f.t * (0.8 + s.z * 1.4) + s.ph);
        const col = s.b > 0.9 ? B : s.b > 0.45 ? A : N;
        dot(f, x, y, (0.5 + s.z * 1.1 + (s.b > 0.82 ? 0.9 : 0)), rgba(col, (f.dark ? 0.85 : 0.7) * tw * (0.45 + s.z * 0.55)));
      }
      if (!f.reduced) {
        if (shoot.t < 0 && f.t > nextShoot) { const R2 = (f.t * 997) % 1; shoot = { t: 0, x: f.w * (0.15 + R2 * 0.6), y: f.h * (0.05 + ((f.t * 31) % 1) * 0.3), a: 0.5 + R2 * 0.3 }; }
        if (shoot.t >= 0) {
          shoot.t += f.dt;
          const k = shoot.t / 1.1, hx = shoot.x + Math.cos(shoot.a) * k * f.w * 0.4, hy = shoot.y + Math.sin(shoot.a) * k * f.w * 0.4;
          const g = f.ctx.createLinearGradient(hx, hy, hx - Math.cos(shoot.a) * 90, hy - Math.sin(shoot.a) * 90);
          g.addColorStop(0, rgba(B, 0.95)); g.addColorStop(1, rgba(B, 0));
          line(f, hx, hy, hx - Math.cos(shoot.a) * 90, hy - Math.sin(shoot.a) * 90, g as unknown as string, 1.6);
          if (k >= 1) { shoot.t = -1; nextShoot = f.t + 3.5 + ((f.t * 13) % 1) * 3; }
        }
      }
    },
  };
}

/** A spring lattice: every node rests on a grid, ripples travel through it, the pointer shoves it aside. */
function lattice(f0: Frame, density: number): Painter {
  let cols = 0, rows = 0, gap = 56, ox = 0, oy = 0;
  let px: number[] = [], py: number[] = [], vx: number[] = [], vy: number[] = [];
  const build = (f: Frame) => {
    gap = Math.max(34, 62 / Math.sqrt(density));
    cols = Math.ceil(f.w / gap) + 2; rows = Math.ceil(f.h / gap) + 2;
    ox = (f.w - (cols - 1) * gap) / 2; oy = (f.h - (rows - 1) * gap) / 2;
    px = new Array<number>(cols * rows).fill(0); py = new Array<number>(cols * rows).fill(0);
    vx = new Array<number>(cols * rows).fill(0); vy = new Array<number>(cols * rows).fill(0);
  };
  build(f0);
  return {
    resize: build,
    draw(f) {
      const A = accent(f), B = accent2(f), N = neutral(f), dt = Math.min(f.dt, 0.05);
      const at = (i: number, j: number): [number, number, number] => {
        const k = j * cols + i;
        return [ox + i * gap + px[k]!, oy + j * gap + py[k]!, Math.hypot(px[k]!, py[k]!)];
      };
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = j * cols + i, hx = ox + i * gap, hy = oy + j * gap;
        const wave = Math.sin(f.t * 0.9 + i * 0.5 + j * 0.35) * 5;
        let fx = -px[k]! * 24 + Math.cos(f.t * 0.6 + j * 0.7) * 2 * 24 * 0.1 + wave * 0.0;
        let fy = -py[k]! * 24 + wave * 24 * 0.12;
        if (f.ptr.inside) {
          const dx = hx + px[k]! - f.ptr.x, dy = hy + py[k]! - f.ptr.y, d = Math.hypot(dx, dy) + 0.01;
          if (d < 130) { const s = (1 - d / 130) * 1800; fx += (dx / d) * s; fy += (dy / d) * s; }
        }
        vx[k] = (vx[k]! + fx * dt) * Math.exp(-dt * 4.5); vy[k] = (vy[k]! + fy * dt) * Math.exp(-dt * 4.5);
        px[k] = px[k]! + vx[k]! * dt; py[k] = py[k]! + vy[k]! * dt;
      }
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const [x, y, m] = at(i, j), hot = Math.min(1, m / 22);
        const col = hot > 0.3 ? B : N;
        const a = (f.dark ? 0.28 : 0.22) + hot * 0.4;
        if (i + 1 < cols) { const [x2, y2] = at(i + 1, j); line(f, x, y, x2, y2, rgba(col, a)); }
        if (j + 1 < rows) { const [x2, y2] = at(i, j + 1); line(f, x, y, x2, y2, rgba(col, a)); }
        if (i + 1 < cols && j + 1 < rows && (i + j) % 2 === 0) { const [x2, y2] = at(i + 1, j + 1); line(f, x, y, x2, y2, rgba(col, a * 0.5)); }
      }
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const [x, y, m] = at(i, j);
        dot(f, x, y, 1.5 + Math.min(2.5, m / 8), rgba(m > 6 ? B : A, 0.85));
      }
    },
  };
}

interface Hub { x: number; y: number; rings: { rx: number; ry: number; tilt: number; sp: number; n: number; off: number }[] }
/** Hubs with elliptical rings of satellites; satellites link to their neighbours on the ring and to the hub. */
function orbits(f0: Frame, density: number): Painter {
  const R = rng(37);
  const hubs: Hub[] = [[0.28, 0.4], [0.72, 0.62], [0.62, 0.2], [0.14, 0.82]].map(([x, y], hi) => ({
    x: x!, y: y!,
    rings: Array.from({ length: 2 + (hi % 2) }, (_, ri) => ({ rx: 0.1 + ri * 0.075 + R() * 0.02, ry: 0.05 + ri * 0.04, tilt: R() * 3.14, sp: (ri % 2 ? -1 : 1) * (0.18 + R() * 0.18), n: Math.max(4, Math.round((5 + ri * 3) * Math.min(1.5, density))), off: R() * 6.28 })),
  }));
  void f0;
  return {
    draw(f) {
      const A = accent(f), B = accent2(f), N = neutral(f), s = Math.min(f.w, f.h);
      const sx = f.ptr.inside ? (f.ptr.x / f.w - 0.5) * 14 : 0, sy = f.ptr.inside ? (f.ptr.y / f.h - 0.5) * 14 : 0;
      hubs.forEach((h, hi) => {
        const cx = h.x * f.w + sx * (hi % 2 ? 1 : -1), cy = h.y * f.h + sy * (hi % 2 ? 1 : -1);
        h.rings.forEach((r) => {
          const pts: [number, number][] = [];
          for (let i = 0; i < r.n; i++) {
            const a = r.off + f.t * r.sp + (i / r.n) * 6.2832;
            const ex = Math.cos(a) * r.rx * s * 1.5, ey = Math.sin(a) * r.ry * s * 1.5;
            pts.push([cx + ex * Math.cos(r.tilt) - ey * Math.sin(r.tilt), cy + ex * Math.sin(r.tilt) + ey * Math.cos(r.tilt)]);
          }
          f.ctx.strokeStyle = rgba(N, f.dark ? 0.14 : 0.12); f.ctx.lineWidth = 1;
          f.ctx.beginPath(); f.ctx.ellipse(cx, cy, r.rx * s * 1.5, r.ry * s * 1.5, r.tilt, 0, 6.2832); f.ctx.stroke();
          pts.forEach(([x, y], i) => {
            const [x2, y2] = pts[(i + 1) % pts.length]!;
            line(f, x, y, x2, y2, rgba(A, 0.34));
            line(f, x, y, cx, cy, rgba(A, 0.1));
          });
          pts.forEach(([x, y], i) => dot(f, x, y, i % 4 === 0 ? 2.8 : 1.8, rgba(i % 4 === 0 ? B : A, 0.92)));
        });
        const g = f.ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
        g.addColorStop(0, rgba(B, 0.55)); g.addColorStop(1, rgba(B, 0));
        f.ctx.fillStyle = g; f.ctx.beginPath(); f.ctx.arc(cx, cy, 26, 0, 6.2832); f.ctx.fill();
        dot(f, cx, cy, 4, rgba(B, 1));
      });
    },
  };
}

export function makeConstellation(variant: ConstellationVariant, f: Frame, density: number): Painter {
  switch (variant) {
    case 'stars': return stars(f, density);
    case 'lattice': return lattice(f, density);
    case 'orbits': return orbits(f, density);
    default: return network(f, density);
  }
}
