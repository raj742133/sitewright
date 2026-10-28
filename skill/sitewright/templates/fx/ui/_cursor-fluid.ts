/* A small CPU "stable fluids" solver (velocity + three dye channels) on a coarse grid. Cheap enough for a 70x45 grid every frame; the canvas upscales it smoothly. */

const newF = (n: number) => new Float32Array(n);
type F = ReturnType<typeof newF>;

export class Fluid {
  readonly cols: number; readonly rows: number;
  private readonly n: number; private readonly s: number;
  u: F; v: F; private u0: F; private v0: F;
  dye: F[]; private dye0: F[];
  private p: F; private div: F;

  constructor(cols: number, rows: number) {
    this.cols = cols; this.rows = rows; this.s = cols + 2; this.n = (cols + 2) * (rows + 2);
    const mk = () => newF(this.n);
    this.u = mk(); this.v = mk(); this.u0 = mk(); this.v0 = mk(); this.p = mk(); this.div = mk();
    this.dye = [mk(), mk(), mk()]; this.dye0 = [mk(), mk(), mk()];
  }
  private idx(i: number, j: number) { return j * this.s + i; }

  /** Adds a soft round push and some dye at (x, y) in grid cells. Velocity is in cells per second. */
  splat(x: number, y: number, vx: number, vy: number, rgb: [number, number, number], radius: number, amount: number) {
    const r = Math.ceil(radius * 2.2), cx = Math.round(x), cy = Math.round(y), k = 1 / (radius * radius * 0.6);
    for (let j = Math.max(1, cy - r); j <= Math.min(this.rows, cy + r); j++) for (let i = Math.max(1, cx - r); i <= Math.min(this.cols, cx + r); i++) {
      const w = Math.exp(-((i - x) * (i - x) + (j - y) * (j - y)) * k);
      const a = this.idx(i, j);
      this.u[a]! += vx * w; this.v[a]! += vy * w;
      for (let c = 0; c < 3; c++) this.dye[c]![a]! += rgb[c]! * w * amount;
    }
  }

  private bnd(b: number, x: F) {
    const { cols: C, rows: R } = this;
    for (let i = 1; i <= C; i++) { x[this.idx(i, 0)] = b === 2 ? -x[this.idx(i, 1)]! : x[this.idx(i, 1)]!; x[this.idx(i, R + 1)] = b === 2 ? -x[this.idx(i, R)]! : x[this.idx(i, R)]!; }
    for (let j = 1; j <= R; j++) { x[this.idx(0, j)] = b === 1 ? -x[this.idx(1, j)]! : x[this.idx(1, j)]!; x[this.idx(C + 1, j)] = b === 1 ? -x[this.idx(C, j)]! : x[this.idx(C, j)]!; }
  }
  private advect(b: number, d: F, d0: F, u: F, v: F, dt: number) {
    const { cols: C, rows: R } = this;
    for (let j = 1; j <= R; j++) for (let i = 1; i <= C; i++) {
      const a = this.idx(i, j);
      const x = Math.min(C + 0.5, Math.max(0.5, i - dt * u[a]!)), y = Math.min(R + 0.5, Math.max(0.5, j - dt * v[a]!));
      const i0 = Math.floor(x), j0 = Math.floor(y), s1 = x - i0, t1 = y - j0;
      d[a] = (1 - s1) * ((1 - t1) * d0[this.idx(i0, j0)]! + t1 * d0[this.idx(i0, j0 + 1)]!) + s1 * ((1 - t1) * d0[this.idx(i0 + 1, j0)]! + t1 * d0[this.idx(i0 + 1, j0 + 1)]!);
    }
    this.bnd(b, d);
  }
  private project(iters: number) {
    const { cols: C, rows: R, u, v, p, div } = this;
    for (let j = 1; j <= R; j++) for (let i = 1; i <= C; i++) {
      div[this.idx(i, j)] = -0.5 * (u[this.idx(i + 1, j)]! - u[this.idx(i - 1, j)]! + v[this.idx(i, j + 1)]! - v[this.idx(i, j - 1)]!);
      p[this.idx(i, j)] = 0;
    }
    this.bnd(0, div); this.bnd(0, p);
    for (let k = 0; k < iters; k++) {
      for (let j = 1; j <= R; j++) for (let i = 1; i <= C; i++) p[this.idx(i, j)] = (div[this.idx(i, j)]! + p[this.idx(i - 1, j)]! + p[this.idx(i + 1, j)]! + p[this.idx(i, j - 1)]! + p[this.idx(i, j + 1)]!) / 4;
      this.bnd(0, p);
    }
    for (let j = 1; j <= R; j++) for (let i = 1; i <= C; i++) {
      u[this.idx(i, j)]! -= 0.5 * (p[this.idx(i + 1, j)]! - p[this.idx(i - 1, j)]!);
      v[this.idx(i, j)]! -= 0.5 * (p[this.idx(i, j + 1)]! - p[this.idx(i, j - 1)]!);
    }
    this.bnd(1, u); this.bnd(2, v);
  }

  /** Advances the simulation by dt seconds. `drag` and `fadeRate` are per-second decay rates for velocity and dye. */
  step(dt: number, drag = 1.1, fadeRate = 0.85) {
    const vd = Math.exp(-drag * dt), dd = Math.exp(-fadeRate * dt);
    this.project(10);
    [this.u0, this.u] = [this.u, this.u0]; [this.v0, this.v] = [this.v, this.v0];
    this.advect(1, this.u, this.u0, this.u0, this.v0, dt); this.advect(2, this.v, this.v0, this.u0, this.v0, dt);
    this.project(10);
    for (let a = 0; a < this.n; a++) { this.u[a]! *= vd; this.v[a]! *= vd; }
    for (let c = 0; c < 3; c++) {
      [this.dye0[c], this.dye[c]] = [this.dye[c]!, this.dye0[c]!];
      this.advect(0, this.dye[c]!, this.dye0[c]!, this.u, this.v, dt);
      const d = this.dye[c]!;
      for (let a = 0; a < this.n; a++) d[a]! *= dd;
    }
  }

  /** Writes the dye into RGBA bytes (cols x rows) and returns the strongest channel value, to know when it is empty. */
  paint(out: Uint8ClampedArray): number {
    let peak = 0;
    for (let j = 1; j <= this.rows; j++) for (let i = 1; i <= this.cols; i++) {
      const a = this.idx(i, j), r = this.dye[0]![a]!, g = this.dye[1]![a]!, b = this.dye[2]![a]!;
      const m = Math.max(r, g, b);
      if (m > peak) peak = m;
      const o = ((j - 1) * this.cols + (i - 1)) * 4;
      if (m < 0.003) { out[o + 3] = 0; continue; }
      out[o] = (r / m) * 255; out[o + 1] = (g / m) * 255; out[o + 2] = (b / m) * 255;
      out[o + 3] = (1 - Math.exp(-m * 2.4)) * 235;
    }
    return peak;
  }
}
