/* Pure geometry for the engraved-certificate: guilloche rosettes (hypotrochoids), woven wave bands and a lathe-line background. Everything returns SVG path data. */

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const f = (n: number) => n.toFixed(1);

/** A hypotrochoid rosette fitted into radius `size`. `a`/`b` set the lobe count, `d` the pen offset (bigger = deeper loops). */
export function rosette(cx: number, cy: number, size: number, a: number, b: number, d: number, steps = 1600): string {
  const k = b / gcd(a, b);
  const tmax = Math.PI * 2 * k;
  const s = size / (a - b + d);
  let out = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * tmax;
    const x = (a - b) * Math.cos(t) + d * Math.cos(((a - b) / b) * t);
    const y = (a - b) * Math.sin(t) - d * Math.sin(((a - b) / b) * t);
    out += (i ? 'L' : 'M') + f(cx + x * s) + ' ' + f(cy + y * s);
  }
  return out + 'Z';
}

/** `strands` sine strands along the segment (x0,y0)-(x1,y1), phase-shifted so they weave. */
export function waveBand(x0: number, y0: number, x1: number, y1: number, amp: number, cycles: number, strands: number, phase = 0, steps = 160): string[] {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const out: string[] = [];
  for (let i = 0; i < strands; i++) {
    const ph = phase + (i / strands) * Math.PI * 2;
    let p = '';
    for (let j = 0; j <= steps; j++) {
      const s = j / steps;
      const o = amp * Math.sin(Math.PI * 2 * cycles * s + ph);
      p += (j ? 'L' : 'M') + f(x0 + dx * s + nx * o) + ' ' + f(y0 + dy * s + ny * o);
    }
    out.push(p);
  }
  return out;
}

/** Fine, slowly modulated horizontal lathe lines used as the paper's security background. */
export function latheLines(x0: number, y0: number, x1: number, y1: number, count: number, steps = 90): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const v = i / (count - 1);
    const y = y0 + (y1 - y0) * v;
    let p = '';
    for (let j = 0; j <= steps; j++) {
      const s = j / steps;
      const o = 3.2 * Math.sin(s * 18 + v * 9) + 2.2 * Math.sin(s * 7.3 - v * 5);
      p += (j ? 'L' : 'M') + f(x0 + (x1 - x0) * s) + ' ' + f(y + o);
    }
    out.push(p);
  }
  return out;
}

/** Break text into lines of at most `max` characters on word boundaries. */
export function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}
