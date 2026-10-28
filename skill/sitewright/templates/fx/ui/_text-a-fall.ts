import { seeded } from './_text-a-kit';

/* Tiny physics for FallingText: gravity, a floor, bounces and a heightmap so words pile up instead of overlapping. */

export interface Body {
  el: HTMLElement;
  x: number; y0: number; w: number; h: number;
  y: number; vy: number; rot: number; vr: number;
  rest: number; restRot: number;
  delay: number;
  phase: 'wait' | 'fall' | 'bounce' | 'rest';
}

const BIN = 4;
const G = 2400;

export class Pile {
  private bins: Float32Array;
  constructor(public width: number, public floor: number) { this.bins = new Float32Array(Math.ceil(width / BIN) + 1); }
  private span(x: number, w: number): [number, number] {
    return [Math.max(0, Math.floor(x / BIN)), Math.min(this.bins.length - 1, Math.floor((x + w) / BIN))];
  }
  /** Y of the highest thing under the given horizontal span. */
  surface(x: number, w: number): number {
    const [a, b] = this.span(x, w);
    let m = 0;
    for (let i = a; i <= b; i++) m = Math.max(m, this.bins[i] ?? 0);
    return this.floor - m;
  }
  raise(x: number, w: number, top: number) {
    const [a, b] = this.span(x, w);
    const h = this.floor - top;
    for (let i = a; i <= b; i++) this.bins[i] = Math.max(this.bins[i] ?? 0, h);
  }
}

export function makeBodies(els: HTMLElement[], root: DOMRect, seed = 7): Body[] {
  const rnd = seeded(seed);
  const rows = new Set<number>();
  const rects = els.map((el) => { const r = el.getBoundingClientRect(); rows.add(Math.round(r.top)); return r; });
  const sorted = [...rows].sort((a, b) => b - a);
  return els.map((el, i) => {
    const r = rects[i]!;
    const row = sorted.indexOf(Math.round(r.top));
    return {
      el, x: r.left - root.left, y0: r.top - root.top, w: r.width, h: r.height,
      y: 0, vy: 0, rot: 0, vr: (rnd() - 0.5) * 140, rest: 0, restRot: (rnd() - 0.5) * 7,
      delay: row * 0.09 + rnd() * 0.22, phase: 'wait',
    };
  });
}

/** Advances every body by dt seconds. Returns true while something is still moving. */
export function stepBodies(bodies: Body[], pile: Pile, dt: number, elapsed: number): boolean {
  let moving = false;
  for (const b of bodies) {
    if (b.phase === 'rest') continue;
    moving = true;
    if (b.phase === 'wait') { if (elapsed >= b.delay) b.phase = 'fall'; else continue; }
    if (b.phase === 'fall') {
      b.vy += G * dt;
      b.y += b.vy * dt;
      b.rot += b.vr * dt;
      const surf = pile.surface(b.x, b.w);
      if (b.y0 + b.y + b.h >= surf) {
        const restY = Math.max(0, surf - (b.y0 + b.h));
        b.rest = restY;
        b.y = restY;
        pile.raise(b.x, b.w, b.y0 + restY);
        b.vy = -b.vy * 0.3;
        b.vr *= 0.4;
        b.phase = 'bounce';
      }
    } else {
      b.vy += G * dt;
      b.y += b.vy * dt;
      b.rot += (b.restRot - b.rot) * Math.min(1, dt * 7) + b.vr * dt;
      b.vr *= Math.pow(0.02, dt);
      if (b.y >= b.rest) {
        b.y = b.rest;
        if (Math.abs(b.vy) < 90) { b.vy = 0; b.phase = 'rest'; b.rot = b.restRot; }
        else b.vy = -b.vy * 0.3;
      }
    }
  }
  return moving;
}

export function paint(bodies: Body[]) {
  for (const b of bodies) {
    b.el.style.transform = b.phase === 'wait' ? '' : `translate3d(0,${b.y.toFixed(1)}px,0) rotate(${b.rot.toFixed(1)}deg)`;
  }
}
