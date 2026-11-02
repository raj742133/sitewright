'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Preview } from './_dash';
import { useScheme, Dialog, Subscribe, jump, useReduced } from './_ha-kit';
import { BookForm, type Stay } from './_ha-night-book';
import { CLOCK, DawnArt, Drift, FallbackScene, HangingLantern, useStory, type Story } from './_ha-night';
import NightTempleScene from '../ui/NightTempleScene';
import SplitFlapText from '../ui/SplitFlapText';
import ScrollFloat from '../ui/ScrollFloat';
import ScrollReveal from '../ui/ScrollReveal';
import GlareHover from '../ui/GlareHover';
import LightRays from '../ui/LightRays';
import Grainient from '../ui/Grainient';

/* Lanternfall: a cinematic night-mountain landing page for an invented lantern-lit retreat. The first screen is one full-bleed scene
   (canvas temple, parallax, rain, petals, a lantern you carry with the pointer); scrolling then walks one night from dusk to first light. */

const STAYS: Stay[] = [
  { id: 'ridge', name: 'Ridge House', sleeps: 2, price: 420, note: 'Timber room above the bell terrace, paper screens, a cedar bath that looks at the pass.' },
  { id: 'cedar', name: 'Cedar Annex', sleeps: 4, price: 360, note: 'Two rooms around a gravel courtyard, a low table for supper and a stove that stays lit until morning.' },
  { id: 'bell', name: 'Bell Loft', sleeps: 2, price: 580, note: 'The room under the bell. A skylight, a futon on a raised floor and the quietest hour of the night.' },
];
const STEPS = [
  { t: 'Dusk', h: 'The climb', p: 'Three hundred stone steps, a lantern at every twentieth one, and a guide who walks last. Bring nothing you cannot carry in one hand.' },
  { t: 'Lantern hour', h: 'The bell is struck', p: 'We carry paper lanterns to the upper terrace and set them on the water. The bell sounds once for every guest on the mountain.' },
  { t: 'Midnight', h: 'Silent supper', p: 'Mushroom broth, pickles, rice from the valley below. We eat without talking, then a little tea, then a lot of stars.' },
  { t: 'First light', h: 'The ridge turns rose', p: 'Sit on the east steps while the ridge goes from ink to rose. Coffee is optional, and so is waking up.' },
];
const RITUALS = [
  { h: 'Lantern walk', w: '19:30', p: 'A guided, unhurried loop of the upper terraces with paper lanterns made on site that afternoon.', more: 'Runs nightly at dusk, about 70 minutes, suitable for most mobility levels with the shorter route.' },
  { h: 'Midnight tea', w: '23:30', p: 'Hand-roasted tea at the low table, poured in the order the house has always poured it.', more: 'Served from 23:30 to 00:30. Decaffeinated roasted barley tea is always available.' },
  { h: 'The bell', w: '00:00', p: 'One slow strike at nine, midnight and first light. You hear it in your bones before your ears.', more: 'Guests may ring the midnight bell once. We ask for one strike, no more.' },
  { h: 'Sunrise sit', w: '05:40', p: 'Twenty minutes of nothing, facing the east, with a blanket and a flask of something warm.', more: 'Cushions and blankets are on the steps from 05:00. The sit ends when the first light touches the roof.' },
];
const NAV = [['nt-journey', 'The night'], ['nt-stays', 'Rooms'], ['nt-rituals', 'Rituals'], ['nt-letters', 'Letters']] as const;
const PHASES = [
  { t: '19:10', l: 'Lanterns lit', moon: true }, { t: CLOCK[0], l: STEPS[0]!.t, moon: true }, { t: CLOCK[1], l: STEPS[1]!.t, moon: true },
  { t: CLOCK[2], l: STEPS[2]!.t, moon: true }, { t: CLOCK[3], l: STEPS[3]!.t, moon: false }, { t: '07:30', l: 'Morning', moon: false },
];

const Mark = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2v3M7 6h10l1 3H6zM8 9l-.8 9h9.6L16 9M9 18v3M15 18v3" /></svg>;
const Arrow = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

/** the view from each room, as an arch: layered ridges, a lit window and one signature detail */
function RoomArt({ i }: { i: number }) {
  const id = `hnt-ra${i}`;
  return (
    <svg className="hnt-roomart" viewBox="0 0 300 380" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--ra0)" /><stop offset=".75" stopColor="var(--ra1)" /></linearGradient>
        <radialGradient id={`${id}-g`}><stop offset="0" stopColor="var(--ra-glow)" stopOpacity=".75" /><stop offset="1" stopColor="var(--ra-glow)" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="300" height="380" fill={`url(#${id})`} />
      <circle cx={70 + i * 70} cy={92 - i * 6} r="130" fill={`url(#${id}-g)`} opacity=".55" />
      <circle cx={70 + i * 70} cy={92 - i * 6} r="17" fill="var(--ra-sun)" />
      {[[40, 40], [250, 62], [130, 24], [210, 30], [90, 80]].map(([x, y], k) => <circle key={k} className="hnt-ra-star" cx={x} cy={y} r="1.3" />)}
      <path d="M0 230 Q60 160 120 205 T240 180 T300 200 V380 H0z" fill="var(--ra-far)" />
      <path d="M0 270 Q80 205 150 250 T300 235 V380 H0z" fill="var(--ra-mid)" />
      {i === 0 && <g>
        <rect x="76" y="258" width="150" height="62" fill="var(--ra-bld)" />
        <path d="M54 262 Q150 236 246 262 L226 244 Q150 206 76 244 Z" fill="var(--ra-bld)" />
        {[0, 1, 2, 3].map((k) => <rect key={k} x={92 + k * 34} y="274" width="22" height="34" rx="2" fill="var(--ra-lit)" opacity={0.7 + (k % 2) * 0.25} />)}
        <ellipse cx="256" cy="322" rx="30" ry="9" fill="var(--ra-bld)" /><ellipse cx="256" cy="320" rx="24" ry="6" fill="var(--ra-lit)" opacity=".55" />
      </g>}
      {i === 1 && <g>
        <path d="M0 330 Q150 296 300 330 V380 H0z" fill="var(--ra-lit)" opacity=".28" />
        <rect x="30" y="268" width="92" height="56" fill="var(--ra-bld)" /><path d="M16 272 L76 236 L136 272 Z" fill="var(--ra-bld)" />
        <rect x="190" y="276" width="84" height="48" fill="var(--ra-bld)" /><path d="M176 280 L232 248 L288 280 Z" fill="var(--ra-bld)" />
        <rect x="56" y="284" width="20" height="40" rx="2" fill="var(--ra-lit)" /><rect x="216" y="290" width="18" height="34" rx="2" fill="var(--ra-lit)" />
        <rect x="104" y="244" width="6" height="20" fill="var(--ra-bld)" />
        <path d="M0 380 L0 330 L12 300 L24 330 L24 380Z M276 380 L276 320 L290 284 L300 320 L300 380Z" fill="var(--ra-bld)" />
      </g>}
      {i === 2 && <g>
        <rect x="92" y="236" width="116" height="90" fill="var(--ra-bld)" /><path d="M72 244 Q150 214 228 244 L206 220 Q150 190 94 220 Z" fill="var(--ra-bld)" />
        <rect x="146" y="150" width="8" height="48" fill="var(--ra-bld)" /><path d="M120 200 Q150 178 180 200 L172 150 H128 Z" fill="var(--ra-bld)" opacity=".0" />
        <path d="M132 198 Q150 148 168 198 Z" fill="var(--ra-bld)" /><circle cx="150" cy="204" r="6" fill="var(--ra-lit)" />
        <rect x="124" y="258" width="52" height="68" rx="3" fill="var(--ra-lit)" opacity=".9" />
        <path d="M112 226 L188 226" stroke="var(--ra-lit)" strokeWidth="3" opacity=".55" />
      </g>}
      <path d="M0 340 Q120 316 300 344 V380 H0z" fill="var(--ra-near)" />
    </svg>
  );
}

export default function HeroNightTemple({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const journey = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const litRef = useRef(true);
  const reduced = useReduced();
  const [menu, setMenu] = useState(false);
  const [lit, setLit] = useState(true);
  const [book, setBook] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [live, setLive] = useState('');
  const [story, setStory] = useState<Story>({ step: 0, phase: 0 });
  const [canvasOk, setCanvasOk] = useState(true);
  litRef.current = lit;
  useScheme(root);
  useEffect(() => { try { setCanvasOk(!!document.createElement('canvas').getContext('2d')); } catch { setCanvasOk(false); } }, []);
  const els = useCallback(() => (root.current && hero.current && journey.current && stage.current && nav.current ? { root: root.current, hero: hero.current, journey: journey.current, stage: stage.current, nav: nav.current } : null), []);
  useStory(els, reduced, setStory);
  useEffect(() => {
    if (!menu) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [menu]);
  const raf = useRef(0);
  const move = (e: PointerEvent) => {
    if (reduced || e.pointerType === 'touch' || !hero.current) return;
    const h = hero.current, cx = e.clientX, cy = e.clientY;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const r = h.getBoundingClientRect();
      h.dataset.ptr = '1';
      h.style.setProperty('--lx', `${(cx - r.left).toFixed(0)}px`);
      h.style.setProperty('--ly', `${(cy - r.top).toFixed(0)}px`);
      h.style.setProperty('--mx', (((cx - r.left) / r.width) * 2 - 1).toFixed(3));
      h.style.setProperty('--my', (((cy - r.top) / r.height) * 2 - 1).toFixed(3));
      const t = title.current?.getBoundingClientRect();
      if (t) { h.style.setProperty('--tx', `${(cx - t.left).toFixed(0)}px`); h.style.setProperty('--ty', `${(cy - t.top).toFixed(0)}px`); }
    });
  };
  const leave = () => { hero.current?.removeAttribute('data-ptr'); };
  const go = (id: string) => (e: { preventDefault(): void }) => { setMenu(false); jump(id, reduced)(e); };
  const toggleLit = () => { setLit((v) => !v); setLive(lit ? 'Lanterns put out. Move the pointer to carry a light.' : 'Lanterns lit'); };
  const toStep = (i: number) => {
    const j = journey.current;
    if (!j) return;
    const top = j.getBoundingClientRect().top + window.scrollY, span = j.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * ((i + 0.5) / 4), behavior: reduced ? 'auto' : 'smooth' });
  };
  const ph = PHASES[story.phase] ?? PHASES[0]!;
  return (
    <div ref={root} className={`hnt ${className ?? ''}`} data-lit={lit} data-reduced={reduced || undefined}>
      <header ref={nav} className="hnt-nav" data-tone="night">
        <div className="hnt-bar">
          <a className="hnt-brand" href="#nt-top" onClick={go('nt-top')} aria-label="Lanternfall, back to top"><Mark /><span>Lanternfall</span></a>
          <nav className="hnt-links" aria-label="Sections">{NAV.map(([id, l]) => <a key={id} href={`#${id}`} onClick={go(id)}>{l}</a>)}</nav>
          <p className="hnt-clock" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{ph.moon ? <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></>}</svg><b>{ph.t}</b><span>{ph.l}</span></p>
          <button type="button" className="hnt-pill" onClick={() => setBook('ridge')}>Stay the night</button>
          <button type="button" className="hnt-burger" aria-expanded={menu} aria-controls="hnt-menu" aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu((v) => !v)}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">{menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}</svg></button>
        </div>
        {menu && <div id="hnt-menu" className="hnt-menu">{NAV.map(([id, l]) => <a key={id} href={`#${id}`} onClick={go(id)}>{l}</a>)}<button type="button" className="hnt-cta" onClick={() => { setMenu(false); setBook('ridge'); }}>Stay the night</button></div>}
      </header>

      <section id="nt-top" ref={hero} className="hnt-hero hnt-night" onPointerMove={move} onPointerLeave={leave} aria-labelledby="hnt-h1" tabIndex={-1} data-lit={lit}>
        <div className="hnt-scene" aria-hidden="true">
          <FallbackScene />
          {canvasOk && <NightTempleScene key={lit ? 'on' : 'off'} className="hnt-scene-cv" rain={0.55} mist={0.85} glow={lit ? 0.95 : 0.05} />}
        </div>
        <div className="hnt-moonrays" aria-hidden="true"><LightRays rays={9} speed={0.6} interactive={false} /></div>
        <div className="hnt-dim" aria-hidden="true" />
        <div className="hnt-pool" aria-hidden="true" />
        <Drift reduced={reduced} lit={litRef} />
        <div className="hnt-fg" aria-hidden="true"><HangingLantern /></div>
        <div className="hnt-vig" aria-hidden="true" />
        <div className="hnt-copy">
          <p className="hnt-place"><span aria-hidden="true" />Amane Ridge, 1,140 metres<span aria-hidden="true" /></p>
          <h1 id="hnt-h1" ref={title}><span>Stay until</span><span>first light</span></h1>
          <p className="hnt-lede">Twelve guests, one bell, three hundred stone steps. A lantern-lit retreat for slow evenings, and a sky with nothing in the way.</p>
          <GlareHover className="hnt-ctaglare" intensity={0.55} color="#fff7e3" idleEvery={6}><button type="button" className="hnt-cta hnt-cta-lg" onClick={() => setBook('ridge')}>Stay the night<Arrow /></button></GlareHover>
        </div>
        <div className="hnt-base">
          <dl className="hnt-facts" aria-label="At a glance"><div><dt>Season</dt><dd>Sep to Dec</dd></div><div><dt>Guests a night</dt><dd>12</dd></div></dl>
          <a className="hnt-cue" href="#nt-journey" onClick={go('nt-journey')} aria-label="Follow the night, scroll down"><span>Scroll</span><i aria-hidden="true" /></a>
          <button type="button" className="hnt-lit" aria-pressed={lit} onClick={toggleLit}><i aria-hidden="true" />{lit ? 'Lanterns lit' : 'Lanterns out'}</button>
        </div>
      </section>

      <section id="nt-journey" ref={journey} className="hnt-journey" aria-labelledby="hnt-hj" tabIndex={-1}>
        <div ref={stage} className="hnt-stage hnt-night" data-step={story.step}>
          <DawnArt />
          <div className="hnt-sunrays" aria-hidden="true"><LightRays rays={11} speed={0.5} interactive={false} /></div>
          <div className="hnt-scrim" aria-hidden="true" />
          <div className="hnt-jwrap">
            <div className="hnt-jhead">
              <p className="hnt-kicker">One night on the ridge</p>
              <ScrollFloat as="h2" text="From dusk to first light, slowly." className="hnt-j-h2" stagger={0.55} start={1} end={0.7} />
            </div>
            <div className="hnt-jbody">
              <div className="hnt-flap" role="group" aria-label={`Time on the ridge: ${CLOCK[story.step]}`}>
                <SplitFlapText text={CLOCK[story.step] ?? CLOCK[0]} length={5} size={56} flapMs={70} />
                <span className="hnt-flap-l" aria-hidden="true">{STEPS[story.step]?.t}</span>
              </div>
              <ol className="hnt-steps">
                {STEPS.map((s, i) => (
                  <li key={s.h} className="hnt-step" data-on={i === story.step} aria-hidden={!reduced && i !== story.step ? true : undefined}>
                    <p className="hnt-time">{reduced ? `${CLOCK[i]} · ` : ''}{s.t}</p>
                    <h3>{s.h}</h3>
                    <p>{s.p}</p>
                  </li>
                ))}
              </ol>
            </div>
            <ol className="hnt-track" aria-label="The night, hour by hour">
              {STEPS.map((s, i) => (
                <li key={s.t}><button type="button" aria-current={i === story.step ? 'step' : undefined} onClick={() => toStep(i)}><b>{CLOCK[i]}</b><span>{s.t}</span></button></li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="nt-stays" className="hnt-sec hnt-stays" aria-labelledby="hnt-hs" tabIndex={-1}>
        <div className="hnt-sechead">
          <p className="hnt-kicker">Where you sleep</p>
          <ScrollFloat as="h2" text="Three rooms, none of them loud." className="hnt-h2" stagger={0.5} />
        </div>
        <ul className="hnt-rooms">
          {STAYS.map((s, i) => (
            <li key={s.id} className="hnt-room" style={{ '--i': i } as CSSProperties}>
              <GlareHover className="hnt-arch" intensity={0.42} color="#fff3d6" idleEvery={0}><RoomArt i={i} /></GlareHover>
              <div className="hnt-roombody">
                <h3>{s.name}</h3>
                <p>{s.note}</p>
                <p className="hnt-spec"><span><b>${s.price}</b> a night</span><span>Sleeps {s.sleeps}</span></p>
                <button type="button" className="hnt-link" onClick={() => setBook(s.id)} aria-label={`Reserve ${s.name}`}>Reserve<Arrow /></button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="nt-rituals" className="hnt-sec hnt-rit" aria-labelledby="hnt-hr" tabIndex={-1}>
        <div className="hnt-rit-l">
          <p className="hnt-kicker">What the house does</p>
          <h2 id="hnt-hr" className="ha-sr">Four small rituals</h2>
          <ScrollReveal as="p" className="hnt-reveal" rail={false} blur={4} dim={0.22} start={0.92} end={0.45} text="Four small habits, kept for centuries. None of them is a performance. They are how a mountain house learns to be quiet." />
        </div>
        <ul className="hnt-ritlist">
          {RITUALS.map((r, i) => (
            <li key={r.h} className="hnt-rit-card" data-open={open === i}>
              <span className="hnt-rit-w">{r.w}</span>
              <div>
                <h3>{r.h}</h3><p>{r.p}</p>
                <button type="button" className="hnt-more" aria-expanded={open === i} aria-controls={`hnt-rm-${i}`} onClick={() => setOpen(open === i ? null : i)}>{open === i ? 'Less' : 'The details'}</button>
                <p id={`hnt-rm-${i}`} className="hnt-moretext" hidden={open !== i}>{r.more}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="nt-letters" className="hnt-sec hnt-letters" aria-labelledby="hnt-hl" tabIndex={-1}>
        <div className="hnt-grain" aria-hidden="true"><Grainient speed={0.6} grain={0.45} /></div>
        <figure className="hnt-quote"><blockquote>I fell asleep to the bell and woke to a ridge the colour of a peach. I have not been that quiet since I was nine.</blockquote><figcaption>Marit Oyelaran, three nights in October</figcaption></figure>
        <div className="hnt-letterbox">
          <h2 id="hnt-hl">Letters from the ridge</h2>
          <p>One short note when the first frost arrives and when the lanterns return. No more than six a year.</p>
          <Subscribe id="hnt" cls="hnt" hideLabel cta="Send me the letters" doneTitle={(e) => `The first note is on its way to ${e}.`} doneText="Expect it with the first frost. You can leave at any time." />
        </div>
      </section>

      <footer className="hnt-foot">
        <p className="hnt-word" aria-hidden="true">Lanternfall</p>
        <div className="hnt-foot-row">
          <div><a className="hnt-brand" href="#nt-top" onClick={go('nt-top')}><Mark /><span>Lanternfall</span></a><p>A lantern-lit retreat on Amane Ridge. An invented place for a template.</p></div>
          <nav aria-label="Footer"><a href="#nt-journey" onClick={go('nt-journey')}>The night</a><a href="#nt-stays" onClick={go('nt-stays')}>Rooms</a><a href="#nt-rituals" onClick={go('nt-rituals')}>Rituals</a><button type="button" onClick={() => setBook('ridge')}>Reserve</button><a href="#nt-top" onClick={go('nt-top')}>Back to top</a></nav>
        </div>
        <small>© 2026 Lanternfall. Please tell us about allergies when you book.</small>
      </footer>
      <Dialog open={book !== null} onClose={() => setBook(null)} title="Stay the night" cls="hnt-dlg">{book !== null && <BookForm stays={STAYS} initial={book} onDone={() => setBook(null)} />}</Dialog>
      <div className="ha-sr" role="status" aria-live="polite">{live}</div>
    </div>
  );
}

export function Demo() { return <Preview w={1280} h={190}><HeroNightTemple /></Preview>; }
