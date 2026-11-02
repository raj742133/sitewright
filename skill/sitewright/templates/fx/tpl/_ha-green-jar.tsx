'use client';
import { useEffect, useId, useState } from 'react';
import MossForestWorld from '../ui/MossForestWorld';
import { lensMap } from '../ui/_inputs-lensmap';
import { seeded } from './_ha-kit';
import { frond } from './_ha-green-art';

/* The hero object: a glass terrarium on a chrome base, built from layers. Inside the dome a miniature forest (the library's
   MossForestWorld) sits behind soil strata, a moss bed, amber mushrooms and swaying ferns; an SVG displacement map bends the
   interior at the rim like thick glass; on top come specular streaks, condensation and running drops. Every layer is plain markup
   or one canvas, so the same picture renders on the server and without WebGL. Pointer and scroll only set CSS variables. */

const VB_W = 500, VB_H = 520;
type Fr = { x: number; y: number; len: number; bend: number; n: number; rot: number; c: 0 | 1 | 2; d: number };
const mk = (f: Omit<Fr, 'x' | 'y'> & { x: number; y: number }) => ({ ...f, p: frond(f.len, f.bend, f.n) });
const BACK = [
  mk({ x: 96, y: 452, len: 150, bend: -0.5, n: 11, rot: -24, c: 0, d: 0 }), mk({ x: 168, y: 446, len: 190, bend: 0.3, n: 13, rot: 8, c: 0, d: -2 }),
  mk({ x: 340, y: 448, len: 175, bend: -0.2, n: 12, rot: -6, c: 0, d: -3 }), mk({ x: 410, y: 452, len: 140, bend: 0.55, n: 10, rot: 30, c: 0, d: -1 }),
];
const FRONT = [
  mk({ x: 112, y: 468, len: 270, bend: -0.52, n: 15, rot: -18, c: 1, d: 0 }), mk({ x: 214, y: 470, len: 330, bend: 0.34, n: 17, rot: 10, c: 2, d: -2.2 }),
  mk({ x: 318, y: 472, len: 238, bend: 0.62, n: 14, rot: 34, c: 1, d: -4 }), mk({ x: 404, y: 474, len: 210, bend: -0.4, n: 12, rot: -30, c: 2, d: -1.2 }),
  mk({ x: 262, y: 478, len: 168, bend: 0.1, n: 11, rot: 54, c: 2, d: -3 }), mk({ x: 160, y: 480, len: 150, bend: -0.2, n: 10, rot: -58, c: 1, d: -5 }),
];
const STONES = (() => { const r = seeded(7); return Array.from({ length: 26 }, () => ({ x: 8 + r() * 484, y: 492 + r() * 22, rx: 4 + r() * 9, ry: 3 + r() * 5, k: Math.floor(r() * 3) })); })();
const CLUMPS = (() => { const r = seeded(31); return Array.from({ length: 120 }, () => { const x = 10 + r() * 480; return { x, y: 452 - Math.sin((x / 500) * Math.PI) * 18 + r() * 34, r: 3 + r() * 8, c: Math.floor(r() * 3) }; }); })();
const DROPS = (() => { const r = seeded(11); return Array.from({ length: 54 }, () => { const a = r() * Math.PI, rad = 70 + r() * 190; return { x: 250 + Math.cos(a) * rad * 0.92, y: 262 - Math.sin(a) * rad * 0.9 + r() * 40, r: 1.3 + r() * r() * 6.5 }; }); })();
const MUSH = [{ x: 62, y: 456, s: 1.1, d: 0 }, { x: 94, y: 466, s: 0.72, d: -1.4 }, { x: 436, y: 462, s: 0.9, d: -2.6 }];

/** hairline callouts: anchor point on the object (percent of the stage) and which side the label goes to */
export const CALLS = [
  { n: '01', h: 'Maidenhair fern', p: 'Planted by hand, one frond at a time', ax: 33, ay: 27, side: 'l', len: 176 },
  { n: '02', h: 'Breathing glass', p: 'It fogs at dawn and clears by noon', ax: 79, ay: 21, side: 'r', len: 150 },
  { n: '03', h: 'Nine-week moss bed', p: 'Fermented in glass, never extracted', ax: 21, ay: 72, side: 'l', len: 150 },
  { n: '04', h: 'Chrome base', p: 'Send it back and we refill it', ax: 84, ay: 92, side: 'r', len: 134 },
] as const;

function Fronds({ list, cls }: { list: typeof FRONT; cls: string }) {
  return (
    <>
      {list.map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.rot})`}>
          <g className={`hlg-sway ${cls}`} style={{ animationDelay: `${f.d}s` }}><path className={`hlg-frond hlg-f${f.c}`} d={f.p} /></g>
        </g>
      ))}
    </>
  );
}

/** the terrarium; `stage` styles come from the page css (--jar-h) and --px/--py are set by the atmosphere loop */
export function Terrarium() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [map, setMap] = useState('');
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!node) return;
    const fit = () => setBox({ w: Math.round(node.clientWidth), h: Math.round(node.clientHeight) });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);
  useEffect(() => {
    if (!box || box.w < 40) return;
    const t = window.setTimeout(() => setMap(lensMap(box.w, box.h, box.w / 2, Math.min(box.w, box.h) * 0.12)), 60);
    return () => window.clearTimeout(t);
  }, [box]);
  const fid = `hlg-rf-${uid}`;
  return (
    <div className="hlg-jar">
      <div className="hlg-halo" aria-hidden="true" />
      <div className="hlg-rig">
        <div className="hlg-floor" aria-hidden="true"><i className="hlg-contact" /><i className="hlg-caustic" /></div>
        <div ref={setNode} className="hlg-dome" role="img" aria-label="A glass terrarium: a miniature forest of moss, ferns and amber mushrooms growing under a dome of fogged glass">
          {map && (
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
              <filter id={fid} x="0" y="0" width={box!.w} height={box!.h} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feImage href={map} x="0" y="0" width={box!.w} height={box!.h} result="m" preserveAspectRatio="none" />
                <feDisplacementMap in="SourceGraphic" in2="m" scale="30" xChannelSelector="R" yChannelSelector="G" result="g" />
                <feDisplacementMap in="SourceGraphic" in2="m" scale="38" xChannelSelector="R" yChannelSelector="G" result="b" />
                <feColorMatrix in="g" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="rg" />
                <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bb" />
                <feComposite in="rg" in2="bb" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
              </filter>
            </svg>
          )}
          <div className="hlg-inner" style={map ? { filter: `url(#${fid})` } : undefined} aria-hidden="true">
            <div className="hlg-lyr hlg-l-far"><MossForestWorld variant="moss" density={0.7} /></div>
            <div className="hlg-rays" />
            <svg className="hlg-lyr hlg-l-back" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMax slice" focusable="false"><Fronds list={BACK} cls="hlg-sw-s" /></svg>
            <svg className="hlg-lyr hlg-l-front" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMax slice" focusable="false">
              <defs>
                <linearGradient id={`${fid}-s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--hg-soil0)" /><stop offset="1" stopColor="var(--hg-soil1)" /></linearGradient>
                <radialGradient id={`${fid}-k`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="var(--hg-stone0)" /><stop offset="1" stopColor="var(--hg-stone1)" /></radialGradient>
                <radialGradient id={`${fid}-c`} cx=".4" cy=".3" r=".8"><stop offset="0" stopColor="var(--hg-amber-lit)" /><stop offset="1" stopColor="var(--hg-amber)" /></radialGradient>
              </defs>
              <path d="M0 470 Q70 458 140 466 T290 462 T420 468 T500 458 V520 H0Z" fill={`url(#${fid}-s)`} />
              {STONES.map((s, i) => <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} fill={`url(#${fid}-k)`} opacity={s.k === 2 ? 0.55 : 0.9} />)}
              <path className="hlg-mound" d="M0 480 Q40 440 110 452 Q170 424 240 446 Q320 420 390 446 Q450 434 500 470 V500 H0Z" />
              {CLUMPS.map((m, i) => <circle key={i} className={`hlg-m${m.c}`} cx={m.x} cy={m.y} r={m.r} />)}
              <Fronds list={FRONT} cls="" />
              {MUSH.map((m, i) => (
                <g key={i} transform={`translate(${m.x} ${m.y}) scale(${m.s})`} className="hlg-mush" style={{ animationDelay: `${m.d}s` }}>
                  <path d="M-3 0 Q-4 -16 -2 -22 H3 Q5 -16 4 0Z" fill="var(--hg-cream)" /><path d="M-17 -20 Q-16 -42 0 -43 Q16 -42 17 -20 Q0 -15 -17 -20Z" fill={`url(#${fid}-c)`} />
                  <circle cx="-5" cy="-33" r="2.2" fill="var(--hg-cream)" opacity=".8" /><circle cx="6" cy="-29" r="1.6" fill="var(--hg-cream)" opacity=".7" />
                </g>
              ))}
              {[[132, 330], [236, 214], [352, 322], [300, 258]].map(([x, y], i) => <circle key={i} className="hlg-dew" cx={x} cy={y} r="3" style={{ animationDelay: `${i * -1.3}s` }} />)}
            </svg>
          </div>
          <div className="hlg-glass" aria-hidden="true">
            <i className="hlg-sp hlg-sp-l" /><i className="hlg-sp hlg-sp-w" /><i className="hlg-sp hlg-sp-r" /><i className="hlg-sp hlg-sp-s" />
            <svg className="hlg-drops" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMax slice" focusable="false">
              {DROPS.map((d, i) => (
                <g key={i}><circle cx={d.x} cy={d.y} r={d.r} className="hlg-dr" /><circle cx={d.x - d.r * 0.3} cy={d.y - d.r * 0.34} r={Math.max(0.6, d.r * 0.26)} className="hlg-drh" /></g>
              ))}
              {[[176, 78, 0], [342, 120, -3.5], [118, 210, -6.5]].map(([x, y, dl], i) => (
                <g key={i} className="hlg-run" style={{ animationDelay: `${dl}s` }}><path d={`M${x} ${y} v-46`} className="hlg-trail" /><circle cx={x} cy={y} r="5.4" className="hlg-dr" /><circle cx={x - 1.6} cy={y - 2} r="1.5" className="hlg-drh" /></g>
              ))}
            </svg>
          </div>
        </div>
        <i className="hlg-knob" aria-hidden="true" />
        <div className="hlg-base" aria-hidden="true"><i className="hlg-base-top" /><div className="hlg-base-band"><span>Hollow N° 1 · batch 060</span></div></div>
      </div>
      <ul className="hlg-pins" aria-hidden="true">{CALLS.map((c) => <li key={c.n} style={{ left: `${c.ax}%`, top: `${c.ay}%` }}><b>{c.n.slice(1)}</b></li>)}</ul>
      <ul className="hlg-calls" aria-label="What is inside the jar">
        {CALLS.map((c, i) => (
          <li key={c.n} data-side={c.side} style={{ '--ax': `${c.ax}%`, '--ay': `${c.ay}%`, '--len': `${c.len}px`, '--i': i } as React.CSSProperties}>
            <span className="hlg-call-n" aria-hidden="true">{c.n}</span><b>{c.h}</b><span className="hlg-call-p">{c.p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
