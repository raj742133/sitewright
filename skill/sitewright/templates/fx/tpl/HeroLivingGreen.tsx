'use client';
import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Preview } from './_dash';
import { useScheme, Dialog, Subscribe, jump, useReduced, useScrollLinked } from './_ha-kit';
import { LivingGround } from './_ha-green-gl';
import { Art, Fern, LeafMark, PRODUCTS } from './_ha-green-art';
import { CartBody } from './_ha-green-cart';

/* Hollowfern: an organic botanical landing page for an invented skin-care and terrarium line. A WebGL moss field lives behind the
   hero, the CTA is a liquid-metal button, the shelf filters, sorts and fills a real basket, and a vine draws itself as you scroll. */

const NAV = [['hlg-shelf', 'Shelf'], ['hlg-method', 'Method'], ['hlg-grove', 'The grove']] as const;
const FEATURES = [
  { h: 'Fermented, not extracted', p: 'Moss and fern are fermented for nine weeks in glass, which is slow, quiet and the reason the mist feels the way it does.', d: 'M5 19c0-8 4-13 14-14 0 9-4 14-12 14M5 19c3-4 6-7 10-9' },
  { h: 'A refill loop', p: 'Send the empty jar back in the pouch it came in. We wash, refill and ship it again, up to twelve times.', d: 'M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M18 3v4h-4M6 21v-4h4' },
  { h: 'Soil-safe all the way', p: 'Paper labels, compostable wrap, no microbeads, and a formula that rinses into a garden bed without complaint.', d: 'M12 21v-7M12 14c-4 0-6-3-6-7 4 0 6 3 6 7zM12 12c0-3 2-5 6-5 0 3-2 5-6 5z' },
];
const STEPS = [
  { h: 'Gather', p: 'Moss and ferns are collected from the farm’s shaded north slope, a few handfuls at a time, always leaving the colony.' },
  { h: 'Ferment', p: 'Nine weeks in glass at a steady 18 degrees, tasted, smelled and logged by hand every Friday.' },
  { h: 'Blend', p: 'Small batches of sixty jars. Each one is labelled with the date it was poured and the tank it came from.' },
  { h: 'Grow back', p: 'Return the jar, plant the packaging, repeat. The loop is the product.' },
];
type Sort = 'featured' | 'low' | 'high';
const CATS = ['All', 'Face', 'Home', 'Soil'] as const;

function Liquid({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const move = (e: PointerEvent) => {
    const b = ref.current; if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--lx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    b.style.setProperty('--ly', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };
  return (
    <button ref={ref} type="button" className="hlg-liquid" onClick={onClick} onPointerMove={move}>
      <i className="hlg-lq-a" aria-hidden="true" /><i className="hlg-lq-b" aria-hidden="true" />
      <span>{children}</span>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </button>
  );
}

export default function HeroLivingGreen({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReduced();
  const [banner, setBanner] = useState(true);
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cat, setCat] = useState<(typeof CATS)[number]>('All');
  const [sort, setSort] = useState<Sort>('featured');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [live, setLive] = useState('');
  useScrollLinked(root, reduced);
  useScheme(root);
  useEffect(() => {
    if (!menu) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [menu]);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const shown = useMemo(() => {
    const l = PRODUCTS.filter((p) => cat === 'All' || p.cat === cat);
    return sort === 'low' ? [...l].sort((a, b) => a.price - b.price) : sort === 'high' ? [...l].sort((a, b) => b.price - a.price) : l;
  }, [cat, sort]);
  const setQty = (id: string, q: number) => setCart((c) => { const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = q; return n; });
  const add = (id: string, name: string) => { setQty(id, (cart[id] ?? 0) + 1); setLive(`${name} added to basket`); };
  const go = (id: string) => (e: { preventDefault(): void }) => { setMenu(false); jump(id, reduced)(e); };
  const copy = async () => {
    setCopied(true); setLive('Code MOSS10 copied'); window.setTimeout(() => setCopied(false), 2200);
    try { await navigator.clipboard.writeText('MOSS10'); } catch { /* clipboard may be blocked; the code is shown anyway */ }
  };
  return (
    <div ref={root} className={`hlg ${className ?? ''}`}>
      {banner && (
        <div className="hlg-banner" role="region" aria-label="Announcement">
          <p>Free compostable refills over $40. Use code <b>MOSS10</b> for 10% off a first jar.</p>
          <button type="button" className="hlg-bannerbtn" onClick={copy}>{copied ? 'Copied' : 'Copy code'}</button>
          <button type="button" className="hlg-bannerx" aria-label="Dismiss announcement" onClick={() => setBanner(false)}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
      )}
      <header className="hlg-nav">
        <a className="hlg-brand" href="#hlg-top" onClick={go('hlg-top')} aria-label="Hollowfern, back to top"><LeafMark /><span>Hollowfern</span></a>
        <nav className="hlg-links" aria-label="Sections">{NAV.map(([id, l]) => <a key={id} href={`#${id}`} onClick={go(id)}>{l}</a>)}</nav>
        <button type="button" className="hlg-cartbtn" onClick={() => setCartOpen(true)} aria-label={`Open basket, ${count} item${count === 1 ? '' : 's'}`}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6zM9 8a3 3 0 016 0" /></svg>
          <b data-n={count} aria-hidden="true">{count}</b>
        </button>
        <button type="button" className="hlg-burger" aria-expanded={menu} aria-controls="hlg-menu" aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu((v) => !v)}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}</svg></button>
        {menu && <div id="hlg-menu" className="hlg-menu">{NAV.map(([id, l]) => <a key={id} href={`#${id}`} onClick={go(id)}>{l}</a>)}</div>}
      </header>

      <section id="hlg-top" className="hlg-hero" aria-labelledby="hlg-h1" tabIndex={-1}>
        <LivingGround root={root} reduced={reduced} />
        <div className="hlg-fade" aria-hidden="true" />
        <div className="hlg-copy">
          <p className="hlg-eyebrow"><i aria-hidden="true" />Botanical skin care, grown slowly</p>
          <h1 id="hlg-h1">Skin care that keeps <em>growing.</em></h1>
          <p className="hlg-lede">Hollowfern ferments moss and fern into small-batch mists, balms and living terrarium kits. Everything arrives with the soil still on it, and goes back to the garden when it is done.</p>
          <div className="hlg-actions">
            <Liquid onClick={() => jump('hlg-shelf', reduced)({ preventDefault() {} })}>Shop the living shelf</Liquid>
            <a className="hlg-ghost" href="#hlg-method" onClick={go('hlg-method')}>How it grows</a>
          </div>
          <ul className="hlg-trust" aria-label="Highlights"><li>Refillable up to 12 times</li><li>pH 5.5, skin-matched</li><li>Peat-free, always</li></ul>
        </div>
        <div className="hlg-stage">
          <div className="hlg-arch"><Fern /></div>
          <div className="hlg-chip hlg-chip-a"><b>9 weeks</b><span>in the fermenting jar</span></div>
          <div className="hlg-chip hlg-chip-b"><b>0 plastic</b><span>in the refill loop</span></div>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <i key={i} className="hlg-spore" style={{ '--i': i } as React.CSSProperties} aria-hidden="true" />)}
        </div>
      </section>

      <section className="hlg-feats" aria-label="Why Hollowfern">
        <ul>
          {FEATURES.map((f) => (
            <li key={f.h} className="hlg-feat">
              <span className="hlg-ficon"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={f.d} /></svg></span>
              <h2>{f.h}</h2><p>{f.p}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="hlg-shelf" className="hlg-sec" aria-labelledby="hlg-hs" tabIndex={-1}>
        <div className="hlg-head">
          <div><p className="hlg-kicker">The living shelf</p><h2 id="hlg-hs">Six things, all still growing.</h2></div>
          <div className="hlg-tools">
            <div className="hlg-chips" role="group" aria-label="Filter products">{CATS.map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => { setCat(c); setLive(`Showing ${c === 'All' ? 'all products' : c}`); }}>{c}</button>)}</div>
            <label className="hlg-sort"><span>Sort</span><select value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="featured">Featured</option><option value="low">Price, low to high</option><option value="high">Price, high to low</option></select></label>
          </div>
        </div>
        <ul className="hlg-grid">
          {shown.map((p) => (
            <li key={p.id} className="hlg-prod">
              <div className="hlg-artbox"><span className="hlg-tag">{p.tag}</span><Art kind={p.kind} /></div>
              <div className="hlg-pb"><div className="hlg-pt"><h3>{p.name}</h3><b>${p.price}</b></div><p>{p.note}</p>
                <button type="button" className="hlg-add" onClick={() => add(p.id, p.name)}>{(cart[p.id] ?? 0) > 0 ? `Add another (${cart[p.id]} in basket)` : 'Add to basket'}</button></div>
            </li>
          ))}
        </ul>
      </section>

      <section id="hlg-method" className="hlg-sec hlg-method" data-sl="pass" aria-labelledby="hlg-hm" tabIndex={-1}>
        <p className="hlg-kicker">How a jar is made</p><h2 id="hlg-hm">From the north slope to your shelf, and back.</h2>
        <div className="hlg-vine">
          <svg viewBox="0 0 40 1000" preserveAspectRatio="none" aria-hidden="true"><path className="hlg-vine-bg" d="M20 0 C-6 120 46 200 20 330 S-6 560 20 680 46 860 20 1000" /><path className="hlg-vine-fg" pathLength="100" d="M20 0 C-6 120 46 200 20 330 S-6 560 20 680 46 860 20 1000" /></svg>
          <ol>{STEPS.map((s, i) => <li key={s.h} className="hlg-vstep" data-sl="pass"><span className="hlg-node" aria-hidden="true">{i + 1}</span><div><h3>{s.h}</h3><p>{s.p}</p></div></li>)}</ol>
        </div>
      </section>

      <section id="hlg-grove" className="hlg-sec hlg-grove" aria-labelledby="hlg-hg" tabIndex={-1}>
        <div className="hlg-groveinner">
          <h2 id="hlg-hg">Join the grove</h2>
          <p>A monthly note from the greenhouse: what is fermenting, what is flowering and when the next batch of sixty is poured. First access to every small drop.</p>
          <Subscribe id="hlg" cls="hlg" hideLabel cta="Join the grove" doneTitle={(e) => `Welcome to the grove, ${e}.`} doneText="Your first note arrives with the next full moon. Unsubscribe whenever you like." />
        </div>
      </section>

      <footer className="hlg-foot">
        <a className="hlg-brand" href="#hlg-top" onClick={go('hlg-top')}><LeafMark /><span>Hollowfern</span></a>
        <nav aria-label="Footer"><a href="#hlg-shelf" onClick={go('hlg-shelf')}>Shelf</a><a href="#hlg-method" onClick={go('hlg-method')}>Method</a><a href="#hlg-grove" onClick={go('hlg-grove')}>The grove</a><button type="button" onClick={() => setCartOpen(true)}>Basket</button><a href="#hlg-top" onClick={go('hlg-top')}>Back to top</a></nav>
        <small>© 2026 Hollowfern, an invented botanical brand for a template. Patch test new products before use.</small>
      </footer>
      <Dialog open={cartOpen} onClose={() => setCartOpen(false)} title="Your basket" cls="hlg-dlg">{cartOpen && <CartBody cart={cart} setQty={setQty} clear={() => setCart({})} onClose={() => setCartOpen(false)} />}</Dialog>
      <div className="ha-sr" role="status" aria-live="polite">{live}</div>
    </div>
  );
}

export function Demo() { return <Preview w={1280} h={190}><HeroLivingGreen /></Preview>; }
