'use client';
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import StickerPeel from '../ui/StickerPeel';
import TextCursor from '../ui/TextCursor';
import { Preview } from './_dash';
import { useReducedMotion } from './_shared';
import { PlateDefs } from './_hps-art';
import { Sketchbook } from './_hps-book';
import { Objects, Room, StickerFace, Tabs, type TabItem } from './_hps-desk';
import { Loupe } from './_hps-loupe';
import { About, Work } from './_hps-work';
import { Contact, RatesDialog } from './_hps-contact';

export interface HeroPaperSketchbookProps {
  /** the illustrator's name (invented by default) */
  name?: string;
  className?: string;
}

const TABS: TabItem[] = [{ id: 'hps-book', label: 'Sketchbook', focus: true }, { id: 'hps-loupe', label: 'Loupe' }, { id: 'hps-work', label: 'Commissions' }, { id: 'hps-about', label: 'About' }, { id: 'hps-contact', label: 'Contact' }];
const NOW = ['a book jacket for a salt-marsh essay', 'three tea tins and one teapot', 'a poster for a night tram', 'a wren, four seconds long'];

/** Personal portfolio for an illustrator, built as one desk: the first screen is an open sketchbook whose page corner curls under the pointer, with a loupe over the drawings and the navigation as index tabs. Warm window light by day, a lamp at night. */
export default function HeroPaperSketchbook({ name = 'Odile Marsh', className }: HeroPaperSketchbookProps) {
  const reduced = useReducedMotion();
  const [bar, setBar] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  const desk = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const first = name.split(' ')[0] ?? name;

  const scrollTo = (id: string, focus = false) => {
    const el = root.current?.querySelector<HTMLElement>(`#${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: id === 'hps-book' ? 'center' : 'start' });
    if (focus) window.setTimeout(() => el.focus({ preventScroll: true }), reduced ? 0 : 450);
  };
  const jump = (id: string, focus?: boolean) => (e: MouseEvent) => { e.preventDefault(); scrollTo(id, focus); };

  // the desk leans away a little as the page scrolls, and a slim tab bar takes over once the sketchbook is out of view
  useEffect(() => {
    const h = hero.current;
    if (!h) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const r = h.getBoundingClientRect();
      h.style.setProperty('--sp', Math.min(1, Math.max(0, -r.top / Math.max(1, r.height))).toFixed(3));
      setBar(r.bottom < 80);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(paint); };
    paint();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, []);

  const parallax = (e: React.PointerEvent) => {
    const el = desk.current;
    if (!el || reduced || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', String(((e.clientX - r.left) / r.width - 0.5).toFixed(3)));
    el.style.setProperty('--my', String(((e.clientY - r.top) / r.height - 0.5).toFixed(3)));
  };
  const focusField = (k: string) => root.current?.querySelector<HTMLElement>(`#hps-f-${k}`)?.focus();
  const rates = () => dlg.current?.showModal();

  const lead = (
    <div className="hps-pg hps-title">
      <p className="hps-meta"><span>Sketchbook no. 14</span><span>Porto, 2026</span></p>
      <h1 id="hps-h1" className="hps-h1">
        <span className="hps-ln">Drawn slowly,</span>
        <span className="hps-ln hps-ln2"><em>on purpose.</em><svg viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M4 10C52 3 104 14 156 8S250 4 296 9" /></svg></span>
      </h1>
      <p className="hps-lede">I am {name}, an illustrator in Porto. Ink, watercolour and a lot of tea go into every page, and every page here is a real one from my sketchbook.</p>
      <div className="hps-cta">
        <button type="button" className="hps-btn" onClick={() => scrollTo('hps-work')}>See the commissions<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
        <button type="button" className="hps-link" onClick={rates}>Rates and availability</button>
      </div>
      <p className="hps-now"><span>On the desk now:</span> <TextCursor phrases={NOW} caret="bar" typeMs={64} holdMs={2200} /></p>
      <ul className="hps-facts" aria-label="At a glance">
        <li><b>11</b><span>years in print</span></li>
        <li><b>140+</b><span>commissions</span></li>
        <li><b>Jan</b><span>next open slot</span></li>
      </ul>
      <div className="hps-sticker"><StickerPeel width={124} height={124} radius={62} rotate={-9} corner="br" hoverPeel={0.5} backing="#e9dcc3" label="Original drawings sticker"><StickerFace /></StickerPeel></div>
    </div>
  );

  return (
    <div ref={root} className={`hps ${className ?? ''}`} data-motion={reduced ? 'off' : 'on'}>
      <PlateDefs />
      <span className="hps-grain" aria-hidden="true" />
      <header className="hps-top">
        <a href="#hps-top" className="hps-brand" onClick={jump('hps-top')}><span>{name}</span><small>illustrator, Porto</small></a>
        <button type="button" className="hps-btn hps-btn-sm hps-btn-ghost" onClick={rates}>Rates</button>
      </header>
      <nav className="hps-bar" aria-label="Sections" data-on={bar ? 'true' : undefined} {...(bar ? {} : { inert: true })}>
        <a href="#hps-top" className="hps-brand" onClick={jump('hps-top')}><span>{name}</span></a>
        <div className="hps-bar-links">{TABS.map((t) => <a key={t.id} href={`#${t.id}`} onClick={jump(t.id, t.focus)}>{t.label}</a>)}</div>
        <button type="button" className="hps-btn hps-btn-sm" onClick={rates}>Rates</button>
      </nav>

      <main id="hps-top" tabIndex={-1}>
        <section ref={hero} className="hps-hero" aria-label={`${name}'s sketchbook`}>
          <Room />
          <div className="hps-desk" ref={desk} onPointerMove={parallax} style={{ '--mx': 0, '--my': 0 } as CSSProperties}>
            <Objects />
            <Sketchbook reduced={reduced} name={name} lead={lead} />
            <Tabs items={TABS} onJump={jump} />
          </div>
        </section>
        <section id="hps-loupe" tabIndex={-1} className="hps-sec hps-loupe-sec" aria-label="Magnifier"><Loupe name={first} /></section>
        <Work />
        <About />
        <Contact first={first} focusField={focusField} />
      </main>

      <footer className="hps-foot">
        <p className="hps-sign" aria-hidden="true">{first}</p>
        <span>&copy; 2026 {name}. Every drawing remains the artist&rsquo;s.</span>
        <button type="button" className="hps-btn hps-btn-ghost hps-btn-sm" onClick={() => scrollTo('hps-top')}>Back to top</button>
      </footer>

      <RatesDialog dlg={dlg} onAsk={() => scrollTo('hps-contact', true)} />
    </div>
  );
}

export function Demo() {
  return <Preview w={1280} h={190}><HeroPaperSketchbook /></Preview>;
}
