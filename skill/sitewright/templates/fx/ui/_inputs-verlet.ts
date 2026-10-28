/** A tiny verlet rope + hanging card solver (no dependencies). Units are px; y grows downward. */
export interface Pt { x: number; y: number; px: number; py: number; pin?: boolean }
export interface Rig {
  rope: Pt[];       // anchor ... attach
  tail: Pt;         // second point of the card (its centre), kept a fixed distance from the attach point
  seg: number;      // rope segment length
  cardLen: number;  // distance attach -> card centre
}
export function makeRig(ax: number, ay: number, ropeLen: number, cardLen: number, n = 9): Rig {
  const seg = ropeLen / n;
  const rope: Pt[] = Array.from({ length: n + 1 }, (_, i) => ({ x: ax, y: ay + seg * i, px: ax, py: ay + seg * i, pin: i === 0 }));
  const a = rope[n] as Pt;
  return { rope, seg, cardLen, tail: { x: ax, y: a.y + cardLen, px: ax, py: a.y + cardLen } };
}
function keep(a: Pt, b: Pt, len: number, wa: number, wb: number) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1e-6;
  const f = (d - len) / d;
  const s = wa + wb || 1;
  a.x += dx * f * (wa / s); a.y += dy * f * (wa / s);
  b.x -= dx * f * (wb / s); b.y -= dy * f * (wb / s);
}
/** Advance the rig one step. `grab` pulls the card centre toward a point. Returns total kinetic energy (for sleeping). */
export function stepRig(r: Rig, ax: number, ay: number, grab: { x: number; y: number } | null, g = 0.55, damp = 0.992): number {
  const pts: Pt[] = [...r.rope, r.tail];
  const first = r.rope[0] as Pt;
  first.x = first.px = ax; first.y = first.py = ay;
  let e = 0;
  for (const p of pts) {
    if (p.pin) continue;
    const vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
    e += vx * vx + vy * vy;
    p.px = p.x; p.py = p.y;
    p.x += vx; p.y += vy + g;
  }
  const n = r.rope.length - 1;
  const att = r.rope[n] as Pt;
  for (let it = 0; it < 12; it++) {
    for (let i = 0; i < n; i++) {
      const a = r.rope[i] as Pt, b = r.rope[i + 1] as Pt;
      keep(a, b, r.seg, a.pin ? 0 : 1, 1);
    }
    // the card: attach point and centre are rigid; the centre is heavier so the card hangs straight
    keep(att, r.tail, r.cardLen, 1, 1.4);
    if (grab) {
      const dx = grab.x - r.tail.x, dy = grab.y - r.tail.y;
      r.tail.x += dx * 0.35; r.tail.y += dy * 0.35;
    }
    first.x = ax; first.y = ay;
  }
  return e;
}
