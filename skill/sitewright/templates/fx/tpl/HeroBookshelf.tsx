'use client';
import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { Preview } from './_dash';
import { SR, useReducedMotion } from './_shared';
import { TOOLS, type Tool } from './_hbs-data';
import { Shelf } from './_hbs-shelf';

export interface HeroBookshelfProps {
  /** studio name (invented by default) */
  studio?: string;
  tools?: Tool[];
  className?: string;
}

const NAV: [string, string][] = [['hbs-shelf', 'The shelf'], ['hbs-method', 'Method'], ['hbs-journal', 'Journal']];
const PRINCIPLES: [string, string, string][] = [
  ['01', 'Bind it, then leave it alone', 'Every tool ships as a finished volume. We add chapters, not features, and we never rewrite a page you already rely on.'],
  ['02', 'Small enough to read in an evening', 'If the manual takes longer than a night to read, the tool is too big. We cut until it fits on one shelf.'],
  ['03', 'Printed to be reread', 'Plain type, honest names, no dark corners. You should be able to pick a tool up after a year and know where everything is.'],
];
const STATS: [string, string][] = [['7', 'titles in print'], ['42k', 'readers each week'], ['0', 'ads or trackers'], ['2017', 'first printing']];
const POSTS: [string, string, string, string][] = [
  ['12 Oct 2026', 'Why Kiln still has no plugin system', '6 min', 'Plugins turn a tool into a platform, and platforms turn into maintenance. We would rather keep Kiln small enough to read in full, and give it three well-chosen hooks instead of a marketplace.'],
  ['28 Sep 2026', 'Notes from the first year of Tidepool', '9 min', 'People log less time than they think and more than they fear. The most used feature is still the blank week: a calendar with nothing on it and permission to start late.'],
  ['03 Sep 2026', 'Binding a beta: how Almanac got its cover', '4 min', 'A beta is a manuscript. We put it on the shelf early, dog-eared and unfinished, so readers can write in the margins before the print run.'],
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Errs = Partial<Record<'name' | 'email' | 'tool' | 'msg', string>>;

/** Portfolio page for a small software studio whose tools are books on a shelf: 3D covers that pull out on select, a carousel row, a detail panel, a catalogue dialog and a booking form. */
export default function HeroBookshelf({ studio = 'Marrow & Pine', tools = TOOLS, className }: HeroBookshelfProps) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(2);
  const [owned, setOwned] = useState<string[]>([]);
  const [read, setRead] = useState(false);
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(0);
  const [f, setF] = useState({ name: '', email: '', tool: '', msg: '' });
  const [errs, setErrs] = useState<Errs>({});
  const [done, setDone] = useState<typeof f | null>(null);
  const [note, setNote] = useState('');
  const dlg = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const t = tools[index] ?? tools[0]!;

  const to = (id: string, focus = false) => {
    const el = root.current?.querySelector<HTMLElement>(`#${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    if (focus) window.setTimeout(() => (el.querySelector<HTMLElement>('[role=option][tabindex="0"]') ?? el).focus({ preventScroll: true }), reduced ? 0 : 450);
  };
  const jump = (id: string, focus?: boolean) => (e: MouseEvent) => { e.preventDefault(); setMenu(false); to(id, focus); };
  const select = (i: number) => { setIndex(i); setRead(false); setNote(`${tools[i]!.title}, ${i + 1} of ${tools.length}`); };
  useEffect(() => {
    if (!menu) return;
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [menu]);

  const toggleOwn = () => setOwned((o) => (o.includes(t.id) ? o.filter((x) => x !== t.id) : [...o, t.id]));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const er: Errs = {};
    if (f.name.trim().length < 2) er.name = 'Please tell us your name.';
    if (!EMAIL.test(f.email.trim())) er.email = 'Enter a valid email, like name@company.com.';
    if (!f.tool) er.tool = 'Choose the tool you would like to talk about.';
    if (f.msg.trim().length < 15) er.msg = `Add a little more (${f.msg.trim().length} of 15 characters).`;
    setErrs(er);
    const k = (['name', 'email', 'tool', 'msg'] as const).find((x) => er[x]);
    if (k) { root.current?.querySelector<HTMLElement>(`#hbs-f-${k}`)?.focus(); return; }
    setDone(f);
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF((s) => ({ ...s, [k]: e.target.value })); if (errs[k]) setErrs((s) => ({ ...s, [k]: undefined })); };
  const fld = (k: keyof Errs, label: string, input: ReactNode) => (
    <div className="hbs-fld" data-bad={errs[k] ? 'true' : undefined}>
      <label htmlFor={`hbs-f-${k}`}>{label}</label>{input}
      {errs[k] && <small id={`hbs-f-${k}-e`} role="alert">{errs[k]}</small>}
    </div>
  );
  const aria = (k: keyof Errs) => ({ id: `hbs-f-${k}`, 'aria-invalid': !!errs[k], 'aria-describedby': errs[k] ? `hbs-f-${k}-e` : undefined });

  return (
    <div ref={root} className={`hbs ${className ?? ''}`} data-motion={reduced ? 'off' : 'on'}>
      <header className="hbs-nav">
        <a href="#hbs-top" className="hbs-brand" onClick={jump('hbs-top')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 7l4 6h-2.5l3 4H7.5l3-4H8z" /></svg>
          <span>{studio}</span>
        </a>
        <nav aria-label="Primary" id="hbs-menu" className="hbs-links" data-open={menu ? 'true' : undefined}>
          {NAV.map(([id, l]) => <a key={id} href={`#${id}`} onClick={jump(id, id === 'hbs-shelf')}>{l}</a>)}
          <a href="#hbs-contact" onClick={jump('hbs-contact')} className="hbs-links-cta">Book a call</a>
        </nav>
        <button type="button" className="hbs-btn hbs-btn-ghost hbs-btn-sm hbs-cat-btn" onClick={() => dlg.current?.showModal()}>Catalogue{owned.length > 0 && <span className="hbs-badge" aria-label={`${owned.length} on your shelf`}>{owned.length}</span>}</button>
        <a href="#hbs-contact" className="hbs-btn hbs-btn-sm hbs-nav-cta" onClick={jump('hbs-contact')}>Book a call</a>
        <button type="button" className="hbs-menu-btn" aria-expanded={menu} aria-controls="hbs-menu" onClick={() => setMenu((v) => !v)}>
          <span style={SR}>{menu ? 'Close menu' : 'Open menu'}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">{menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}</svg>
        </button>
      </header>

      <main id="hbs-top" tabIndex={-1}>
        <section className="hbs-hero" aria-labelledby="hbs-h1">
          <div className="hbs-hero-top">
            <div>
              <p className="hbs-eyebrow">Software studio, Ghent<i aria-hidden="true" />Est. 2017</p>
              <h1 id="hbs-h1" className="hbs-h1">Small tools, <em>well bound.</em></h1>
              <p className="hbs-lede">{studio} makes seven quiet programs for people who work for themselves. Each one is finished like a book: a good cover, a short manual and nothing you will need to relearn next spring.</p>
              <div className="hbs-cta">
                <button type="button" className="hbs-btn" onClick={() => to('hbs-shelf', true)}>Browse the shelf<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg></button>
                <button type="button" className="hbs-btn hbs-btn-ghost" onClick={() => dlg.current?.showModal()}>Open the catalogue</button>
              </div>
            </div>
            <nav className="hbs-toc" aria-label="Contents">
              <b>Contents</b>
              <ol>{tools.map((x, i) => <li key={x.id}><button type="button" aria-current={i === index ? 'true' : undefined} onClick={() => { select(i); to('hbs-shelf'); }}><span>{String(i + 1).padStart(2, '0')}</span><em>{x.title}</em><small>{x.kind}</small></button></li>)}</ol>
            </nav>
          </div>
        </section>

        <section id="hbs-shelf" tabIndex={-1} className="hbs-shelf-sec" aria-label="The shelf">
          <Shelf tools={tools} index={index} onSelect={select} reduced={reduced} owned={owned} />
          <div className="hbs-bar">
            <button type="button" className="hbs-ib" aria-label="Previous tool" onClick={() => select((index - 1 + tools.length) % tools.length)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>
            <p className="hbs-count"><b>No. {String(index + 1).padStart(2, '0')}</b> of {String(tools.length).padStart(2, '0')}<span>{t.title}</span></p>
            <div className="hbs-prog" aria-hidden="true">{tools.map((x, i) => <i key={x.id} data-on={i === index ? 'true' : undefined} />)}</div>
            <button type="button" className="hbs-ib" aria-label="Next tool" onClick={() => select((index + 1) % tools.length)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg></button>
          </div>
          <article className="hbs-detail" key={t.id} aria-labelledby="hbs-dt">
            <header>
              <p className="hbs-eyebrow">No. {String(index + 1).padStart(2, '0')}<i aria-hidden="true" />{t.kind}<span className="hbs-pill" data-s={t.status}>{t.status} {t.version}</span></p>
              <h2 id="hbs-dt" className="hbs-h2">{t.title}</h2>
              <p className="hbs-d-line">{t.line}</p>
            </header>
            <div className="hbs-d-body">
              <p>{t.blurb}</p>
              <ul className="hbs-feat">{t.features.map((x) => <li key={x}>{x}</li>)}</ul>
              <div className="hbs-cta">
                <button type="button" className="hbs-btn" aria-pressed={owned.includes(t.id)} onClick={toggleOwn}>{owned.includes(t.id) ? <>On your shelf<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg></> : <>Add {t.title} to your shelf</>}</button>
                <button type="button" className="hbs-btn hbs-btn-ghost" aria-expanded={read} aria-controls="hbs-ex" onClick={() => setRead((v) => !v)}>{read ? 'Close the first page' : 'Read the first page'}</button>
              </div>
              <div id="hbs-ex" hidden={!read} className="hbs-excerpt"><p>{t.excerpt}</p></div>
            </div>
            <dl className="hbs-facts">{t.facts.map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}<div><dt>First printed</dt><dd>{t.year}</dd></div></dl>
          </article>
          <p style={SR} aria-live="polite">{note}</p>
        </section>

        <section id="hbs-method" tabIndex={-1} className="hbs-sec" aria-labelledby="hbs-hm">
          <p className="hbs-eyebrow">Method</p>
          <h2 id="hbs-hm" className="hbs-h2">Three rules for binding a tool.</h2>
          <ol className="hbs-rules">{PRINCIPLES.map(([n, h, p]) => <li key={n}><span aria-hidden="true">{n}</span><h3>{h}</h3><p>{p}</p></li>)}</ol>
          <ul className="hbs-stats" aria-label="The studio in numbers">{STATS.map(([n, l]) => <li key={l}><b>{n}</b><span>{l}</span></li>)}</ul>
        </section>

        <section id="hbs-journal" tabIndex={-1} className="hbs-sec hbs-journal" aria-labelledby="hbs-hj">
          <p className="hbs-eyebrow">Journal</p>
          <h2 id="hbs-hj" className="hbs-h2">Notes from the bindery.</h2>
          <ul className="hbs-posts">
            {POSTS.map(([d, h, m, body], i) => (
              <li key={h}>
                <button type="button" aria-expanded={open === i} aria-controls={`hbs-post-${i}`} onClick={() => setOpen(open === i ? -1 : i)}>
                  <time>{d}</time><b>{h}</b><span>{m} read</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                <div id={`hbs-post-${i}`} role="region" aria-label={h} hidden={open !== i}><p>{body}</p></div>
              </li>
            ))}
          </ul>
        </section>

        <section id="hbs-contact" tabIndex={-1} className="hbs-sec hbs-contact" aria-labelledby="hbs-hc">
          <div>
            <p className="hbs-eyebrow">Book a call</p>
            <h2 id="hbs-hc" className="hbs-h2">Talk to the people who wrote the manual.</h2>
            <p className="hbs-lede">Thirty minutes, no slides. Tell us which tool you have your eye on, or what you wish existed.</p>
          </div>
          {done ? (
            <div className="hbs-ok" role="status">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M7 12.5l3.5 3.5L17 9" /></svg>
              <b>Thank you, {done.name.trim().split(' ')[0]}.</b>
              <p>We have pencilled you in to talk about {done.tool}. A reply with three possible times will reach {done.email} within one working day.</p>
              <button type="button" className="hbs-btn hbs-btn-ghost" onClick={() => { setDone(null); setF({ name: '', email: '', tool: '', msg: '' }); }}>Book another call</button>
            </div>
          ) : (
            <form className="hbs-form" onSubmit={submit} noValidate>
              <div className="hbs-form-row">
                {fld('name', 'Your name', <input {...aria('name')} value={f.name} onChange={set('name')} autoComplete="name" />)}
                {fld('email', 'Work email', <input {...aria('email')} type="email" value={f.email} onChange={set('email')} autoComplete="email" />)}
              </div>
              {fld('tool', 'Which title?', <select {...aria('tool')} value={f.tool} onChange={set('tool')}><option value="">Choose one</option>{tools.map((x) => <option key={x.id}>{x.title}</option>)}<option>Something new</option></select>)}
              {fld('msg', 'What would you like to cover?', <textarea {...aria('msg')} rows={4} value={f.msg} onChange={set('msg')} />)}
              <button type="submit" className="hbs-btn">Request a call</button>
            </form>
          )}
        </section>
      </main>

      <footer className="hbs-foot">
        <b>{studio}</b>
        <span>Set in serif and sans. Printed in Ghent. &copy; 2026</span>
        <button type="button" className="hbs-btn hbs-btn-ghost hbs-btn-sm" onClick={() => to('hbs-top')}>Back to top</button>
      </footer>

      <dialog ref={dlg} className="hbs-dlg" aria-labelledby="hbs-dh" onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <h2 id="hbs-dh" className="hbs-h2">The catalogue</h2>
        <p className="hbs-dlg-p">{owned.length ? `${owned.length} of ${tools.length} on your shelf.` : 'Choose a title to bring it forward on the shelf.'}</p>
        <ul className="hbs-cat">
          {tools.map((x, i) => (
            <li key={x.id}>
              <button type="button" onClick={() => { select(i); dlg.current?.close(); to('hbs-shelf', true); }}>
                <span className="hbs-cat-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="hbs-cat-t"><b>{x.title}</b><small>{x.kind}, {x.year}</small></span>
                <span className="hbs-pill" data-s={x.status}>{owned.includes(x.id) ? 'On shelf' : x.status}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="hbs-btn hbs-btn-ghost" onClick={() => dlg.current?.close()}>Close</button>
      </dialog>
    </div>
  );
}

export function Demo() {
  return <Preview w={1280} h={190}><HeroBookshelf /></Preview>;
}
