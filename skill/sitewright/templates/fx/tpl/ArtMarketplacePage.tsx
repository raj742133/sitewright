'use client';
import { useState, type FormEvent } from 'react';
import { Mini } from './_shared';

export type ArtKind = 'sun' | 'waves' | 'arches' | 'grid' | 'hills' | 'orbit';
export interface Artwork { id: string; title: string; artist: string; category: string; price: number; likes: number; kind: ArtKind; colors: [string, string, string] }
export interface ArtMarketplacePageProps {
  brand?: string;
  artworks?: Artwork[];
  className?: string;
}

const WORKS: Artwork[] = [
  { id: 'a1', title: 'Low Sun over Salt', artist: 'Ines Calloway', category: 'Painting', price: 640, likes: 128, kind: 'sun', colors: ['#f4d9b8', '#d9523b', '#3a2e4f'] },
  { id: 'a2', title: 'Tide Table No. 4', artist: 'Joon Park', category: 'Print', price: 120, likes: 76, kind: 'waves', colors: ['#0f3d56', '#2f93a8', '#e9f1e4'] },
  { id: 'a3', title: 'Three Doorways', artist: 'Mara Oyelaran', category: 'Digital', price: 85, likes: 203, kind: 'arches', colors: ['#f2e8d5', '#c76f3b', '#5a7d5a'] },
  { id: 'a4', title: 'Quiet Ledger', artist: 'Tomás Vidal', category: 'Print', price: 95, likes: 41, kind: 'grid', colors: ['#1d2a3a', '#e6b450', '#e8ecef'] },
  { id: 'a5', title: 'Hills, After Rain', artist: 'Ines Calloway', category: 'Painting', price: 780, likes: 167, kind: 'hills', colors: ['#d7e6d3', '#6e9b6b', '#2f4f46'] },
  { id: 'a6', title: 'Orbit Study', artist: 'Joon Park', category: 'Digital', price: 60, likes: 92, kind: 'orbit', colors: ['#2a1b4d', '#ff7a59', '#ffe3b8'] },
];
const CATS = ['All', 'Painting', 'Print', 'Digital'];

/** Abstract artwork drawn from three colours (no images). */
export function ArtPiece({ kind, colors: [c1, c2, c3], label }: { kind: ArtKind; colors: [string, string, string]; label?: string }) {
  return (
    <svg viewBox="0 0 100 125" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ display: 'block' }}>
      <rect width="100" height="125" fill={c1} />
      {kind === 'sun' && <><circle cx="50" cy="62" r="30" fill={c2} /><rect y="82" width="100" height="43" fill={c3} /><rect y="92" width="100" height="3" fill={c1} opacity=".5" /><rect y="104" width="100" height="2" fill={c1} opacity=".4" /></>}
      {kind === 'waves' && [0, 1, 2, 3, 4].map((i) => <path key={i} d={`M0 ${40 + i * 18} q 12.5 -14 25 0 t 25 0 t 25 0 t 25 0 V125 H0Z`} fill={i % 2 ? c2 : c3} opacity={0.55 + i * 0.1} />)}
      {kind === 'arches' && <><path d="M12 112V62a18 18 0 0 1 36 0v50z" fill={c2} /><path d="M52 112V46a18 18 0 0 1 36 0v66z" fill={c3} /><path d="M26 112V82a4 4 0 0 1 8 0v30z" fill={c1} /><rect x="0" y="112" width="100" height="13" fill={c3} opacity=".35" /></>}
      {kind === 'grid' && [0, 1, 2, 3, 4].flatMap((r) => [0, 1, 2, 3].map((c) => ((r * 4 + c) % 3 === 0 ? <rect key={`${r}${c}`} x={10 + c * 21} y={14 + r * 21} width="17" height="17" rx="2" fill={c2} /> : <circle key={`${r}${c}`} cx={18.5 + c * 21} cy={22.5 + r * 21} r={(r + c) % 2 ? 8.5 : 5} fill={c3} />)))}
      {kind === 'hills' && <><circle cx="76" cy="26" r="9" fill="#fff" opacity=".7" /><path d="M0 80 Q 30 48 60 74 T 100 66 V125 H0Z" fill={c2} /><path d="M0 100 Q 40 70 70 96 T 100 90 V125 H0Z" fill={c3} /></>}
      {kind === 'orbit' && <><circle cx="50" cy="62" r="40" fill="none" stroke={c3} strokeWidth="1.5" opacity=".6" /><circle cx="50" cy="62" r="26" fill="none" stroke={c3} strokeWidth="1.5" opacity=".8" /><circle cx="50" cy="62" r="12" fill={c2} /><circle cx="86" cy="52" r="5" fill={c3} /><circle cx="24" cy="86" r="3.5" fill={c3} /></>}
    </svg>
  );
}

/** Art marketplace landing page: nav with cart, layered hero, filterable artwork grid with like/add/zoom, artist spotlight, categories, newsletter, footer. */
export default function ArtMarketplacePage({ brand = 'Frameshop', artworks = WORKS, className }: ArtMarketplacePageProps) {
  const [cat, setCat] = useState('All');
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [cart, setCart] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const cats = ['All', ...Array.from(new Set(artworks.map((a) => a.category)))].filter((c, i, a) => a.indexOf(c) === i);
  const shown = artworks.filter((a) => cat === 'All' || a.category === cat);
  const spot = artworks.filter((a) => a.artist === 'Ines Calloway').slice(0, 3);
  const pick = (c: string) => { setCat(c); document.getElementById('am-works')?.scrollIntoView({ block: 'start' }); };
  const join = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setErr('Enter an email address like name@example.com.'); setDone(false); return; }
    setErr(''); setDone(true);
  };
  return (
    <div className={`ui-art-marketplace-page ${className ?? ''}`}>
      <header className="ui-art-marketplace-page-nav">
        <a href="#am-top" className="ui-art-marketplace-page-brand"><span aria-hidden="true" />{brand}</a>
        <nav aria-label="Marketplace"><a href="#am-works">Shop</a><a href="#am-artist">Artists</a><a href="#am-cats">Categories</a><a href="#am-news">Journal</a></nav>
        <button type="button" className="ui-art-marketplace-page-cart" aria-label={`Cart, ${cart.length} item${cart.length === 1 ? '' : 's'}`}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 7h14l-1.5 11h-11zM9 7a3 3 0 0 1 6 0" /></svg>
          <b aria-live="polite">{cart.length}</b>
        </button>
      </header>
      <section id="am-top" className="ui-art-marketplace-page-hero">
        <div className="ui-art-marketplace-page-copy">
          <p className="ui-art-marketplace-page-kicker">Original work, fairly sold</p>
          <h1>Art for the walls you already love.</h1>
          <p>Browse small-edition paintings, prints and digital pieces direct from working artists. Every sale pays the maker first.</p>
          <div><a className="ui-art-marketplace-page-btn" href="#am-works">Browse the shop</a><a className="ui-art-marketplace-page-btn" data-ghost="true" href="#am-artist">Meet an artist</a></div>
        </div>
        <div className="ui-art-marketplace-page-stack" aria-hidden="true">
          {[artworks[0], artworks[2], artworks[1]].map((a, i) => a && <div key={a.id} className="ui-art-marketplace-page-frame" style={{ ['--i' as string]: i }}><ArtPiece kind={a.kind} colors={a.colors} /></div>)}
        </div>
      </section>
      <section id="am-works" className="ui-art-marketplace-page-sec" aria-labelledby="am-h-works">
        <div className="ui-art-marketplace-page-sh"><h2 id="am-h-works">Featured artworks</h2>
          <div className="ui-art-marketplace-page-chips" role="group" aria-label="Filter by category">{cats.map((c) => <button key={c} type="button" aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>)}</div></div>
        <ul className="ui-art-marketplace-page-grid" aria-live="polite">
          {shown.map((a) => {
            const on = !!liked[a.id], inCart = cart.includes(a.id);
            return (
              <li key={a.id} className="ui-art-marketplace-page-card">
                <div className="ui-art-marketplace-page-art" tabIndex={0} role="img" aria-label={`${a.title}, ${a.category.toLowerCase()} by ${a.artist}`}><div><ArtPiece kind={a.kind} colors={a.colors} /></div></div>
                <div className="ui-art-marketplace-page-meta">
                  <div><b>{a.title}</b><small>{a.artist} · {a.category}</small></div>
                  <button type="button" className="ui-art-marketplace-page-like" aria-pressed={on} aria-label={`Like ${a.title}`} onClick={() => setLiked((l) => ({ ...l, [a.id]: !l[a.id] }))}>
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                    <span>{a.likes + (on ? 1 : 0)}</span>
                  </button>
                </div>
                <div className="ui-art-marketplace-page-buy"><strong>${a.price}</strong>
                  <button type="button" aria-pressed={inCart} onClick={() => setCart((c) => (c.includes(a.id) ? c.filter((x) => x !== a.id) : [...c, a.id]))}>{inCart ? 'In cart' : 'Add to cart'}</button></div>
              </li>
            );
          })}
        </ul>
      </section>
      <section id="am-artist" className="ui-art-marketplace-page-sec ui-art-marketplace-page-spot" aria-labelledby="am-h-artist">
        <div className="ui-art-marketplace-page-portrait" aria-hidden="true">
          <svg viewBox="0 0 120 120"><rect width="120" height="120" fill="#e9c9a8" /><circle cx="60" cy="46" r="20" fill="#7a4b33" /><path d="M20 120c4-30 22-40 40-40s36 10 40 40z" fill="#2f4f46" /><path d="M38 40c2-18 42-18 44 0-8-8-36-8-44 0z" fill="#2a1b14" /></svg>
        </div>
        <div>
          <p className="ui-art-marketplace-page-kicker">Artist spotlight</p>
          <h2 id="am-h-artist">Ines Calloway</h2>
          <p>Ines paints the hour before the light changes: salt flats, wet hills, empty beaches. She mixes her own pigments and numbers each canvas by hand.</p>
          <ul className="ui-art-marketplace-page-minis">{spot.map((a) => <li key={a.id}><ArtPiece kind={a.kind} colors={a.colors} label={a.title} /></li>)}</ul>
        </div>
      </section>
      <section id="am-cats" className="ui-art-marketplace-page-sec" aria-labelledby="am-h-cats">
        <h2 id="am-h-cats">Shop by category</h2>
        <ul className="ui-art-marketplace-page-cats">
          {cats.filter((c) => c !== 'All').map((c) => {
            const a = artworks.find((w) => w.category === c);
            return a && <li key={c}><button type="button" onClick={() => pick(c)}><span><ArtPiece kind={a.kind} colors={a.colors} /></span><b>{c}</b><small>{artworks.filter((w) => w.category === c).length} works</small></button></li>;
          })}
        </ul>
      </section>
      <section id="am-news" className="ui-art-marketplace-page-sec ui-art-marketplace-page-news" aria-labelledby="am-h-news">
        <h2 id="am-h-news">New drops, once a month</h2>
        <p>Studio notes and first look at new editions. No spam, unsubscribe in one click.</p>
        {done ? <p role="status" className="ui-art-marketplace-page-ok">Thanks, you are on the list. Check your inbox for a welcome note.</p> : (
          <form onSubmit={join} noValidate>
            <label htmlFor="am-email">Email address</label>
            <div><input id="am-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-invalid={!!err} aria-describedby={err ? 'am-err' : undefined} autoComplete="email" /><button type="submit">Subscribe</button></div>
            {err && <p id="am-err" role="alert" className="ui-art-marketplace-page-err">{err}</p>}
          </form>
        )}
      </section>
      <footer className="ui-art-marketplace-page-foot"><b>{brand}</b><span>Made for makers and the people who hang their work.</span><nav aria-label="Footer"><a href="#am-top">Back to top</a><a href="#am-works">Shop</a><a href="#am-news">Newsletter</a></nav></footer>
    </div>
  );
}

export function Demo() {
  return <Mini w={1000}><ArtMarketplacePage /></Mini>;
}
