'use client';
import { seeded } from './_ha-kit';

/* Hollowfern page art: a procedural fern, a moss mound, product drawings and the product list. Pure functions of fixed numbers, so
   server and client render the same markup. Colours are CSS variables defined per theme in the page css. */

export interface Product { id: string; name: string; kind: 'mist' | 'balm' | 'wash' | 'dome' | 'packet' | 'mix'; cat: 'Face' | 'Home' | 'Soil'; price: number; note: string; tag: string }
export const PRODUCTS: Product[] = [
  { id: 'mist', name: 'Moss Mist', kind: 'mist', cat: 'Face', price: 28, note: 'A fine hydrating mist of fermented moss and aloe, skin-matched at pH 5.5.', tag: 'Best seller' },
  { id: 'balm', name: 'Fern Balm', kind: 'balm', cat: 'Face', price: 34, note: 'A soft night balm with unfurled-fern extract, shea and a trace of cedar.', tag: 'New batch' },
  { id: 'wash', name: 'Cloud Cleanser', kind: 'wash', cat: 'Face', price: 26, note: 'A pillowy oat and clay cleanser that rinses clean and leaves nothing behind.', tag: 'Refillable' },
  { id: 'dome', name: 'Hollow No. 1', kind: 'dome', cat: 'Home', price: 64, note: 'A glass dome terrarium kit: ferns, live moss, drainage stones and a small instruction card.', tag: 'Living kit' },
  { id: 'packet', name: 'Spore Starter', kind: 'packet', cat: 'Soil', price: 18, note: 'Moss and mycorrhizal starter for a tired pot. Stir in, water gently, wait a week.', tag: 'Living kit' },
  { id: 'mix', name: 'Peat-free Mix', kind: 'mix', cat: 'Soil', price: 14, note: 'Two litres of coir, bark and leaf mould blended for ferns and other shade lovers.', tag: 'Peat free' },
];

/** a fern frond growing up from (0,0): curved stem with paired leaflets, as one path */
function frond(len: number, bend: number, n: number): string {
  const ctrl = { x: bend * len * 0.6, y: -len * 0.55 }, end = { x: bend * len, y: -len };
  const pt = (t: number) => ({ x: 2 * (1 - t) * t * ctrl.x + t * t * end.x, y: 2 * (1 - t) * t * ctrl.y + t * t * end.y });
  const tg = (t: number) => { const dx = 2 * (1 - t) * ctrl.x + 2 * t * (end.x - ctrl.x), dy = 2 * (1 - t) * ctrl.y + 2 * t * (end.y - ctrl.y); const l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l }; };
  let d = `M0,0 Q${ctrl.x.toFixed(1)},${ctrl.y.toFixed(1)} ${end.x.toFixed(1)},${end.y.toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const t = 0.1 + (0.88 * i) / n, p = pt(t), u = tg(t);
    const L = len * 0.2 * Math.sin(Math.PI * Math.min(1, 0.18 + 0.82 * (1 - t) + 0.12)) * (0.45 + 0.55 * (1 - t));
    for (const s of [-1, 1]) {
      const nx = -u.y * s, ny = u.x * s;
      const ex = p.x + (nx * 0.9 + u.x * 0.5) * L, ey = p.y + (ny * 0.9 + u.y * 0.5) * L;
      const mx = p.x + (nx * 0.55 + u.x * 0.05) * L, my = p.y + (ny * 0.55 + u.y * 0.05) * L;
      d += ` M${p.x.toFixed(1)},${p.y.toFixed(1)} Q${(mx + u.x * 6).toFixed(1)},${(my + u.y * 6).toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)} Q${(mx - u.x * 7).toFixed(1)},${(my - u.y * 7).toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }
  }
  return d;
}
const FRONDS = [
  { len: 330, bend: -0.55, n: 15, rot: -28, x: 150, c: 1, delay: 0 },
  { len: 380, bend: 0.4, n: 17, rot: 14, x: 200, c: 0, delay: -2 },
  { len: 300, bend: 0.7, n: 14, rot: 40, x: 240, c: 2, delay: -4 },
  { len: 260, bend: -0.3, n: 12, rot: -6, x: 190, c: 2, delay: -1 },
  { len: 230, bend: 0.2, n: 11, rot: 66, x: 250, c: 1, delay: -3 },
  { len: 215, bend: -0.5, n: 11, rot: -62, x: 140, c: 0, delay: -5 },
].map((f) => ({ ...f, d: frond(f.len, f.bend, f.n) }));
const MOUND = (() => { const r = seeded(31); return Array.from({ length: 70 }, () => ({ x: 20 + r() * 360, y: 468 + r() * 40, r: 3 + r() * 9, c: Math.floor(r() * 3) })); })();
const DEW = [[120, 300], [262, 214], [210, 120], [310, 340], [170, 210]];

/** the hero plant: swaying fern fronds on a moss mound, drawn in SVG */
export function Fern() {
  return (
    <svg className="hlg-fern" viewBox="0 0 400 520" role="img" aria-label="Illustration of green fern fronds growing from a mound of moss">
      <g transform="translate(0 482)">
        {FRONDS.map((f, i) => (
          <g key={i} transform={`translate(${f.x - 200} 0)`}><g className="hlg-sway" style={{ animationDelay: `${f.delay}s`, transform: `rotate(${f.rot}deg)` }}><path className={`hlg-frond hlg-f${f.c}`} d={f.d} /></g></g>
        ))}
      </g>
      <path className="hlg-mound" d="M-10 520 V478 Q60 440 130 458 Q200 424 270 456 Q340 436 410 480 V520 Z" />
      {MOUND.map((m, i) => <circle key={i} className={`hlg-moss hlg-m${m.c}`} cx={m.x} cy={m.y} r={m.r} />)}
      {DEW.map(([x, y], i) => <circle key={i} className="hlg-dew" cx={x} cy={y} r="3.2" style={{ animationDelay: `${i * -1.3}s` }} />)}
    </svg>
  );
}

/** product drawings: small and flat, each in the same three greens */
export function Art({ kind }: { kind: Product['kind'] }) {
  return (
    <svg className="hlg-art" viewBox="0 0 160 140" aria-hidden="true">
      <ellipse className="hlg-a-shadow" cx="80" cy="128" rx="46" ry="6" />
      {kind === 'mist' && <><rect className="hlg-a-glass" x="56" y="50" width="48" height="74" rx="14" /><rect className="hlg-a-liquid" x="60" y="82" width="40" height="38" rx="10" /><rect className="hlg-a-cap" x="68" y="34" width="24" height="18" rx="4" /><path className="hlg-a-cap" d="M72 34h22l4-8h-14z" /><circle className="hlg-a-leaf" cx="80" cy="102" r="6" /></>}
      {kind === 'balm' && <><rect className="hlg-a-glass" x="34" y="78" width="92" height="46" rx="12" /><ellipse className="hlg-a-liquid" cx="80" cy="78" rx="46" ry="12" /><rect className="hlg-a-cap" x="38" y="62" width="84" height="18" rx="9" /><path className="hlg-a-leaf" d="M80 100c-10-14 4-22 12-18-2 12-6 16-12 18z" /></>}
      {kind === 'wash' && <><rect className="hlg-a-glass" x="52" y="44" width="56" height="80" rx="16" /><rect className="hlg-a-liquid" x="52" y="70" width="56" height="54" rx="16" /><rect className="hlg-a-cap" x="68" y="26" width="24" height="20" rx="5" /><path className="hlg-a-leaf" d="M70 98c4-12 14-14 20-12-1 10-8 16-20 12z" /></>}
      {kind === 'dome' && <><path className="hlg-a-glass" d="M30 120 V80 A50 50 0 0 1 130 80 V120 Z" /><path className="hlg-a-liquid" d="M30 120v-14q50-14 100 0v14z" /><path className="hlg-a-leaf" d="M80 108q-24-30-6-54 6 24 6 54zM80 108q22-26 12-50-14 22-12 50z" /><circle className="hlg-a-cap" cx="58" cy="108" r="7" /><circle className="hlg-a-cap" cx="106" cy="110" r="5" /></>}
      {kind === 'packet' && <><path className="hlg-a-glass" d="M46 32h68l4 92H42z" /><path className="hlg-a-cap" d="M46 32h68l1 12H45z" /><circle className="hlg-a-liquid" cx="80" cy="80" r="22" /><path className="hlg-a-leaf" d="M80 96c-10-10-8-22 0-30 8 8 10 20 0 30z" /></>}
      {kind === 'mix' && <><path className="hlg-a-glass" d="M40 46q40-10 80 0l6 78H34z" /><path className="hlg-a-cap" d="M40 46q40-10 80 0l1 14q-41-9-82 0z" /><rect className="hlg-a-liquid" x="58" y="76" width="44" height="30" rx="8" /><circle className="hlg-a-leaf" cx="80" cy="91" r="7" /></>}
    </svg>
  );
}

export const LeafMark = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 19c0-8 4-13 14-14 0 9-4 14-12 14M5 19c3-4 6-7 10-9" /></svg>;
