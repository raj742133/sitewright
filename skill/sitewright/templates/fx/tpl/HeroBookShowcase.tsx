'use client';
import { useRef, useState, type KeyboardEvent } from 'react';
import { Preview } from './_dash';
import { Dialog, Subscribe, jump, useReduced, useScrollLinked } from './_ha-kit';
import { BOOKS, Cover } from './_ha-books';
import { Player } from './_ha-poster';

/* Quillfold Press: an editorial book and publishing landing page. Big serif type, a fan of six invented covers drawn in SVG that
   works as a tab list, a reading list with a dialog, a media panel with a canvas poster and a seekable transcript, and a newsletter. */

const NAV = [['hbs-list', 'The list'], ['hbs-listen', 'Listen'], ['hbs-letter', 'The letter']] as const;
const PERKS = [
  { n: '01', h: 'The Quarterly Shelf', p: 'Four books a year, chosen by the editors, sent with a handwritten note and a bookmark we printed ourselves.' },
  { n: '02', h: 'Translator’s notes', p: 'Every translated title ships with a short essay from the translator about what could not be carried across.' },
  { n: '03', h: 'Readings in rooms', p: 'Small evening readings in bookshops and kitchens, never more than forty chairs, always with soup.' },
];
type Panel = { k: 'excerpt'; id: string } | { k: 'list' } | null;

export default function HeroBookShowcase({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReduced();
  const [banner, setBanner] = useState(true);
  const [menu, setMenu] = useState(false);
  const [sel, setSel] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [live, setLive] = useState('');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  useScrollLinked(root, reduced);
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
      {banner && (
        <div className="hbs-banner" role="region" aria-label="Announcement">
          <p>New this season: <b>three debut novels</b>. Free shipping on orders over $30.</p>
          <a href="#hbs-list" onClick={go('hbs-list')}>Browse the list</a>
          <button type="button" className="hbs-bannerx" aria-label="Dismiss announcement" onClick={() => setBanner(false)}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
      )}
      <header className="hbs-nav">
        <a className="hbs-brand" href="#hbs-top" onClick={go('hbs-top')} aria-label="Quillfold Press, back to top"><span>Quillfold</span><small>Press</small></a>
        <nav className="hbs-links" aria-label="Sections">{NAV.map(([id, l]) => <a key={id} href={`#${id}`} onClick={go(id)}>{l}</a>)}</nav>
        <button type="button" className="hbs-listbtn" onClick={() => setPanel({ k: 'list' })}>Reading list<b data-n={saved.length}>{saved.length}</b></button>
        <button type="button" className="hbs-burger" aria-expanded={menu} aria-controls="hbs-menu" aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu((v) => !v)}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}</svg></button>
        {menu && <div id="hbs-menu" className="hbs-menu">{NAV.map(([id, l]) => <a key={id} href={`#${id}`} onClick={go(id)}>{l}</a>)}</div>}
      </header>

      <section id="hbs-top" className="hbs-hero" data-sl="exit" aria-labelledby="hbs-h1" tabIndex={-1}>
        <div className="hbs-rules" aria-hidden="true" />
        <svg className="hbs-seal" viewBox="0 0 120 120" aria-hidden="true"><defs><path id="hbs-circ" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1 -88 0" /></defs><g className="hbs-seal-spin"><text><textPath href="#hbs-circ">Autumn list · Twelve new books · Autumn list · Twelve new books ·</textPath></text></g><circle cx="60" cy="60" r="24" /><path d="M48 66c4-14 14-22 26-24-1 14-10 24-26 24zM48 66l12-12" /></svg>
        <div className="hbs-hl">
          <p className="hbs-eyebrow">Independent publishers of fiction, essays and poems</p>
          <h1 id="hbs-h1"><span>Read slower.</span><span><i>Keep longer.</i></span></h1>
        </div>
        <div className="hbs-side">
          <p>Quillfold publishes twelve books a year, set by hand, sewn rather than glued and written by people who took their time. Start with the autumn list.</p>
          <div className="hbs-actions">
            <a className="hbs-cta" href="#hbs-list" onClick={go('hbs-list')}>Browse the autumn list</a>
            <a className="hbs-ghost" href="#hbs-listen" onClick={go('hbs-listen')}>Hear an author</a>
          </div>
        </div>
      </section>

      <section id="hbs-list" className="hbs-shelf" aria-label="The autumn list" tabIndex={-1}>
        <div className="hbs-row" role="tablist" aria-label="Autumn list, choose a book" aria-orientation="horizontal">
          {BOOKS.map((x, i) => (
            <button key={x.id} ref={(el) => { tabs.current[i] = el; }} type="button" role="tab" id={`hbs-tab-${i}`} aria-selected={sel === i} aria-controls="hbs-panel" tabIndex={sel === i ? 0 : -1} className="hbs-book" style={{ '--i': i - 2.5, '--y': (i - 2.5) * (i - 2.5) * 5 } as React.CSSProperties} onClick={() => setSel(i)} onKeyDown={(e) => key(e, i)} aria-label={`${x.title}, ${x.author}`}>
              <Cover b={x} />
            </button>
          ))}
        </div>
        <div id="hbs-panel" className="hbs-detail" role="tabpanel" aria-labelledby={`hbs-tab-${sel}`} key={b.id}>
          <div className="hbs-dcover"><Cover b={b} /></div>
          <div className="hbs-dtext">
            <p className="hbs-meta">{b.form} · {b.pages} pages · {b.year}</p>
            <h3>{b.title}</h3>
            <p className="hbs-by">by {b.author}</p>
            <p className="hbs-blurb">{b.blurb}</p>
            <div className="hbs-buy">
              <b>${b.price}</b>
              <button type="button" className="hbs-cta" onClick={() => setPanel({ k: 'excerpt', id: b.id })}>Read an excerpt</button>
              <button type="button" className="hbs-ghost" aria-pressed={saved.includes(b.id)} onClick={() => toggle(b.id, b.title)}>{saved.includes(b.id) ? 'On your list' : 'Add to reading list'}</button>
            </div>
          </div>
        </div>
      </section>

      <div className="hbs-band" data-sl="pass" aria-hidden="true"><div><span>Fiction</span><span>Essays</span><span>Poems</span><span>Memoir</span><span>Stories</span><span>Fiction</span><span>Essays</span><span>Poems</span><span>Memoir</span><span>Stories</span></div></div>

      <section id="hbs-listen" className="hbs-listen" aria-labelledby="hbs-hn" tabIndex={-1}>
        <div className="hbs-lhead"><p className="hbs-eyebrow">The Quillfold hour</p><h2 id="hbs-hn">Hear the author before you read the book.</h2><p>Six minutes with Ines Valcourt on the tide that did not arrive. Press play, scrub, or jump to a line in the transcript.</p></div>
        <Player reduced={reduced} />
      </section>

      <section className="hbs-perks" aria-label="Ways to read with us">
        <ul>{PERKS.map((p) => <li key={p.n}><span className="hbs-num" aria-hidden="true">{p.n}</span><h3>{p.h}</h3><p>{p.p}</p></li>)}</ul>
      </section>

      <section id="hbs-letter" className="hbs-letter" aria-labelledby="hbs-hm" tabIndex={-1}>
        <div><p className="hbs-eyebrow">The Margin Letter</p><h2 id="hbs-hm">One good paragraph, every other Friday.</h2><p>A paragraph we loved, a book we are reading and the occasional correction. No tracking pixels, no discounts shouted in capitals.</p></div>
        <Subscribe id="hbs" cls="hbs" cta="Subscribe" doneTitle={(e) => `You are on the list, ${e}.`} doneText="The next Margin Letter arrives on Friday. Reply to any of them; a real editor reads the answers." />
      </section>

      <footer className="hbs-foot">
        <a className="hbs-brand" href="#hbs-top" onClick={go('hbs-top')}><span>Quillfold</span><small>Press</small></a>
        <nav aria-label="Footer"><a href="#hbs-list" onClick={go('hbs-list')}>The list</a><a href="#hbs-listen" onClick={go('hbs-listen')}>Listen</a><a href="#hbs-letter" onClick={go('hbs-letter')}>The letter</a><button type="button" onClick={() => setPanel({ k: 'list' })}>Reading list</button><a href="#hbs-top" onClick={go('hbs-top')}>Back to top</a></nav>
        <small>© 2026 Quillfold Press, an invented publisher for a template. Every title and author here is fictional.</small>
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
