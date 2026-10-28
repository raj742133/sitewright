'use client';
import { useId } from 'react';

/* Original fish illustrations for koi-studies: a bent-spine body outline built from a width profile, fins, patches, halftone shading and a pixel mask. */

export interface FishSpec {
  name: string;
  note: string;
  bend: number;
  phase: number;
  /** CSS colour strings (host tokens mixed in the stylesheet via custom properties). */
  base: string;
  patchA: string;
  patchB: string;
  fin: string;
  /** [t along body, side offset 0-1, rx, ry, which patch colour] */
  patches: [number, number, number, number, 0 | 1][];
}

export const FISH: FishSpec[] = [
  { name: 'Ember', note: 'Cream body, two warm saddles', bend: 15, phase: 0.2, base: 'var(--ui-koi-studies-cream)', patchA: 'var(--ui-koi-studies-warm)', patchB: 'var(--ui-koi-studies-cool)', fin: 'var(--ui-koi-studies-cream)',
    patches: [[0.12, 0.2, 9, 8, 0], [0.34, -0.1, 16, 11, 0], [0.55, 0.3, 14, 9, 0], [0.74, -0.2, 9, 6, 1]] },
  { name: 'Tide', note: 'Deep blue back, pale freckles', bend: -18, phase: 1.1, base: 'var(--ui-koi-studies-deep)', patchA: 'var(--ui-koi-studies-cream)', patchB: 'var(--ui-koi-studies-warm)', fin: 'var(--ui-koi-studies-cool)',
    patches: [[0.2, -0.3, 8, 6, 0], [0.38, 0.35, 12, 7, 0], [0.5, -0.2, 6, 5, 1], [0.66, 0.2, 10, 6, 0], [0.82, -0.1, 5, 4, 0]] },
  { name: 'Amber', note: 'Solid gold, quiet fins', bend: 12, phase: 2.3, base: 'var(--ui-koi-studies-gold)', patchA: 'var(--ui-koi-studies-warm)', patchB: 'var(--ui-koi-studies-cream)', fin: 'var(--ui-koi-studies-gold)',
    patches: [[0.1, 0, 7, 5, 1], [0.44, 0.15, 18, 6, 0], [0.7, -0.25, 8, 5, 0]] },
];

const N = 30;
interface P { x: number; y: number; a: number; w: number }
function spine(t: number, f: FishSpec): P {
  const x = (u: number) => 226 - u * 186;
  const y = (u: number) => 100 + f.bend * 1.7 * Math.sin(2.6 * u + f.phase) * (0.25 + u);
  const e = 0.004;
  const dx = x(t + e) - x(t - e);
  const dy = y(t + e) - y(t - e);
  const tt = Math.pow(t, 0.8);
  const w = 30 * Math.sqrt(Math.max(0, 4 * tt * (1 - tt))) * (1 - 0.35 * t) + (t > 0.9 ? 2.2 : 0);
  return { x: x(t), y: y(t), a: Math.atan2(dy, dx), w };
}
const off = (p: P, k: number): [number, number] => [p.x - Math.sin(p.a) * p.w * k, p.y + Math.cos(p.a) * p.w * k];
const fmt = (n: number) => n.toFixed(1);

function bodyPath(f: FishSpec): string {
  const top: string[] = [];
  const bot: string[] = [];
  for (let i = 0; i <= N; i++) {
    const p = spine((i / N) * 0.97, f);
    const [x1, y1] = off(p, 1);
    const [x2, y2] = off(p, -1);
    top.push(`${fmt(x1)} ${fmt(y1)}`);
    bot.push(`${fmt(x2)} ${fmt(y2)}`);
  }
  return `M${top.join('L')}L${bot.reverse().join('L')}Z`;
}
const TAIL = 'M0 0C14 -6 32 -22 52 -34C42 -13 47 -4 38 0C47 4 42 13 52 34C32 22 14 6 0 0Z';
const FIN = 'M0 0C10 -5 26 -3 38 9C24 13 10 8 0 0Z';
const deg = (r: number) => (r * 180) / Math.PI;

/** Draws one fish study on a 250x200 sheet. `swim` animates tail and fins (CSS). */
export function FishArt({ spec, swim }: { spec: FishSpec; swim: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const body = bodyPath(spec);
  const tailP = spine(0.97, spec);
  const head = spine(0.04, spec);
  const pec = spine(0.24, spec);
  const dor = spine(0.55, spec);
  const [pxT, pyT] = off(pec, 0.8);
  const [pxB, pyB] = off(pec, -0.8);
  const spinePts: string[] = [];
  for (let i = 3; i <= N - 2; i++) { const p = spine((i / N) * 0.97, spec); spinePts.push(`${fmt(p.x)} ${fmt(p.y)}`); }
  const [e1x, e1y] = off(head, 0.62);
  const [e2x, e2y] = off(head, -0.62);
  const cells: number[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 10; c++) cells.push(r * 10 + c);

  return (
    <svg viewBox="0 0 250 200" className="ui-koi-studies-art" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <clipPath id={`${uid}c`}><path d={body} /></clipPath>
        <pattern id={`${uid}d`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.45" fill="#0a0f1a" /></pattern>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.55" stopColor="#fff" stopOpacity="0.1" /><stop offset="1" stopColor="#fff" stopOpacity="0.85" /></linearGradient>
        <mask id={`${uid}m`} maskUnits="userSpaceOnUse" x="0" y="0" width="250" height="200"><rect width="250" height="200" fill={`url(#${uid}g)`} /></mask>
        <pattern id={`${uid}w`} width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="9" fill="none" stroke="#fff" strokeOpacity="0.07" /><circle cx="13" cy="13" r="4" fill="none" stroke="#fff" strokeOpacity="0.05" /></pattern>
      </defs>
      <rect width="250" height="200" fill={`url(#${uid}w)`} />
      <g className="ui-koi-studies-shadow" transform="translate(7 11)"><path d={body} /></g>

      <g transform={`translate(${fmt(tailP.x)} ${fmt(tailP.y)}) rotate(${fmt(deg(tailP.a) + 180)}) scale(-1 1)`}>
        <g className={swim ? 'ui-koi-studies-tail is-swim' : 'ui-koi-studies-tail'}><path d={TAIL} fill={spec.fin} opacity="0.9" /></g>
      </g>
      <g transform={`translate(${fmt(dor.x)} ${fmt(dor.y)}) rotate(${fmt(deg(dor.a))})`}><path d="M-14 -2C-6 -5 6 -5 14 -2C6 2 -6 2 -14 -2Z" fill={spec.fin} opacity="0.55" /></g>

      <path d={body} fill={spec.base} />
      <g clipPath={`url(#${uid}c)`}>
        {spec.patches.map(([t, k, rx, ry, c], i) => {
          const p = spine(t, spec);
          const [x, y] = off(p, k);
          return <ellipse key={i} cx={fmt(x)} cy={fmt(y)} rx={rx} ry={ry} transform={`rotate(${fmt(deg(p.a))} ${fmt(x)} ${fmt(y)})`} fill={c ? spec.patchB : spec.patchA} />;
        })}
        <polyline points={spinePts.join(' ')} fill="none" stroke="#000" strokeOpacity="0.14" strokeWidth="2" strokeLinecap="round" />
        <rect width="250" height="200" fill={`url(#${uid}d)`} mask={`url(#${uid}m)`} opacity="0.55" />
      </g>
      <path d={body} fill="none" stroke="#0a0f1a" strokeOpacity="0.35" strokeWidth="1" />
      <g className="ui-koi-studies-fin-l" transform={`translate(${fmt(pxT)} ${fmt(pyT)}) rotate(${fmt(deg(pec.a) - 150)})`}><path d={FIN} fill={spec.fin} fillOpacity="0.88" stroke="#0a0f1a" strokeOpacity="0.25" strokeWidth="0.8" className={swim ? 'is-swim' : ''} /></g>
      <g className="ui-koi-studies-fin-r" transform={`translate(${fmt(pxB)} ${fmt(pyB)}) rotate(${fmt(deg(pec.a) + 150)}) scale(1 -1)`}><path d={FIN} fill={spec.fin} fillOpacity="0.88" stroke="#0a0f1a" strokeOpacity="0.25" strokeWidth="0.8" className={swim ? 'is-swim' : ''} /></g>
      <circle cx={fmt(e1x)} cy={fmt(e1y)} r="2.4" fill="#0a0f1a" /><circle cx={fmt(e2x)} cy={fmt(e2y)} r="2.4" fill="#0a0f1a" />
      <circle cx={fmt(e1x - 0.7)} cy={fmt(e1y - 0.8)} r="0.7" fill="#fff" /><circle cx={fmt(e2x - 0.7)} cy={fmt(e2y - 0.8)} r="0.7" fill="#fff" />

      <g className="ui-koi-studies-pixels">
        {cells.map((i) => <rect key={i} x={(i % 10) * 25} y={Math.floor(i / 10) * 25} width="25.2" height="25.2" style={{ transitionDelay: `${((i * 37) % 23) * 22}ms` }} />)}
      </g>
    </svg>
  );
}
