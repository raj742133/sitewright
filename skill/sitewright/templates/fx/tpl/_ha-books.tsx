'use client';
import { seeded } from './_ha-kit';

/* Quillfold Press: six invented books, each cover drawn in SVG with its own composition and palette (covers are artwork, so their
   colours are fixed), plus the excerpt text. */

export interface Book { id: string; title: string; author: string; form: string; pages: number; price: number; year: string; blurb: string; excerpt: string[]; ink: string; paper: string; accent: string }
export const BOOKS: Book[] = [
  { id: 'salt', title: 'The Salt Ledger', author: 'Ines Valcourt', form: 'Novel', pages: 312, price: 19, year: '2026', ink: '#14304a', paper: '#f1e7d0', accent: '#d9602f',
    blurb: 'A harbour clerk inherits the tide tables of a town that has been quietly rewriting its own history, one entry at a time.',
    excerpt: ['The tide did not come in on Tuesday. That is what the ledger said, in my mother’s hand, and I read it three times before I went down to look.', 'The water was where it always was, grey and unbothered, and the gulls had the faint embarrassed look of witnesses.'] },
  { id: 'orchard', title: 'Orchard Arithmetic', author: 'Tobias Renke', form: 'Essays', pages: 208, price: 17, year: '2026', ink: '#2c4a2b', paper: '#f4efe3', accent: '#c8412e',
    blurb: 'Eleven essays on counting, grafting and the strange maths of a small apple farm that refuses to be profitable.',
    excerpt: ['An apple tree does not know it is a tree. It knows light and it knows weight, and between the two it makes a decision about every branch.', 'My grandfather called this arithmetic. I call it a long argument conducted in wood.'] },
  { id: 'trains', title: 'Night Trains', author: 'Maren Adeyemi-Holt', form: 'Stories', pages: 176, price: 16, year: '2026', ink: '#f0e6d4', paper: '#1c1b2e', accent: '#f2b84b',
    blurb: 'Nine stories set in the carriages between cities, where strangers are briefly, and sometimes disastrously, honest.',
    excerpt: ['By the third hour the carriage had become a country with its own laws. No talking after the tunnel. Share the bread. Never ask who gets off first.', 'She asked anyway.'] },
  { id: 'quiet', title: 'A Field Guide to Quiet', author: 'Odile Brandt', form: 'Nonfiction', pages: 244, price: 18, year: '2025', ink: '#23211d', paper: '#e8dfcf', accent: '#5d7a63',
    blurb: 'A naturalist’s catalogue of thirty silences, from snowfall to the minute after a concert, with notes on where to hear them.',
    excerpt: ['Silence is not the absence of sound. It is the presence of attention, and attention can be trained like a dog or a muscle.', 'Start with the refrigerator. Everyone has one.'] },
  { id: 'maps', title: 'Maps of the Small Hours', author: 'Jun Hartwell-Okoro', form: 'Poems', pages: 96, price: 14, year: '2026', ink: '#fbf4e4', paper: '#3c2a6b', accent: '#f08aa5',
    blurb: 'Forty poems written between two and four in the morning, charting the country that opens when everyone else is asleep.',
    excerpt: ['At three the house keeps a different map: the stairs are longer, the kettle is a lighthouse, and the dog is a small, warm continent.', 'I navigate by the sound of the fridge.'] },
  { id: 'weather', title: 'The Weather Inside', author: 'Pilar Szabo', form: 'Memoir', pages: 288, price: 19, year: '2026', ink: '#243a52', paper: '#d8e4e6', accent: '#e07a3f',
    blurb: 'A forecaster’s memoir about reading storms for a living and failing, for years, to read the one in her own kitchen.',
    excerpt: ['Forecasting is the art of being specific about the future in a way that is easy to forgive. Seventy percent means thirty percent of the time I am wrong, and nobody minds.', 'I wanted my marriage to work the same way.'] },
];

function Art({ id, b }: { id: string; b: Book }) {
  const r = seeded(id.length * 97 + id.charCodeAt(0));
  const { ink, paper, accent } = b;
  switch (id) {
    case 'salt': return <g><circle cx="100" cy="118" r="52" fill={accent} />{[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M0 ${150 + i * 14} q25 -9 50 0 t50 0 t50 0 t50 0 V300 H0z`} fill={ink} opacity={0.35 + i * 0.13} />)}</g>;
    case 'orchard': return <g>{Array.from({ length: 25 }, (_, i) => <circle key={i} cx={40 + (i % 5) * 30} cy={48 + Math.floor(i / 5) * 30} r={i === 12 ? 13 : 9} fill={i === 12 ? accent : ink} opacity={i === 12 ? 1 : 0.85} />)}</g>;
    case 'trains': return <g>{Array.from({ length: 9 }, (_, i) => <rect key={i} x={14 + i * 20} y={70 + (i % 3) * 8} width="14" height="22" rx="3" fill={i === 4 ? accent : ink} opacity={i === 4 ? 1 : 0.8} />)}<path d="M0 118 H200M0 128 H200" stroke={ink} strokeWidth="2" opacity=".6" />{Array.from({ length: 26 }, (_, i) => <circle key={i} cx={r() * 200} cy={r() * 60} r={0.9 + r() * 1.2} fill={ink} opacity=".7" />)}</g>;
    case 'quiet': return <g><rect x="28" y="48" width="144" height="2" fill={ink} />{[0, 1, 2].map((i) => <rect key={i} x="28" y={150 + i * 10} width={120 - i * 28} height="2" fill={ink} opacity=".5" />)}<circle cx="100" cy="226" r="9" fill={accent} /></g>;
    case 'maps': return <g fill="none" stroke={ink} strokeWidth="1.6">{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M-10 ${60 + i * 20} C50 ${34 + i * 20 + (i % 2) * 24}, 120 ${96 + i * 20 - (i % 3) * 22}, 210 ${64 + i * 20}`} opacity={0.35 + (i % 3) * 0.25} />)}<circle cx="132" cy="132" r="9" fill={accent} stroke="none" /></g>;
    default: return <g><path d="M30 150a30 30 0 0 1 8-58a38 38 0 0 1 72-10a30 30 0 0 1 58 22a26 26 0 0 1-6 46z" fill={ink} opacity=".85" /><path d="M64 164l-8 22M92 164l-8 22M120 164l-8 22" stroke={accent} strokeWidth="4" strokeLinecap="round" /></g>;
  }
}

/** one book cover (200 x 300); `lang` sets whether title text is drawn on it */
export function Cover({ b, title = true }: { b: Book; title?: boolean }) {
  const lines = b.title.length > 14 ? b.title.split(/ (?=[A-Z])/).length > 1 ? b.title.split(' ') : [b.title] : [b.title];
  const merged = lines.length > 3 ? [lines.slice(0, 2).join(' '), lines.slice(2).join(' ')] : lines;
  const dark = b.id === 'trains' || b.id === 'maps';
  return (
    <svg className="hbs-cover" viewBox="0 0 200 300" aria-hidden="true" focusable="false">
      <rect width="200" height="300" fill={b.paper} />
      <Art id={b.id} b={b} />
      {title && (b.id === 'maps' || b.id === 'orchard') && <rect x="0" y="200" width="200" height="100" fill={b.paper} opacity=".88" />}
      {title && <g fill={b.id === 'salt' ? b.paper : b.ink} fontFamily="Georgia, 'Times New Roman', serif">
        {merged.map((l, i) => <text key={i} x="100" y={b.id === 'quiet' ? 96 + i * 24 : 226 + i * 22} textAnchor="middle" fontSize={b.id === 'quiet' ? 22 : 20} fontWeight="700" fontStyle={i % 2 ? 'italic' : 'normal'} letterSpacing="-.3">{l}</text>)}
        <text x="100" y="282" textAnchor="middle" fontSize="9" letterSpacing="2.4" opacity=".8" fontFamily="system-ui, sans-serif">{b.author.toUpperCase()}</text>
      </g>}
      <rect x="0" y="0" width="7" height="300" fill="#000" opacity=".12" />
      <rect x="7" y="0" width="1.5" height="300" fill="#fff" opacity=".25" />
    </svg>
  );
}
