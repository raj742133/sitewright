'use client';
import { memo, type ReactNode } from 'react';

/* Invented pencil-and-wash sketches for page-curl-book, drawn as SVG on a 400x300 sheet. */

export interface SketchPage { title: string; alt: string; art: () => ReactNode }

const hatch = (x: number, y: number, w: number, h: number, gap: number, lean = 6) => {
  const out: string[] = [];
  for (let i = 0; x + i * gap < x + w + lean; i++) {
    const sx = x + i * gap;
    out.push(`M${sx} ${y + h}L${Math.min(sx + lean, x + w)} ${y}`);
  }
  return out.join('');
};
const P = ({ d, wash, w = 1.5 }: { d: string; wash?: 'a' | 'b' | 'c'; w?: number }) => (
  <path d={d} className={`ui-page-curl-book-ink${wash ? ` is-wash-${wash}` : ''}`} strokeWidth={w} />
);

function Harbour() {
  const water: string[] = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) { const x = 20 + c * 62 + (r % 2) * 28, y = 190 + r * 14; water.push(`M${x} ${y}h${22 + ((r + c) % 3) * 8}`); }
  return (
    <>
      <circle cx="292" cy="118" r="34" className="ui-page-curl-book-fill is-wash-b" />
      <P d="M20 170H380" w={1.8} />
      <P d="M88 170L96 60h14l8 110" wash="c" /><P d="M92 82h22M90 104h26M96 60l7-14 7 14" /><P d="M96 128h18" />
      <P d={water.join('')} w={1} />
      <P d="M170 196q40 22 100 0l-14 -16h-72z" wash="a" /><P d="M220 180V110M220 114l40 56h-40M216 120l-30 48h30" /><P d="M220 110l12 6-12 4" />
      <P d="M286 224q26 14 62 0l-8 -10h-44z" /><P d="M316 214v-36l20 36" />
      <P d={hatch(20, 172, 360, 14, 7, 5)} w={0.7} />
    </>
  );
}
function Fern() {
  const leaves: string[] = [];
  for (let i = 1; i <= 11; i++) {
    const t = i / 12, x = 110 + t * 190, y = 250 - Math.sin(t * 2.4) * 120 + t * 10, l = 40 * (1 - t * 0.7);
    leaves.push(`M${x} ${y}q${l * 0.4} ${-l} ${l} ${-l * 0.5}q${-l * 0.5} ${l * 0.7} ${-l} ${l * 0.5}`, `M${x} ${y}q${-l * 0.2} ${l} ${-l * 0.9} ${l * 0.7}q${l * 0.6} ${-l * 0.2} ${l * 0.9} ${-l * 0.7}`);
  }
  return (
    <>
      <P d="M110 250Q170 120 300 135" w={2} />
      <P d={leaves.join('')} wash="c" w={1.2} />
      <ellipse cx="96" cy="236" rx="38" ry="30" className="ui-page-curl-book-fill is-wash-b" />
      <P d="M58 236q38 -46 76 0q-38 38 -76 0M96 206q-4 -14 6 -24" wash="b" />
      <P d="M78 232q18 10 36 0M84 242q12 5 24 0" w={1} />
      <P d={hatch(30, 262, 160, 12, 6, 4)} w={0.7} />
    </>
  );
}
function Roofs() {
  return (
    <>
      <circle cx="320" cy="62" r="24" className="ui-page-curl-book-fill is-wash-b" /><P d="M312 60a22 22 0 0 0 20 26a18 18 0 0 1 -20 -26" w={1} />
      <P d="M16 270H384" w={1.8} />
      <P d="M30 270V176l38 -34l38 34v94z" wash="a" /><P d="M84 150v-22h12v34" /><P d="M48 200h16v22h-16zM74 200h16v22h-16z" w={1.2} />
      <P d="M120 270V150l46 -40l46 40v120z" wash="c" /><P d="M136 176h20v28h-20zM176 176h20v28h-20z" w={1.2} /><P d="M154 270v-34h24v34" />
      <P d="M226 270V190l34 -30l34 30v80z" wash="a" /><P d="M246 214h18v24h-18z" w={1.2} /><P d="M276 150v-20h10v30" />
      <P d="M310 270V204h60v66" wash="c" /><P d="M310 204l30 -22l30 22" /><P d="M328 228h24v42" w={1.2} />
      <P d={hatch(120, 112, 92, 38, 6, 5) + hatch(226, 160, 68, 30, 6, 5)} w={0.6} />
    </>
  );
}
function Ridge() {
  return (
    <>
      <circle cx="104" cy="96" r="30" className="ui-page-curl-book-fill is-wash-b" />
      <P d="M10 190L90 120l50 46l60 -92l70 100l40 -34l80 74" wash="c" w={1.8} />
      <P d="M10 240L70 190l60 36l70 -56l60 52l50 -30l70 60V290H10z" wash="a" w={1.6} />
      <P d={hatch(200, 80, 72, 80, 6, 18)} w={0.7} />
      <P d={hatch(60, 220, 260, 60, 8, 12)} w={0.6} />
      <P d="M200 74l-14 34l16 -8l10 14l8 -22z" w={1} />
    </>
  );
}
function Teapot() {
  return (
    <>
      <P d="M20 232H380" w={1.8} />
      <ellipse cx="170" cy="226" rx="104" ry="9" className="ui-page-curl-book-fill is-shade" />
      <P d="M110 200q-6 -64 62 -64t62 64q0 28 -62 28t-62 -28z" wash="a" w={1.8} />
      <P d="M234 176q40 -8 38 -44l-16 6" /><P d="M110 180q-34 -30 -52 -52l10 -4q22 20 46 34" /><P d="M172 136v-14M150 122h44q-6 -16 -22 -16t-22 16z" wash="c" />
      <P d="M124 188q46 22 100 0" w={1} />
      <path d="M296 224q-22 -2 -24 -22q22 -4 40 10q8 14 -16 12z" className="ui-page-curl-book-ink is-wash-b" strokeWidth="1.6" />
      <path d="M338 226q-22 -2 -24 -20q22 -4 38 8q8 14 -14 12z" className="ui-page-curl-book-ink is-wash-b" strokeWidth="1.6" />
      <P d="M274 202l-8 -4M352 208l8 -6" w={1.2} /><P d={hatch(260, 228, 110, 8, 5, 4)} w={0.7} />
    </>
  );
}
function Kite() {
  return (
    <>
      <P d="M10 262Q100 226 190 252T390 240V292H10z" wash="c" w={1.6} />
      <P d="M232 40l46 52l-46 74l-46 -74z" wash="a" w={1.8} /><P d="M232 40V166M186 92H278" w={1.1} />
      <P d="M232 166q-16 22 6 40t-4 40q-12 10 -2 14" w={1.2} /><P d="M226 188l16 4M232 216l-18 6M238 244l16 6" w={1.2} />
      <P d="M70 90q-12 -22 14 -26q6 -22 30 -12q22 -10 30 12q22 2 14 24z" wash="b" w={1.2} />
      <P d="M318 130q-10 -18 12 -20q6 -16 24 -8q16 -4 22 12q16 4 8 16z" w={1.2} />
      <P d={hatch(20, 262, 120, 24, 7, 8)} w={0.7} />
    </>
  );
}

export const SKETCHES: SketchPage[] = [
  { title: 'Harbour at dusk', alt: 'Pencil sketch of a lighthouse, a low sun and two small boats on hatched water', art: Harbour },
  { title: 'Fern and fig', alt: 'Pencil sketch of an arching fern frond beside a split fig', art: Fern },
  { title: 'Rooftops', alt: 'Pencil sketch of four houses with chimneys under a crescent moon', art: Roofs },
  { title: 'Far ridge', alt: 'Pencil sketch of two mountain ridgelines and a pale sun', art: Ridge },
  { title: 'Teapot and lemons', alt: 'Pencil sketch of a teapot with two lemons on a table', art: Teapot },
  { title: 'Kite weather', alt: 'Pencil sketch of a kite with a bowed tail above rolling hills and clouds', art: Kite },
];

/** One paper sheet: grain, the drawing and a margin note. Memoised so page turns only restyle. */
export const SheetArt = memo(function SheetArt({ index }: { index: number }) {
  const page = SKETCHES[index];
  if (!page) return null;
  const Art = page.art;
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="ui-page-curl-book-art" aria-hidden="true" focusable="false">
      <rect width="400" height="300" className="ui-page-curl-book-paper" />
      <path d="M0 24H400M0 276H400" className="ui-page-curl-book-rule" />
      <g><Art /></g>
      <text x="18" y="292" className="ui-page-curl-book-note">{String(index + 1).padStart(2, '0')} · {page.title}</text>
    </svg>
  );
});
