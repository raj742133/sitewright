/* Invented cast for the character-carousel: every person, name and line here is fictional, and the portraits are drawn from plain SVG shapes. */

export interface Character {
  id: string; name: string; role: string; line: string;
  skin: string; hair: string; style: 'crop' | 'long' | 'bun' | 'cloud' | 'bob' | 'cap' | 'bald';
  cloth: string; bg: number; extra?: 'glasses' | 'monocle' | 'beard' | 'freckles' | 'scarf' | 'earrings';
}

export const CAST: Character[] = [
  { id: 'ivo', name: 'Ivo Marlowe', role: 'Lamplighter', line: 'Keeps forty-one lamps burning along the old quay.', skin: '#e1ae86', hair: '#2d1e17', style: 'crop', cloth: '#b4532a', bg: 32, extra: 'glasses' },
  { id: 'sunna', name: 'Sunna Okafor', role: 'Cartographer', line: 'Draws the maps nobody asked for, then finds the roads.', skin: '#8c5b3d', hair: '#16111a', style: 'cloud', cloth: '#1f6f78', bg: 186, extra: 'earrings' },
  { id: 'bram', name: 'Bram Tideswell', role: 'Ferry pilot', line: 'Has crossed the same river nineteen thousand times.', skin: '#efc3a0', hair: '#c8c3ba', style: 'cap', cloth: '#2d4a7a', bg: 214, extra: 'beard' },
  { id: 'odile', name: 'Odile Quince', role: 'Beekeeper', line: 'Talks to the hives; the hives, apparently, listen.', skin: '#f4cfb2', hair: '#a64f28', style: 'bun', cloth: '#d6a521', bg: 46, extra: 'freckles' },
  { id: 'tamsin', name: 'Tamsin Vael', role: 'Clockmaker', line: 'Repairs time for a living and is never once late.', skin: '#d79e78', hair: '#3b2a54', style: 'bob', cloth: '#5c3d86', bg: 268, extra: 'monocle' },
  { id: 'kofi', name: 'Kofi Arden', role: 'Glassblower', line: 'Shapes a breath into a window, a lamp, a small sea.', skin: '#6e4531', hair: '#1a1411', style: 'bald', cloth: '#a8362f', bg: 8, extra: 'beard' },
  { id: 'mirela', name: 'Mirela Strand', role: 'Lighthouse keeper', line: 'Counts ships by their lights and names every one.', skin: '#dba27c', hair: '#e6e0d6', style: 'long', cloth: '#2f7d55', bg: 150, extra: 'scarf' },
];

/** A flat, editorial portrait: background arch, shoulders, head, hair, face details. Decorative (aria-hidden); the card text names the person. */
export function Portrait({ c }: { c: Character }) {
  const bg1 = `hsl(${c.bg} 58% 74%)`, bg2 = `hsl(${c.bg} 50% 56%)`, shade = 'rgba(30,18,14,0.16)';
  return (
    <svg viewBox="0 0 200 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" className="ui-character-carousel-art">
      <rect width="200" height="250" fill={bg1} />
      <path d="M-10 250V120A110 110 0 0 1 210 120V250Z" fill={bg2} opacity="0.55" />
      <circle cx="152" cy="52" r="20" fill={`hsl(${c.bg} 80% 90%)`} opacity="0.8" />
      {/* hair behind the head */}
      {c.style === 'long' && <path d="M52 112c-6 50-4 92-16 120h128c-12-28-10-70-16-120 0-40-24-62-48-62s-48 22-48 62z" fill={c.hair} />}
      {c.style === 'bob' && <path d="M54 104c0-42 20-60 46-60s46 18 46 60v44c-8 8-24 8-30 0H84c-6 8-22 8-30 0z" fill={c.hair} />}
      {c.style === 'cloud' && <g fill={c.hair}><circle cx="100" cy="76" r="42" /><circle cx="64" cy="98" r="24" /><circle cx="136" cy="98" r="24" /><circle cx="78" cy="62" r="24" /><circle cx="122" cy="62" r="24" /></g>}
      {c.style === 'bun' && <circle cx="100" cy="42" r="17" fill={c.hair} />}
      {/* shoulders and neck */}
      <path d="M14 250c4-52 34-72 86-72s82 20 86 72z" fill={c.cloth} />
      <path d="M78 178l22 26 22-26" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeLinejoin="round" />
      <rect x="86" y="140" width="28" height="42" rx="10" fill={c.skin} />
      <rect x="86" y="140" width="28" height="18" rx="8" fill={shade} />
      {c.extra === 'scarf' && <path d="M62 188c24 16 52 16 76 0l8 22c-30 18-62 18-92 0z" fill="#f2eadb" />}
      {/* head */}
      <ellipse cx="62" cy="116" rx="7" ry="11" fill={c.skin} /><ellipse cx="138" cy="116" rx="7" ry="11" fill={c.skin} />
      <ellipse cx="100" cy="113" rx="38" ry="47" fill={c.skin} />
      {c.extra === 'beard' && <path d="M64 120c2 38 20 52 36 52s34-14 36-52c-10 16-22 16-36 16s-26 0-36-16z" fill={c.hair} opacity="0.92" />}
      {/* hair in front */}
      {c.style === 'crop' && <path d="M60 104c-4-44 22-62 42-60 26 2 42 20 38 60-8-18-18-26-40-26-18 0-30 8-40 26z" fill={c.hair} />}
      {c.style === 'cap' && <g><path d="M58 96c2-34 22-50 44-50s42 16 42 50z" fill="#2f3a4c" /><path d="M54 98h96c4 0 4 8 0 8H54z" fill="#252e3d" /></g>}
      {(c.style === 'long' || c.style === 'bob') && <path d="M60 106c0-34 16-48 40-48s40 14 40 48c-10-20-22-28-40-28s-30 8-40 28z" fill={c.hair} />}
      {c.style === 'bun' && <path d="M60 106c-2-34 16-54 40-54s42 20 40 54c-8-22-20-30-40-30s-32 8-40 30z" fill={c.hair} />}
      {c.style === 'cloud' && <path d="M64 100c8-14 20-20 36-20s28 6 36 20c-2-24-16-36-36-36s-34 12-36 36z" fill={c.hair} />}
      {/* face */}
      <g fill="#241812"><ellipse cx="84" cy="116" rx="3.6" ry="4.4" /><ellipse cx="116" cy="116" rx="3.6" ry="4.4" /></g>
      <path d="M76 105q8-5 16-1M108 104q8-4 16 1" fill="none" stroke="#241812" strokeWidth="2.6" strokeLinecap="round" opacity="0.8" />
      <path d="M100 118c-3 8-5 13-1 15h7" fill="none" stroke={shade} strokeWidth="2.4" strokeLinecap="round" />
      <path d={c.extra === 'beard' ? 'M88 148q12 7 24 0' : 'M86 144q14 11 28 0'} fill="none" stroke={c.extra === 'beard' ? '#f4e7dc' : '#8a3a30'} strokeWidth="3" strokeLinecap="round" />
      {c.extra === 'glasses' && <g fill="rgba(255,255,255,0.22)" stroke="#241812" strokeWidth="2.6"><circle cx="84" cy="116" r="12" /><circle cx="116" cy="116" r="12" /><path d="M96 116h8" fill="none" /></g>}
      {c.extra === 'monocle' && <g fill="rgba(255,255,255,0.25)" stroke="#c9a23a" strokeWidth="2.6"><circle cx="116" cy="116" r="13" /><path d="M126 126q6 18 4 40" fill="none" /></g>}
      {c.extra === 'freckles' && <g fill="#b0643c" opacity="0.7"><circle cx="82" cy="130" r="1.5" /><circle cx="90" cy="134" r="1.5" /><circle cx="77" cy="136" r="1.5" /><circle cx="118" cy="130" r="1.5" /><circle cx="110" cy="134" r="1.5" /><circle cx="123" cy="136" r="1.5" /></g>}
      {c.extra === 'earrings' && <g fill="#f1c14f"><circle cx="62" cy="130" r="4" /><circle cx="138" cy="130" r="4" /></g>}
    </svg>
  );
}
