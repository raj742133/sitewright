'use client';
import { useEffect, useRef, useState } from 'react';
import { Preview } from './_dash';
import { useScheme, Dialog, Subscribe, jump, useReduced, useScrollLinked } from './_ha-kit';
import { Atmosphere } from './_ha-green-gl';
import { frond, LeafMark } from './_ha-green-art';
import { Terrarium } from './_ha-green-jar';
import { Shelf } from './_ha-green-shelf';
import { CartBody } from './_ha-green-cart';
import LiquidMetalButton from '../ui/LiquidMetalButton';
import Grainient from '../ui/Grainient';
import GradualBlur from '../ui/GradualBlur';
import ScrollReveal from '../ui/ScrollReveal';

/* Hollowfern: a botanical skin-care and terrarium page whose first screen is one object. A glass terrarium (layered interior, refracting
   rim, condensation, chrome base) stands in the middle of the headline, hairline callouts point into it, spores drift through the air
   and the pointer turns the whole thing a few degrees. Library parts: MossForestWorld (inside the jar), LiquidMetalButton (the action),
   Grainient (the studio wall), GradualBlur (the hero's soft floor), MagicBento (the shelf), ScrollReveal (the story). */

const NAV = [['hlg-shelf', 'Shelf'], ['hlg-method', 'Method'], ['hlg-grove', 'The grove']] as const;
const RAIL = [['9', 'wk', 'fermented in glass'], ['12', '×', 'refills per jar'], ['5.5', 'pH', 'matched to skin'], ['0', 'g', 'plastic in the loop']] as const;
const PILLARS = [
  { h: 'Fermented, not extracted', p: 'Moss and fern sit in glass for nine weeks. It is slow and quiet, and it is why the mist feels the way it does.' },
  { h: 'A refill loop', p: 'Post the empty jar back in the pouch it came in. We wash it, refill it and send it out again, up to twelve times.' },
  { h: 'Soil-safe all the way', p: 'Paper labels, compostable wrap, no microbeads, and a formula that rinses into a garden bed without complaint.' },
];
const STEPS = [
  { h: 'Gather', p: 'Moss and ferns come from the farm’s shaded north slope, a few handfuls at a time, always leaving the colony.' },
  { h: 'Ferment', p: 'Nine weeks in glass at a steady 18 degrees, tasted, smelled and logged by hand every Friday.' },
  { h: 'Blend', p: 'Small batches of sixty jars. Each one is labelled with the date it was poured and the tank it came from.' },
  { h: 'Grow back', p: 'Return the jar, plant the packaging, repeat. The loop is the product.' },
];
const STORY = 'We pour sixty jars at a time. Nothing is extracted, nothing is rushed, and everything that is left over goes back into the garden bed it came from.';

/** big out-of-focus fronds that frame the hero corners, like a lens close to a plant */
function Frame() {
  return (
    <div className="hlg-frame" aria-hidden="true">
      {[{ c: 'l', len: 520, bend: 0.35, rot: 18, x: 40, y: 560 }, { c: 'r', len: 480, bend: -0.4, rot: -20, x: 460, y: 560 }].map((f) => (
        <svg key={f.c} className={`hlg-fr hlg-fr-${f.c}`} viewBox="0 0 500 600" focusable="false"><g transform={`translate(${f.x} ${f.y}) rotate(${f.rot})`}><g className="hlg-sway hlg-sw-s"><path className="hlg-frond hlg-f1" d={frond(f.len, f.bend, 16)} /></g></g></svg>
      ))}
    </div>
  );
}

export default function HeroLivingGreen({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const reduced = useReduced();
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
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
  const setQty = (id: string, q: number) => setCart((c) => { const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = q; return n; });
  const add = (id: string, name: string) => { setQty(id, (cart[id] ?? 0) + 1); setLive(`${name} added to basket`); };
  const go = (id: string) => (e: { preventDefault(): void }) => { setMenu(false); jump(id, reduced)(e); };
  const copy = async () => {
    setCopied(true); setLive('Code MOSS10 copied'); window.setTimeout(() => setCopied(false), 2200);
    try { await navigator.clipboard.writeText('MOSS10'); } catch { /* clipboard may be blocked; the code is shown anyway */ }
  };
  return (
    <div ref={root} className={`hlg ${className ?? ''}`}>
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

      <section id="hlg-top" ref={hero} className="hlg-hero" data-sl="exit" aria-labelledby="hlg-h1" tabIndex={-1}>
        <div className="hlg-bg" aria-hidden="true"><Grainient speed={0.5} grain={0.4} /><i className="hlg-sun" /><i className="hlg-table" /></div>
        <div className="hlg-title">
          <h1 id="hlg-h1"><span className="hlg-h-l"><span className="hlg-ln">Skin care</span> <span className="hlg-ln">that keeps</span></span> <span className="hlg-h-r"><em>growing.</em></span></h1>
          <Terrarium />
          <p className="hlg-lede">Moss and fern, fermented slowly into mists, balms and living terrarium kits. Everything arrives with the soil still on it.</p>
        </div>
        <div className="hlg-cta">
          <LiquidMetalButton onClick={() => jump('hlg-shelf', reduced)({ preventDefault() {} })} size={56}>Shop the living shelf</LiquidMetalButton>
          <a className="hlg-ghost" href="#hlg-method" onClick={go('hlg-method')}>How it grows</a>
        </div>
        <ul className="hlg-rail" aria-label="In numbers">{RAIL.map(([n, u, l]) => <li key={l}><b>{n}<small>{u}</small></b><span>{l}</span></li>)}</ul>
        <Atmosphere hero={hero} reduced={reduced} />
        <Frame />
        <GradualBlur edges={['bottom']} size={72} strength={10} layers={6} tint="var(--hg-bg0)" tintOpacity={0.5} />
      </section>

      <section className="hlg-story" aria-labelledby="hlg-hw">
        <h2 id="hlg-hw" className="ha-sr">Why Hollowfern</h2>
        <p className="hlg-kicker">Slow by design</p>
        <ScrollReveal text={STORY} className="hlg-reveal" rail={false} blur={4} dim={0.22} start={0.92} end={0.55} />
        <ul className="hlg-pillars">{PILLARS.map((f, i) => <li key={f.h}><span className="hlg-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><h3>{f.h}</h3><p>{f.p}</p></li>)}</ul>
      </section>

      <section id="hlg-shelf" className="hlg-sec hlg-shelf" aria-labelledby="hlg-hs" tabIndex={-1}><Shelf cart={cart} add={add} say={setLive} /></section>

      <section id="hlg-method" className="hlg-sec hlg-method" data-sl="pass" aria-labelledby="hlg-hm" tabIndex={-1}>
        <p className="hlg-kicker">How a jar is made</p><h2 id="hlg-hm">From the north slope to your shelf, <em>and back.</em></h2>
        <div className="hlg-vine">
          <svg viewBox="0 0 40 1000" preserveAspectRatio="none" aria-hidden="true"><path className="hlg-vine-bg" d="M20 0 C-6 120 46 200 20 330 S-6 560 20 680 46 860 20 1000" /><path className="hlg-vine-fg" pathLength="100" d="M20 0 C-6 120 46 200 20 330 S-6 560 20 680 46 860 20 1000" /></svg>
          <ol>{STEPS.map((s, i) => <li key={s.h} className="hlg-vstep" data-sl="pass"><span className="hlg-node" aria-hidden="true">{i + 1}</span><div><h3>{s.h}</h3><p>{s.p}</p></div></li>)}</ol>
        </div>
      </section>

      <section id="hlg-grove" className="hlg-sec hlg-grove" aria-labelledby="hlg-hg" tabIndex={-1}>
        <div className="hlg-groveinner">
          <h2 id="hlg-hg">Join the <em>grove</em></h2>
          <p>A monthly note from the greenhouse: what is fermenting, what is flowering and when the next batch of sixty is poured. First access to every small drop.</p>
          <Subscribe id="hlg" cls="hlg" hideLabel cta="Join the grove" doneTitle={(e) => `Welcome to the grove, ${e}.`} doneText="Your first note arrives with the next full moon. Unsubscribe whenever you like." />
          <p className="hlg-code">First jar, 10% off with <b>MOSS10</b><button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy code'}</button></p>
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
