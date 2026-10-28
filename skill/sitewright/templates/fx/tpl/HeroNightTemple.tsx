'use client';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Preview } from './_dash';
import { Dialog, Subscribe, jump, useReduced, useScrollLinked } from './_ha-kit';
import { BookForm, type Stay } from './_ha-night-book';
import { Embers, NightLand, NightSky } from './_ha-night';

/* Lanternfall: a cinematic night-mountain landing page for an invented lantern-lit mountain retreat. The scene is drawn in SVG and
   canvas, the sections are scroll-linked, every button opens a dialog, toggles the lanterns or scrolls to a section. */

const STAYS: Stay[] = [
  { id: 'ridge', name: 'Ridge House', sleeps: 2, price: 420, note: 'Timber room above the bell terrace, paper screens, a cedar bath that looks at the pass.' },
  { id: 'cedar', name: 'Cedar Annex', sleeps: 4, price: 360, note: 'Two rooms around a gravel courtyard, a low table for supper and a stove that stays lit until morning.' },
  { id: 'bell', name: 'Bell Loft', sleeps: 2, price: 580, note: 'The room under the bell. A skylight, a futon on a raised floor and the quietest hour of the night.' },
];
const STEPS = [
  { t: 'Dusk', h: 'The climb', p: 'Three hundred stone steps, a lantern at every twentieth one, and a guide who walks last. Bring nothing you cannot carry in one hand.' },
  { t: 'Nine o’clock', h: 'Lantern hour', p: 'We carry paper lanterns to the upper terrace and set them on the water. The bell is struck once for every guest on the mountain.' },
  { t: 'Midnight', h: 'Silent supper', p: 'Mushroom broth, pickles, rice from the valley below. We eat without talking, then a little tea, then a lot of stars.' },
  { t: 'Before dawn', h: 'The first light', p: 'Sit on the east steps while the ridge turns from ink to rose. Coffee is optional, and so is waking up.' },
];
const RITUALS = [
  { h: 'Lantern walk', p: 'A guided, unhurried loop of the upper terraces with paper lanterns made on site that afternoon.', more: 'Runs nightly at dusk, about 70 minutes, suitable for most mobility levels with the shorter route.', d: 'M12 3v3M8 7h8l1 3-1 8H8l-1-8zM10 21h4' },
  { h: 'Midnight tea', p: 'Hand-roasted tea at the low table, poured in the order the house has always poured it.', more: 'Served from 23:30 to 00:30. Decaffeinated roasted barley tea is always available.', d: 'M5 9h11v4a5 5 0 01-5 5H10a5 5 0 01-5-5zM16 10h2a2 2 0 010 4h-2M8 3c0 2 2 2 2 4M12 3c0 2 2 2 2 4' },
  { h: 'Bell at hour', p: 'One slow strike at nine, midnight and first light. You hear it in your bones before your ears.', more: 'Guests may ring the midnight bell once. We ask for one strike, no more.', d: 'M6 17h12l-1.5-2V10a4.5 4.5 0 00-9 0v5zM10 20a2 2 0 004 0M12 3v2' },
  { h: 'Sunrise sit', p: 'Twenty minutes of nothing, facing the east, with a blanket and a flask of something warm.', more: 'Cushions and blankets are on the steps from 05:00. The sit ends when the first light touches the roof.', d: 'M4 17h16M7 17a5 5 0 0110 0M12 4v3M5.5 8.5l2 2M18.5 8.5l-2 2' },
];
const NAV = [['nt-journey', 'The night'], ['nt-stays', 'Rooms'], ['nt-rituals', 'Rituals'], ['nt-letters', 'Letters']] as const;
const Mark = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2v3M7 6h10l1 3H6zM8 9l-.8 9h9.6L16 9M9 18v3M15 18v3" /></svg>;

function RoomArt({ i }: { i: number }) {
  return (
    <svg className="hnt-roomart" viewBox="0 0 240 150" aria-hidden="true">
      <rect className="hnt-ra-sky" width="240" height="150" />
      <circle className="hnt-ra-moon" cx={60 + i * 50} cy="38" r="14" />
      <path className="hnt-ra-far" d="M0 100 Q50 54 100 84 T200 70 T240 86 V150 H0z" />
      <path className="hnt-ra-hill" d="M0 120 Q60 70 120 104 T240 92 V150 H0z" />
      <circle className="hnt-ra-halo" cx="120" cy="112" r="42" />
      {[[30, 20], [170, 30], [210, 52], [96, 18], [140, 14]].map(([x, y], k) => <circle key={k} className="hnt-ra-star" cx={x} cy={y} r="1.2" />)}
      <path className="hnt-ra-roof" d={`M${70 - i * 6} 94 L120 70 L${170 + i * 6} 94 Z`} />
      <rect className="hnt-ra-wall" x={82 - i * 5} y="94" width={76 + i * 10} height="34" />
      <rect className="hnt-ra-glow" x="108" y="100" width="24" height="28" rx="2" />
      {i === 2 && <path className="hnt-ra-wall" d="M120 52v18M114 52h12" />}
    </svg>
  );
}

export default function HeroNightTemple({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const reduced = useReduced();
  const [banner, setBanner] = useState(true);
  const [menu, setMenu] = useState(false);
  const [lit, setLit] = useState(true);
  const [book, setBook] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [live, setLive] = useState('');
  useScrollLinked(root, reduced);
  useEffect(() => {
    if (!menu) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [menu]);
  const move = (e: PointerEvent) => {
    if (reduced || e.pointerType === 'touch' || !hero.current) return;
    const r = hero.current.getBoundingClientRect();
    hero.current.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    hero.current.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };
  const go = (id: string) => (e: { preventDefault(): void }) => { setMenu(false); jump(id, reduced)(e); };
  const toggleLit = () => { setLit((v) => !v); setLive(lit ? 'Lanterns put out' : 'Lanterns lit'); };
  return (
    <div ref={root} className={`hnt ${className ?? ''}`} data-lit={lit}>
      {banner && (
        <div className="hnt-banner" role="region" aria-label="Announcement">
          <p>Autumn lantern season: <b>14 nights</b> left at the ridge house.</p>
          <button type="button" className="hnt-bannerbtn" onClick={() => setBook('ridge')}>Reserve one</button>
          <button type="button" className="hnt-bannerx" aria-label="Dismiss announcement" onClick={() => setBanner(false)}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
      )}
      <header className="hnt-nav">
        <a className="hnt-brand" href="#nt-top" onClick={go('nt-top')} aria-label="Lanternfall, back to top"><Mark /><span>Lanternfall</span></a>
        <nav className="hnt-links" aria-label="Sections">{NAV.map(([id, l]) => <a key={id} href={`#${id}`} onClick={go(id)}>{l}</a>)}</nav>
        <button type="button" className="hnt-pill" onClick={() => setBook('ridge')}>Plan a stay</button>
        <button type="button" className="hnt-burger" aria-expanded={menu} aria-controls="hnt-menu" onClick={() => setMenu((v) => !v)}><span className="ha-sr">{menu ? 'Close menu' : 'Open menu'}</span><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}</svg></button>
        {menu && <div id="hnt-menu" className="hnt-menu">{NAV.map(([id, l]) => <a key={id} href={`#${id}`} onClick={go(id)}>{l}</a>)}<button type="button" className="hnt-cta" onClick={() => { setMenu(false); setBook('ridge'); }}>Plan a stay</button></div>}
      </header>

      <section id="nt-top" ref={hero} className="hnt-hero" data-sl="exit" onPointerMove={move} aria-labelledby="hnt-h1" tabIndex={-1}>
        <NightSky />
        <NightLand lit={lit} />
        <Embers root={root} reduced={reduced} lit={lit} />
        <div className="hnt-vig" aria-hidden="true" />
        <div className="hnt-copy">
          <p className="hnt-eyebrow"><span aria-hidden="true" />Amane Ridge, 1,140 metres</p>
          <h1 id="hnt-h1">The mountain keeps the night awake.</h1>
          <p className="hnt-lede">Twelve guests, one bell, three hundred stone steps. Lanternfall is a lantern-lit retreat for slow evenings: a candle-lit climb, a silent supper, and a sky with nothing in the way.</p>
          <div className="hnt-actions">
            <button type="button" className="hnt-cta" onClick={() => setBook('ridge')}>Plan your stay</button>
            <a className="hnt-ghost" href="#nt-journey" onClick={go('nt-journey')}>Follow the night<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg></a>
          </div>
          <button type="button" className="hnt-lit" aria-pressed={lit} onClick={toggleLit}><i aria-hidden="true" />{lit ? 'Lanterns lit' : 'Lanterns out'}<span className="ha-sr">, toggle</span></button>
        </div>
        <dl className="hnt-facts" aria-label="At a glance">
          <div><dt>Altitude</dt><dd>1,140 m</dd></div><div><dt>Guests a night</dt><dd>12</dd></div><div><dt>Season</dt><dd>Sep to Dec</dd></div>
        </dl>
      </section>

      <section id="nt-journey" className="hnt-sec hnt-journey" data-sl="pass" aria-labelledby="hnt-hj" tabIndex={-1}>
        <div className="hnt-sticky">
          <p className="hnt-kicker">One night on the ridge</p>
          <h2 id="hnt-hj">From dusk to first light, slowly.</h2>
          <div className="hnt-dial" aria-hidden="true"><svg viewBox="0 0 160 160"><circle className="hnt-dial-ring" cx="80" cy="80" r="70" /><circle className="hnt-dial-arc" cx="80" cy="80" r="70" pathLength="100" /><path className="hnt-dial-moon" d="M92 52a30 30 0 1 0 0 56a24 24 0 1 1 0-56z" /><g className="hnt-dial-orbit"><circle className="hnt-dial-dot" cx="80" cy="10" r="6" /></g></svg></div>
        </div>
        <ol className="hnt-steps-list">
          {STEPS.map((s, i) => (
            <li key={s.h} data-sl="pass" className="hnt-step"><span className="hnt-num" aria-hidden="true">0{i + 1}</span><div><p className="hnt-time">{s.t}</p><h3>{s.h}</h3><p>{s.p}</p></div></li>
          ))}
        </ol>
      </section>

      <section id="nt-stays" className="hnt-sec" aria-labelledby="hnt-hs" tabIndex={-1}>
        <p className="hnt-kicker">Where you sleep</p>
        <h2 id="hnt-hs">Three rooms, none of them loud.</h2>
        <ul className="hnt-cards">
          {STAYS.map((s, i) => (
            <li key={s.id} className="hnt-card" style={{ '--i': i } as CSSProperties}>
              <RoomArt i={i} />
              <div className="hnt-cardbody">
                <h3>{s.name}</h3><p>{s.note}</p>
                <div className="hnt-cardfoot"><span><b>${s.price}</b> / night</span><span>Sleeps {s.sleeps}</span></div>
                <button type="button" className="hnt-ghost" onClick={() => setBook(s.id)}>Reserve {s.name}</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="nt-rituals" className="hnt-sec hnt-rit" aria-labelledby="hnt-hr" tabIndex={-1}>
        <p className="hnt-kicker">What the house does</p>
        <h2 id="hnt-hr">Four small rituals, kept for centuries.</h2>
        <ul className="hnt-ritgrid">
          {RITUALS.map((r, i) => (
            <li key={r.h} className="hnt-rit-card" data-open={open === i}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={r.d} /></svg>
              <h3>{r.h}</h3><p>{r.p}</p>
              <button type="button" className="hnt-more" aria-expanded={open === i} aria-controls={`hnt-rm-${i}`} onClick={() => setOpen(open === i ? null : i)}>{open === i ? 'Less' : 'The details'}</button>
              <p id={`hnt-rm-${i}`} className="hnt-moretext" hidden={open !== i}>{r.more}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="nt-letters" className="hnt-sec hnt-letters" aria-labelledby="hnt-hl" tabIndex={-1}>
        <figure className="hnt-quote"><blockquote>I fell asleep to the bell and woke to a ridge the colour of a peach. I have not been that quiet since I was nine.</blockquote><figcaption>Marit Oyelaran, stayed three nights in October</figcaption></figure>
        <div className="hnt-letterbox">
          <h2 id="hnt-hl">Letters from the ridge</h2>
          <p>One short note when the first frost arrives and when the lanterns return. No more than six a year.</p>
          <Subscribe id="hnt" cls="hnt" cta="Send me the letters" doneTitle={(e) => `The first note is on its way to ${e}.`} doneText="Expect it with the first frost. You can leave at any time." />
        </div>
      </section>

      <footer className="hnt-foot">
        <div><a className="hnt-brand" href="#nt-top" onClick={go('nt-top')}><Mark /><span>Lanternfall</span></a><p>A lantern-lit retreat on Amane Ridge. An invented place for a template.</p></div>
        <nav aria-label="Footer"><a href="#nt-journey" onClick={go('nt-journey')}>The night</a><a href="#nt-stays" onClick={go('nt-stays')}>Rooms</a><a href="#nt-rituals" onClick={go('nt-rituals')}>Rituals</a><button type="button" onClick={() => setBook('ridge')}>Reserve</button><a href="#nt-top" onClick={go('nt-top')}>Back to top</a></nav>
        <small>© 2026 Lanternfall. Please tell us about allergies when you book.</small>
      </footer>
      <Dialog open={book !== null} onClose={() => setBook(null)} title="Plan your stay" cls="hnt-dlg">{book !== null && <BookForm stays={STAYS} initial={book} onDone={() => setBook(null)} />}</Dialog>
      <div className="ha-sr" role="status" aria-live="polite">{live}</div>
    </div>
  );
}

export function Demo() { return <Preview w={1280} h={190}><HeroNightTemple /></Preview>; }
