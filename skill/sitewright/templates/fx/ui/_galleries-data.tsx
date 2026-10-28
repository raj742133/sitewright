'use client';
import type { CSSProperties, ReactNode } from 'react';

/* Shared by the gallery components: the item type, a set of demo items and Artwork, which draws original abstract pictures with CSS + SVG
   (no files, no network) from the host colour tokens, so every demo looks designed in light and dark themes. */

export interface GalleryItem {
  /** Stable key; falls back to the index. */
  id?: string;
  title: string;
  subtitle?: string;
  /** Picture URL. Without it (and without `media`) a generated illustration is drawn. */
  image?: string;
  /** Any node shown in place of the picture. */
  media?: ReactNode;
  /** Alt text for `image`; empty by default because the caption already names it. */
  alt?: string;
  /** Link target; the item then renders as a link. */
  href?: string;
  /** Height divided by width (used by Masonry; others crop to fit). */
  ratio?: number;
}

export const DEMO_ITEMS: GalleryItem[] = [
  { title: 'Harbour light', subtitle: 'Dawn over the breakwater', ratio: 1.25 },
  { title: 'Salt flats', subtitle: 'A mirror 4 km wide', ratio: 0.8 },
  { title: 'Night market', subtitle: 'Steam, neon and noodles', ratio: 1.05 },
  { title: 'Glass tower', subtitle: 'Forty floors of sky', ratio: 1.45 },
  { title: 'Terraced hills', subtitle: 'Green steps to the clouds', ratio: 0.9 },
  { title: 'Paper lanterns', subtitle: 'The festival after dark', ratio: 1.15 },
  { title: 'Quiet canal', subtitle: 'Bridges, one by one', ratio: 0.75 },
  { title: 'Neon rain', subtitle: 'Reflections on wet streets', ratio: 1.35 },
  { title: 'Dune ridge', subtitle: 'Wind writes the horizon', ratio: 1 },
  { title: 'Moss garden', subtitle: 'Soft ground, slow time', ratio: 1.2 },
  { title: 'Ferry crossing', subtitle: 'Twenty minutes of calm', ratio: 0.85 },
  { title: 'Blue hour', subtitle: 'The city switches on', ratio: 1.3 },
];

export const wrap = (i: number, n: number) => (n > 0 ? ((i % n) + n) % n : 0);
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const itemKey = (it: GalleryItem, i: number) => it.id ?? `${i}-${it.title}`;

const TONES: [string, string][] = [
  ['var(--primary, #2563eb)', 'var(--signal, #f59e0b)'],
  ['var(--signal, #f59e0b)', 'var(--primary, #2563eb)'],
  ['color-mix(in srgb, var(--primary, #2563eb) 80%, #000)', 'color-mix(in srgb, var(--primary, #2563eb) 45%, #fff)'],
  ['color-mix(in srgb, var(--signal, #f59e0b) 70%, #000)', 'color-mix(in srgb, var(--primary, #2563eb) 60%, var(--signal, #f59e0b))'],
  ['color-mix(in srgb, var(--primary, #2563eb) 55%, var(--ink, #18181b))', 'var(--signal, #f59e0b)'],
];
const W1 = 'rgba(255,255,255,0.88)';
const W2 = 'rgba(255,255,255,0.5)';
const W3 = 'rgba(255,255,255,0.22)';
const K = 'rgba(8,10,24,0.38)';

function Motif({ k }: { k: number }) {
  switch (k % 8) {
    case 0: return (<><circle cx="110" cy="38" r="20" fill={W1} /><path d="M0 120V86L34 58l26 22 34-34 40 42 26-16v62z" fill={K} /><path d="M0 120V102l40-22 36 20 30-14 54 24v10z" fill={W3} /></>);
    case 1: return (<>{[56, 42, 28, 14].map((r, i) => <circle key={r} cx="80" cy="60" r={r} fill="none" stroke={i % 2 ? W2 : W1} strokeWidth="5" />)}<circle cx="80" cy="60" r="5" fill={W1} /></>);
    case 2: return (<>{[0, 1, 2, 3].map((i) => <path key={i} d={`M-10 ${50 + i * 17} Q 25 ${34 + i * 17} 60 ${50 + i * 17} T 130 ${50 + i * 17} T 190 ${50 + i * 17}`} fill="none" stroke={i % 2 ? W2 : W1} strokeWidth="5" strokeLinecap="round" />)}<circle cx="124" cy="24" r="11" fill={W1} /></>);
    case 3: return (<>{[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={-20 + i * 34} y="-20" width="12" height="170" fill={W3} transform="rotate(24 80 60)" />)}<circle cx="84" cy="62" r="26" fill={W1} /><circle cx="96" cy="54" r="22" fill={K} /></>);
    case 4: return (<>{Array.from({ length: 35 }, (_, i) => <circle key={i} cx={22 + (i % 7) * 19} cy={20 + Math.floor(i / 7) * 20} r={i % 4 === 0 ? 4.5 : 2.5} fill={i % 4 === 0 ? W1 : W2} />)}<path d="M20 108 A 64 64 0 0 1 140 108" fill="none" stroke={W1} strokeWidth="4" strokeLinecap="round" /></>);
    case 5: return (<><circle cx="42" cy="34" r="12" fill={W1} /><path d="M-4 120 52 50l30 38 22-24 60 56z" fill={K} /><path d="M52 50l-10 16 10-5 8 10 6-9z" fill={W1} /><path d="M30 120l46-48 28 30 24-22 40 40z" fill={W3} /></>);
    case 6: return (<><circle cx="58" cy="60" r="38" fill={W2} /><circle cx="102" cy="60" r="38" fill={W3} /><circle cx="80" cy="36" r="30" fill={K} style={{ mixBlendMode: 'multiply' }} /><circle cx="80" cy="60" r="8" fill={W1} /></>);
    default: return (<>{[18, 40, 58, 76, 96, 118, 136].map((x, i) => <rect key={x} x={x - 8} y={104 - [44, 70, 52, 86, 60, 76, 40][i]!} width="16" height={[44, 70, 52, 86, 60, 76, 40][i]! + 20} fill={i % 2 ? K : W2} />)}<circle cx="124" cy="26" r="9" fill={W1} /></>);
  }
}

/** Fills its (positioned) parent with the item's picture: `media`, else `image`, else a generated illustration seeded by `index`. */
export function Artwork({ item, index, style }: { item: GalleryItem; index: number; style?: CSSProperties }) {
  const base: CSSProperties = { position: 'absolute', inset: 0, overflow: 'hidden', ...style };
  if (item.media) return <span style={{ ...base, display: 'block' }}>{item.media}</span>;
  if (item.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.image} alt={item.alt ?? ''} draggable={false} loading="lazy" style={{ ...base, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />;
  }
  const [a, b] = TONES[index % TONES.length]!;
  const angle = 120 + ((index * 37) % 90);
  return (
    <span aria-hidden="true" style={{ ...base, display: 'block', background: `linear-gradient(${angle}deg, ${a}, ${b})` }}>
      <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" focusable="false" style={{ width: '100%', height: '100%', display: 'block' }}>
        <Motif k={index} />
      </svg>
    </span>
  );
}
