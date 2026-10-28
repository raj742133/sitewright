'use client';
import type { CSSProperties } from 'react';

/* Book data and procedural covers for the 3-D bookshelf: titles, authors and text are invented; artwork is generated SVG. */

export type CoverArt = 'rings' | 'dunes' | 'grid' | 'orbit' | 'stripes' | 'sun' | 'peaks';
export interface BookData {
  title: string;
  author: string;
  /** Procedural cover motif. */
  art?: CoverArt;
  /** Cover tone, 0..5 (picks from the host's primary / signal / ink mixes). */
  tone?: number;
  /** Page texts (one per page side). Omit for generated sample pages. */
  pages?: string[];
}
export const DEFAULT_BOOKS: BookData[] = [
  { title: 'The Lantern Atlas', author: 'Mira Valen', art: 'rings', tone: 0 },
  { title: 'Salt and Cartography', author: 'Iden Okoro', art: 'dunes', tone: 1 },
  { title: 'A Field Guide to Quiet', author: 'Tove Marsh', art: 'grid', tone: 2 },
  { title: 'Midnight Orchard', author: 'Lian Ashby', art: 'orbit', tone: 3 },
  { title: 'Notes on Rivers', author: 'Casimir Dray', art: 'stripes', tone: 4 },
  { title: 'The Paper Observatory', author: 'Odile Brandt', art: 'sun', tone: 5 },
  { title: 'Small Weathers', author: 'Yusra Kell', art: 'peaks', tone: 1 },
];
const LINES = [
  'The first thing the map keeps is the hour at which it was drawn. Everything after that is a promise, and promises drift like silt.',
  'She counted the lamps along the quay twice, and both times arrived at a different number, which she decided was the correct answer.',
  'There is a particular quiet that follows rain on a tin roof, when the whole house seems to lean in and listen back.',
  'Rivers do not hurry; they simply refuse to stop. Learn that and most of the rest of the season will arrange itself.',
  'On the third night the observatory opened its paper shutters, and the stars, being polite, rearranged themselves into something legible.',
  'He folded the weather forecast into a boat and set it on the gutter, trusting it to reach the sea before the sun did.',
  'A good margin is a small garden. Leave it wild enough that a thought can land, and tidy enough that you can find it again.',
  'Between two cities there is always a third place, and it is usually a kitchen with the radio on low.',
];
export const samplePages = (i: number, count: number) => Array.from({ length: count }, (_, k) => LINES[(i * 3 + k * 5 + k) % LINES.length]!);
export const TONES: [string, string, string][] = [
  ['var(--primary)', 'color-mix(in srgb, var(--primary) 45%, #0b0b10)', 'color-mix(in srgb, var(--primary) 35%, #fff)'],
  ['color-mix(in srgb, var(--signal) 70%, #0b0b10)', 'color-mix(in srgb, var(--signal) 40%, #0b0b10)', 'color-mix(in srgb, var(--signal) 55%, #fff)'],
  ['color-mix(in srgb, var(--primary) 55%, var(--signal))', 'color-mix(in srgb, var(--primary) 30%, #0b0b10)', 'color-mix(in srgb, var(--signal) 50%, #fff)'],
  ['color-mix(in srgb, var(--ink) 80%, var(--primary))', 'color-mix(in srgb, var(--ink) 70%, #0b0b10)', 'color-mix(in srgb, var(--signal) 70%, #fff)'],
  ['color-mix(in srgb, var(--signal) 50%, var(--primary))', 'color-mix(in srgb, var(--signal) 25%, #0b0b10)', 'color-mix(in srgb, var(--primary) 30%, #fff)'],
  ['color-mix(in srgb, var(--primary) 70%, #0b0b10)', 'color-mix(in srgb, var(--primary) 30%, #0b0b10)', 'color-mix(in srgb, var(--signal) 60%, #fff)'],
];
const wrap = (t: string, n: number) => { const out: string[] = []; let cur = ''; for (const w of t.split(' ')) { if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out.slice(0, 4); };

function Motif({ art, c }: { art: CoverArt; c: string }) {
  const ln = { fill: 'none', stroke: c, strokeWidth: 1.4, opacity: 0.85 };
  switch (art) {
    case 'rings': return <g>{[10, 20, 30, 40, 50].map((r) => <circle key={r} cx="60" cy="62" r={r} {...ln} />)}<circle cx="60" cy="62" r="4" fill={c} /></g>;
    case 'dunes': return <g>{[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M0 ${60 + i * 12} Q30 ${46 + i * 12} 60 ${60 + i * 12} T120 ${60 + i * 12}`} {...ln} />)}</g>;
    case 'grid': return <g>{Array.from({ length: 36 }, (_, k) => <circle key={k} cx={20 + (k % 6) * 16} cy={26 + Math.floor(k / 6) * 16} r={k % 7 === 0 ? 3.4 : 1.7} fill={c} opacity={k % 7 === 0 ? 1 : 0.7} />)}</g>;
    case 'orbit': return <g><ellipse cx="60" cy="62" rx="46" ry="16" transform="rotate(-24 60 62)" {...ln} /><ellipse cx="60" cy="62" rx="46" ry="16" transform="rotate(32 60 62)" {...ln} /><circle cx="60" cy="62" r="9" fill={c} /></g>;
    case 'stripes': return <g>{Array.from({ length: 9 }, (_, k) => <rect key={k} x={-10 + k * 16} y="0" width="6" height="170" fill={c} opacity={0.35 + (k % 3) * 0.2} transform="rotate(22 60 85)" />)}</g>;
    case 'sun': return <g><circle cx="60" cy="58" r="22" fill={c} />{[0, 1, 2, 3].map((i) => <rect key={i} x="14" y={86 + i * 7} width="92" height={3 - i * 0.5} fill={c} opacity={0.9 - i * 0.18} />)}</g>;
    default: return <g><path d="M8 100 L38 44 L60 82 L82 36 L112 100Z" fill={c} opacity="0.9" /><path d="M8 112 L112 112" {...ln} /></g>;
  }
}
/** The procedural cover (SVG, aria-hidden): tone gradient, motif, title and author. */
export function Cover({ b, i }: { b: BookData; i: number }) {
  const tone = TONES[(b.tone ?? i) % TONES.length]!, lines = wrap(b.title, 12);
  const id = `bk-g${i}`;
  return (
    <svg viewBox="0 0 120 170" preserveAspectRatio="none" aria-hidden="true" focusable="false" className="ui-bookshelf-3d-cover">
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={tone[0]} /><stop offset="1" stopColor={tone[1]} /></linearGradient></defs>
      <rect width="120" height="170" fill={`url(#${id})`} />
      <rect x="5" y="5" width="110" height="160" fill="none" stroke={tone[2]} strokeWidth="0.8" opacity="0.6" />
      <Motif art={b.art ?? 'rings'} c={tone[2]} />
      <rect x="0" y="108" width="120" height="62" fill="#0b0b10" opacity="0.5" />
      {lines.map((l, k) => <text key={k} x="60" y={126 + k * 12} textAnchor="middle" fill="#fff" fontSize="10.5" fontWeight="700" fontFamily="var(--font-body, system-ui)">{l}</text>)}
      <text x="60" y="162" textAnchor="middle" fill={tone[2]} fontSize="6.5" letterSpacing="1.4" fontFamily="var(--font-mono, monospace)">{b.author.toUpperCase()}</text>
    </svg>
  );
}
export interface LeafStyle extends CSSProperties { ['--ry']?: string; ['--zf']?: number }
