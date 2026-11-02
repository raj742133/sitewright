'use client';
import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Preview } from './_dash';
import { Dialog, Subscribe, jump, useReduced } from './_ha-kit';
import { BOOKS, Cover } from './_ha-books';
import { Player } from './_ha-poster';
import { Book3D, HeroCover, useBookStage } from './_hbs-book3d';
import LogoLoop, { type Logo } from '../ui/LogoLoop';
import ScrollFloat from '../ui/ScrollFloat';
import VariableProximity from '../ui/VariableProximity';

/* Quillfold Press: an editorial book and publishing landing page on a 12-column grid. The first screen is a tall 3D book that the
   headline crosses (ink on the page, paper-coloured on the cover), a narrow column of small-caps facts, a lede, one action and a band of
   review quotes. Below: the autumn list (a tab list of six covers with a detail panel), an audio piece with a canvas poster and a
   seekable transcript, three reasons to subscribe, a newsletter and a finishing footer. Library parts: LogoLoop, ScrollFloat, VariableProximity. */

const NAV = [['hbs-list', 'The list'], ['hbs-listen', 'Listen'], ['hbs-letter', 'The letter']] as const;
const PERKS = [
  { n: '01', h: 'The Quarterly Shelf', p: 'Four books a year, chosen by the editors, sent with a handwritten note and a bookmark we printed ourselves.' },
  { n: '02', h: 'Translator’s notes', p: 'Every translated title ships with a short essay from the translator about what could not be carried across.' },
  { n: '03', h: 'Readings in rooms', p: 'Small evening readings in bookshops and kitchens, never more than forty chairs, always with soup.' },
];
const QUOTES: [string, string][] = [
  ['A novel that rewards patience.', 'Harbour Review'],
  ['Sewn like it matters, and it does.', 'The Bindery Weekly'],
  ['The quietest list in print.', 'Lanternlight'],
  ['I read it twice, slowly.', 'Marginalia Monthly'],
  ['Beautiful objects, with the words to match.', 'The Paper Ledger'],
  ['Small press, large attention.', 'Northfield Post'],
];
const LOGOS: Logo[] = QUOTES.map(([q, s]) => ({ name: q, node: <cite>{s}</cite> }));
const FEATURED = BOOKS[0]!;
const SPINES: Record<string, { bg: string; fg: string }> = Object.fromEntries(BOOKS.map((b) => [b.id, { bg: b.id === 'salt' ? '#14304a' : b.paper, fg: b.id === 'salt' ? '#f1e7d0' : b.ink }]));
type Panel = { k: 'excerpt'; id: string } | { k: 'list' } | null;

function Lines() {
  return (
    <>
      <span className="hbs-ln"><span>Read slower.</span></span>
      <span className="hbs-ln"><span><i>Keep longer.</i></span></span>
    </>
  );
}

export default function HeroBookShowcase({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReduced();
  const [menu, setMenu] = useState(false);
  const [sel, setSel] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [live, setLive] = useState('');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const refs = { hero: useRef<HTMLElement>(null), stage: useRef<HTMLDivElement>(null), book: useRef<HTMLDivElement>(null), hl: useRef<HTMLDivElement>(null), over: useRef<HTMLDivElement>(null), ink: useRef<HTMLHeadingElement>(null), floor: useRef<HTMLDivElement>(null) };
  const stageRefs = useRef(refs).current;
  useBookStage(stageRefs, reduced);
  const b = BOOKS[sel]!;
  const go = (id: string) => (e: { preventDefault(): void }) => { setMenu(false); jump(id, reduced)(e); };
  const toggle = (id: string, title: string) => setSaved((s) => { const has = s.includes(id); setLive(has ? `${title} removed from reading list` : `${title} added to reading list`); return has ? s.filter((x) => x !== id) : [...s, id]; });
  const key = (e: KeyboardEvent, i: number) => {
    const n = BOOKS.length;
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : e.key === 'Home' ? -99 : e.key === 'End' ? 99 : 0;
    if (!d) return;
    e.preventDefault();
    const k = d === -99 ? 0 : d === 99 ? n - 1 : (i + d + n) % n;
    setSel(k); tabs.current[k]?.focus();
  };
  const pb = panel?.k === 'excerpt' ? BOOKS.find((x) => x.id === panel.id) : undefined;
  return (
    <div ref={root} className={`hbs ${className ?? ''}`}>
      <header className="hbs-nav">
        <a className="hbs-brand" href="#hbs-top" onClick={go('hbs-top')} aria-label="Quillfold Press, back to top"><span>Quillfold</span><small>Press</small></a>
        <nav className="hbs-links" aria-label="Sections">{NAV.map(([id, l]) => <a key={id} href={`#${id}`} onClick={go(id)}>{l}</a>)}</nav>
        <button type="button" className="hbs-listbtn" onClick={() => setPanel({ k: 'list' })}>Reading list<b data-n={saved.length}>{saved.length}</b></button>
        <button type="button" className="hbs-burger" aria-expanded={menu} aria-controls="hbs-menu" aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu((v) => !v)}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}</svg></button>
        {menu && <div id="hbs-menu" className="hbs-menu">{NAV.map(([id, l]) => <a key={id} href={`#${id}`} onClick={go(id)}>{l}</a>)}</div>}
      </header>

      <main>
        <section id="hbs-top" ref={refs.hero} className="hbs-hero" aria-labelledby="hbs-h1" tabIndex={-1}>
          <div className="hbs-grain" aria-hidden="true" />
          <div className="hbs-wrap">
            <ul className="hbs-run" aria-label="This edition"><li>Autumn list 2026</li><li>Fiction, essays, poems</li><li>Twelve new books</li></ul>
            <div className="hbs-hl" ref={refs.hl}>
              <h1 id="hbs-h1" ref={refs.ink} className="hbs-h1"><Lines /></h1>
              <div className="hbs-h1 hbs-h1-over" ref={refs.over} aria-hidden="true"><Lines /></div>
            </div>
            <div className="hbs-stage" ref={refs.stage}>
              <div className="hbs-floor" ref={refs.floor} aria-hidden="true" />
              <div className="hbs-stage3d" aria-hidden="true"><Book3D b={FEATURED} cover={<HeroCover />} bookRef={refs.book} spine={SPINES.salt} /></div>
              <button type="button" className="hbs-bookbtn" onClick={() => setPanel({ k: 'excerpt', id: FEATURED.id })} aria-label={`Read an excerpt of ${FEATURED.title}, by ${FEATURED.author}`}><span aria-hidden="true">Read the first page</span></button>
            </div>
            <div className="hbs-intro">
              <p className="hbs-lede">Quillfold publishes twelve books a year, set by hand, sewn rather than glued and written by people who took their time.</p>
              <div className="hbs-actions">
                <a className="hbs-cta" href="#hbs-list" onClick={go('hbs-list')}>Browse the autumn list<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></a>
                <a className="hbs-link" href="#hbs-listen" onClick={go('hbs-listen')}>Hear an author first</a>
              </div>
            </div>
            <dl className="hbs-spec" aria-label={`About ${FEATURED.title}`}>
              <div><dt>On the cover</dt><dd>{FEATURED.title}</dd></div>
              <div><dt>Author</dt><dd>{FEATURED.author}</dd></div>
              <div><dt>Form</dt><dd>{FEATURED.form}, {FEATURED.pages} pp.</dd></div>
              <div><dt>Price</dt><dd className="hbs-num-s">${FEATURED.price}.00</dd></div>
            </dl>
          </div>
          <section className="hbs-quotes" aria-label="What readers and critics say">
            <LogoLoop logos={LOGOS} speed={44} gap={72} logoHeight={36} fade label="Reviews" />
          </section>
        </section>

        <section id="hbs-list" className="hbs-shelf" aria-label="The autumn list" tabIndex={-1}>
          <div className="hbs-wrap">
            <p className="hbs-sec">01<span>The autumn list</span></p>
            <VariableProximity as="h2" className="hbs-vp" text="Six books. Choose slowly." radius={190} />
            <p className="hbs-aside">Pick a cover. Each one opens a longer note, a first page and a place on your reading list.</p>
            <div className="hbs-row" role="tablist" aria-label="Autumn list, choose a book" aria-orientation="horizontal">
              {BOOKS.map((x, i) => (
                <button key={x.id} ref={(el) => { tabs.current[i] = el; }} type="button" role="tab" id={`hbs-tab-${i}`} aria-selected={sel === i} aria-controls="hbs-panel" tabIndex={sel === i ? 0 : -1} className="hbs-book" onClick={() => setSel(i)} onKeyDown={(e) => key(e, i)} aria-label={`${x.title}, ${x.author}`}>
                  <Cover b={x} />
                  <span className="hbs-bn" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                </button>
              ))}
            </div>
            <div id="hbs-panel" className="hbs-detail" role="tabpanel" aria-labelledby={`hbs-tab-${sel}`} key={b.id}>
              <div className="hbs-d3" aria-hidden="true" style={{ '--bw': '168px', '--bh': '252px', '--bd': '30px' } as CSSProperties}><div className="hbs-stage3d"><Book3D b={b} cover={<Cover b={b} />} spine={SPINES[b.id]} /></div></div>
              <div className="hbs-dtext">
                <p className="hbs-meta">{b.form}</p>
                <h3>{b.title}</h3>
                <p className="hbs-by">by {b.author}</p>
                <p className="hbs-blurb">{b.blurb}</p>
              </div>
              <div className="hbs-buy">
                <dl><div><dt>Pages</dt><dd>{b.pages}</dd></div><div><dt>Published</dt><dd>{b.year}</dd></div><div><dt>Price</dt><dd>${b.price}.00</dd></div></dl>
                <button type="button" className="hbs-cta" onClick={() => setPanel({ k: 'excerpt', id: b.id })}>Read an excerpt</button>
                <button type="button" className="hbs-ghost" aria-pressed={saved.includes(b.id)} onClick={() => toggle(b.id, b.title)}>{saved.includes(b.id) ? 'On your list' : 'Add to reading list'}</button>
              </div>
            </div>
          </div>
        </section>

        <section id="hbs-listen" className="hbs-listen" aria-label="Listen" tabIndex={-1}>
          <div className="hbs-wrap">
            <div className="hbs-lhead">
              <p className="hbs-sec">02<span>The Quillfold hour</span></p>
              <ScrollFloat as="h2" className="hbs-h2" text="Hear the author before you read the book." />
              <p className="hbs-aside">Six minutes with Ines Valcourt on the tide that did not arrive. Press play, scrub, or jump to a line in the transcript.</p>
            </div>
            <Player reduced={reduced} />
          </div>
        </section>

        <section className="hbs-perks" aria-label="Ways to read with us">
          <div className="hbs-wrap">
            <p className="hbs-sec">03<span>Ways to read with us</span></p>
            <ul>{PERKS.map((p) => <li key={p.n}><span className="hbs-num" aria-hidden="true">{p.n}</span><h3>{p.h}</h3><p>{p.p}</p></li>)}</ul>
          </div>
        </section>

        <section id="hbs-letter" className="hbs-letter" aria-label="The Margin Letter" tabIndex={-1}>
          <div className="hbs-wrap">
            <div className="hbs-lcopy">
              <p className="hbs-sec">04<span>The Margin Letter</span></p>
              <ScrollFloat as="h2" className="hbs-h2" text="One good paragraph, every other Friday." />
              <p className="hbs-aside">A paragraph we loved, a book we are reading and the occasional correction. No tracking pixels, no discounts shouted in capitals.</p>
            </div>
            <Subscribe id="hbs" cls="hbs" cta="Subscribe" doneTitle={(e) => `You are on the list, ${e}.`} doneText="The next Margin Letter arrives on Friday. Reply to any of them; a real editor reads the answers." />
          </div>
        </section>
      </main>

      <footer className="hbs-foot">
        <div className="hbs-wrap">
          <a className="hbs-brand" href="#hbs-top" onClick={go('hbs-top')} aria-label="Quillfold Press, back to top"><span>Quillfold</span><small>Press</small></a>
          <p className="hbs-fnote">Independent publishers of fiction, essays and poems. Set by hand, sewn rather than glued.</p>
          <nav aria-label="Footer"><a href="#hbs-list" onClick={go('hbs-list')}>The list</a><a href="#hbs-listen" onClick={go('hbs-listen')}>Listen</a><a href="#hbs-letter" onClick={go('hbs-letter')}>The letter</a><button type="button" onClick={() => setPanel({ k: 'list' })}>Reading list</button><a href="#hbs-top" onClick={go('hbs-top')}>Back to top</a></nav>
          <p className="hbs-mark" aria-hidden="true">Quillfold</p>
          <small>© 2026 Quillfold Press, an invented publisher for a template. Every title and author here is fictional.</small>
        </div>
      </footer>

      <Dialog open={panel !== null} onClose={() => setPanel(null)} title={pb ? pb.title : 'Your reading list'} cls="hbs-dlg">
        {pb && <div className="hbs-excerpt"><p className="hbs-by">An excerpt from {pb.title}, by {pb.author}</p>{pb.excerpt.map((t) => <p key={t}>{t}</p>)}<button type="button" className="hbs-ghost" aria-pressed={saved.includes(pb.id)} onClick={() => toggle(pb.id, pb.title)}>{saved.includes(pb.id) ? 'On your list' : 'Add to reading list'}</button></div>}
        {panel?.k === 'list' && (saved.length ? <ul className="hbs-saved">{saved.map((id) => { const s = BOOKS.find((x) => x.id === id)!; return <li key={id}><span className="hbs-mini"><Cover b={s} title={false} /></span><div><b>{s.title}</b><small>{s.author}, ${s.price}</small></div><button type="button" className="hbs-ghost" onClick={() => toggle(id, s.title)} aria-label={`Remove ${s.title}`}>Remove</button></li>; })}</ul> : <p className="hbs-emptyl">Nothing saved yet. Choose a cover from the autumn list and add it here.</p>)}
      </Dialog>
      <div className="ha-sr" role="status" aria-live="polite">{live}</div>
    </div>
  );
}

export function Demo() { return <Preview w={1280} h={190}><HeroBookShowcase /></Preview>; }
