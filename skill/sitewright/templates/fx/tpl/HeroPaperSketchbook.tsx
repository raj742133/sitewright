'use client';
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Preview } from './_dash';
import { SR, useReducedMotion } from './_shared';
import { Plate, PlateDefs, type PlateKind } from './_hps-art';
import { Sketchbook } from './_hps-book';
import { Loupe } from './_hps-loupe';

export interface HeroPaperSketchbookProps {
  /** the illustrator's name (invented by default) */
  name?: string;
  className?: string;
}

interface Job { id: string; title: string; client: string; kind: string; year: number; plate: PlateKind; blurb: string }
const JOBS: Job[] = [
  { id: 'j1', title: 'The Orchard Year', client: 'Orchard Quarterly', kind: 'Editorial', year: 2026, plate: 'fern', blurb: 'Twelve monthly covers, one botanical study each, painted from cuttings left on the editor\'s desk.' },
  { id: 'j2', title: 'Salt and Tide', client: 'Harrow & Finch Books', kind: 'Books', year: 2025, plate: 'light', blurb: 'Jacket and nineteen interior plates for a collection of coastal essays.' },
  { id: 'j3', title: 'Tea for the Long Evening', client: 'Pennywhistle Tea', kind: 'Packaging', year: 2025, plate: 'teapot', blurb: 'A set of three tins whose lids carry the same teapot at three different hours.' },
  { id: 'j4', title: 'Small Hours', client: 'The Slow Review', kind: 'Editorial', year: 2025, plate: 'cat', blurb: 'A season of night-time spot drawings for a long-form essay column.' },
  { id: 'j5', title: 'A Field Guide to Wet Weather', client: 'Tern Press', kind: 'Books', year: 2024, plate: 'mushroom', blurb: 'Sixty small drawings of what grows when it will not stop raining.' },
  { id: 'j6', title: 'Night Tram', client: 'Hollow Bell Festival', kind: 'Posters', year: 2024, plate: 'tram', blurb: 'A three-colour poster for a week of late concerts, printed on cream stock.' },
];
const KINDS = ['All', 'Books', 'Editorial', 'Packaging', 'Posters'];
const RATES: [string, string][] = [['Spot illustration', 'from 350 EUR'], ['Half-page editorial', 'from 620 EUR'], ['Book jacket', 'from 1,400 EUR'], ['Packaging set of three', 'from 2,600 EUR']];
const NAV: [string, string][] = [['hps-book', 'Sketchbook'], ['hps-loupe', 'Loupe'], ['hps-work', 'Commissions'], ['hps-about', 'About']];
type Errs = Partial<Record<'name' | 'email' | 'topic' | 'msg', string>>;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Personal portfolio for an illustrator, built as a paper world: a sketchbook whose pages really turn, a loupe over the artwork, a filterable commissions index and a validated contact form. */
export default function HeroPaperSketchbook({ name = 'Odile Marsh', className }: HeroPaperSketchbookProps) {
  const reduced = useReducedMotion();
  const [menu, setMenu] = useState(false);
  const [kind, setKind] = useState('All');
  const [sel, setSel] = useState('j1');
  const [f, setF] = useState({ name: '', email: '', topic: '', msg: '' });
  const [errs, setErrs] = useState<Errs>({});
  const [done, setDone] = useState<typeof f | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const desk = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const first = name.split(' ')[0] ?? name;

  const shown = JOBS.filter((j) => kind === 'All' || j.kind === kind);
  const job = shown.find((j) => j.id === sel) ?? shown[0];

  const scrollTo = (id: string, focus = false) => {
    const el = root.current?.querySelector<HTMLElement>(`#${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    if (focus) window.setTimeout(() => el.focus({ preventScroll: true }), reduced ? 0 : 450);
  };
  const jump = (id: string, focus?: boolean) => (e: MouseEvent) => { e.preventDefault(); setMenu(false); scrollTo(id, focus); };

  useEffect(() => {
    if (!menu) return;
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [menu]);

  const parallax = (e: React.PointerEvent) => {
    const el = desk.current;
    if (!el || reduced || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', String(((e.clientX - r.left) / r.width - 0.5).toFixed(3)));
    el.style.setProperty('--my', String(((e.clientY - r.top) / r.height - 0.5).toFixed(3)));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const er: Errs = {};
    if (f.name.trim().length < 2) er.name = 'Tell me your name so I know who to write back to.';
    if (!EMAIL.test(f.email.trim())) er.email = 'Enter an email address like name@studio.com.';
    if (!f.topic) er.topic = 'Choose the kind of project.';
    if (f.msg.trim().length < 20) er.msg = `A few more words please (${f.msg.trim().length} of 20 characters).`;
    setErrs(er);
    if (Object.keys(er).length) {
      const k = (['name', 'email', 'topic', 'msg'] as const).find((x) => er[x]);
      if (k) root.current?.querySelector<HTMLElement>(`#hps-f-${k}`)?.focus();
      return;
    }
    setDone(f);
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF((s) => ({ ...s, [k]: e.target.value })); if (errs[k]) setErrs((s) => ({ ...s, [k]: undefined })); };
  const fld = (k: keyof Errs, label: string, input: React.ReactNode) => (
    <div className="hps-fld" data-bad={errs[k] ? 'true' : undefined}>
      <label htmlFor={`hps-f-${k}`}>{label}</label>{input}
      {errs[k] && <small id={`hps-f-${k}-e`} role="alert">{errs[k]}</small>}
    </div>
  );
  const aria = (k: keyof Errs) => ({ id: `hps-f-${k}`, 'aria-invalid': !!errs[k], 'aria-describedby': errs[k] ? `hps-f-${k}-e` : undefined });

  return (
    <div ref={root} className={`hps ${className ?? ''}`} data-motion={reduced ? 'off' : 'on'}>
      <PlateDefs />
      <span className="hps-grain" aria-hidden="true" />
      <header className="hps-nav">
        <a href="#hps-top" className="hps-brand" onClick={jump('hps-top')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l4.5 7.5-3 3.5v6.5h-3v-6.5l-3-3.5z" /><circle cx="12" cy="10.5" r="1.2" /></svg>
          <span>{name}</span><small>illustrator</small>
        </a>
        <nav aria-label="Primary" className="hps-links" data-open={menu ? 'true' : undefined} id="hps-menu">
          {NAV.map(([id, t]) => <a key={id} href={`#${id}`} onClick={jump(id, id === 'hps-book')}>{t}</a>)}
          <a href="#hps-contact" className="hps-links-cta" onClick={jump('hps-contact')}>Contact</a>
        </nav>
        <button type="button" className="hps-btn hps-btn-sm hps-nav-cta" onClick={() => dlg.current?.showModal()}>Rates</button>
        <button type="button" className="hps-menu-btn" aria-expanded={menu} aria-controls="hps-menu" onClick={() => setMenu((v) => !v)}>
          <span className="hps-sr">{menu ? 'Close menu' : 'Open menu'}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">{menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}</svg>
        </button>
      </header>

      <main id="hps-top" tabIndex={-1}>
        <section className="hps-hero" aria-labelledby="hps-h1">
          <div className="hps-hero-copy">
            <p className="hps-eyebrow"><i aria-hidden="true" />Books, magazines and a very patient cat</p>
            <h1 id="hps-h1" className="hps-h1">Drawn slowly, <em>on purpose.<svg viewBox="0 0 240 14" aria-hidden="true" preserveAspectRatio="none"><path d="M3 9C40 3 80 12 120 7S200 3 237 8" /></svg></em></h1>
            <p className="hps-lede">I am {name}, an illustrator working in Porto. Ink, watercolour and a lot of tea go into every page, and every page here is a real one from my sketchbook.</p>
            <div className="hps-cta">
              <button type="button" className="hps-btn" onClick={() => scrollTo('hps-book', true)}>Open the sketchbook<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
              <button type="button" className="hps-btn hps-btn-ghost" onClick={() => dlg.current?.showModal()}>Rates and availability</button>
            </div>
            <ul className="hps-facts" aria-label="At a glance">
              <li><b>11</b><span>years drawing for print</span></li>
              <li><b>140+</b><span>commissions finished</span></li>
              <li><b className="hps-ok-dot">Jan</b><span>next open slot</span></li>
            </ul>
          </div>
          <div className="hps-desk" ref={desk} aria-hidden="true" onPointerMove={parallax}>
            <span className="hps-ring" />
            <div className="hps-sheet hps-sheet-a"><span className="hps-tape" /><Plate kind="fern" /><p>Plate 01. Fern</p></div>
            <div className="hps-sheet hps-sheet-b"><span className="hps-tape hps-tape-b" /><Plate kind="moth" /></div>
            <div className="hps-sheet hps-sheet-c"><Plate kind="teapot" /></div>
            <svg className="hps-pencil" viewBox="0 0 240 22"><rect x="40" y="3" width="150" height="16" rx="1.5" className="hps-pen-body" /><rect x="40" y="3" width="150" height="5" className="hps-pen-hi" /><rect x="190" y="3" width="14" height="16" className="hps-pen-fer" /><rect x="204" y="3" width="14" height="16" rx="3" className="hps-pen-er" /><path d="M40 3L8 11l32 8z" className="hps-pen-wood" /><path d="M14 9.2L6 11l8 1.8z" className="hps-pen-lead" /></svg>
            <svg className="hps-stamp" viewBox="0 0 120 120"><defs><path id="hps-circ" d="M60 60m-42 0a42 42 0 1 1 84 0a42 42 0 1 1-84 0" /></defs><circle cx="60" cy="60" r="56" /><circle cx="60" cy="60" r="31" /><text><textPath href="#hps-circ">ORIGINAL DRAWINGS * PORTO *</textPath></text><path d="M48 62l8 8 17-18" /></svg>
          </div>
        </section>

        <section className="hps-sec hps-book-sec" aria-labelledby="hps-hb">
          <div className="hps-sec-head">
            <p className="hps-eyebrow">The sketchbook</p>
            <h2 id="hps-hb" className="hps-h2">Turn the pages.</h2>
            <p className="hps-lede">Sketchbook no. 14, scanned page by page. Grab a corner and pull, click a page, or press the arrow keys.</p>
          </div>
          <Sketchbook reduced={reduced} name={name} />
        </section>

        <section id="hps-loupe" tabIndex={-1} className="hps-sec hps-loupe-sec" aria-label="Magnifier"><Loupe name={first} /></section>

        <section id="hps-work" tabIndex={-1} className="hps-sec" aria-labelledby="hps-hw">
          <div className="hps-sec-head">
            <p className="hps-eyebrow">Selected commissions</p>
            <h2 id="hps-hw" className="hps-h2">Work for people who like paper.</h2>
          </div>
          <div className="hps-chips" role="group" aria-label="Filter commissions by kind">
            {KINDS.map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); const n = JOBS.filter((j) => k === 'All' || j.kind === k)[0]; if (n) setSel(n.id); }}>{k}</button>)}
            <span className="hps-count" aria-live="polite">{shown.length} of {JOBS.length} commissions</span>
          </div>
          <div className="hps-work">
            <ul className="hps-jobs">
              {shown.map((j) => (
                <li key={j.id}>
                  <button type="button" aria-pressed={job?.id === j.id} onClick={() => setSel(j.id)}>
                    <span className="hps-job-y">{j.year}</span>
                    <span className="hps-job-t"><b>{j.title}</b><small>{j.client}</small></span>
                    <span className="hps-job-k">{j.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
            {job && (
              <figure className="hps-job-card" key={job.id}>
                <div className="hps-job-art"><Plate kind={job.plate} label={`${job.title}, sample drawing`} /></div>
                <figcaption><b>{job.title}</b><span>{job.client}, {job.year}</span><p>{job.blurb}</p></figcaption>
              </figure>
            )}
          </div>
        </section>

        <section id="hps-about" tabIndex={-1} className="hps-sec hps-about" aria-labelledby="hps-ha">
          <div className="hps-sec-head">
            <p className="hps-eyebrow">About</p>
            <h2 id="hps-ha" className="hps-h2">Slow hands, short deadlines kept.</h2>
          </div>
          <div className="hps-about-grid">
            <p className="hps-dropcap">I draw at a table by a north-facing window, mostly in the morning, mostly with a dip pen. A job starts with a week of small ugly sketches, moves to a clean pencil layout you approve, and only then gets inked and washed. You see every stage, and nothing is a surprise.</p>
            <div><h3>On the table</h3><ul className="hps-kit"><li>Walnut ink and a steel nib</li><li>Cold-press paper, 300 gsm</li><li>Six pans of watercolour</li><li>A bone folder, a lot of tape</li></ul></div>
            <div><h3>How a job runs</h3><ol className="hps-steps"><li>A call and a brief</li><li>Thumbnails in a week</li><li>Pencil layout, one round of notes</li><li>Final ink and wash, scanned at 1200 dpi</li></ol></div>
          </div>
        </section>

        <section id="hps-contact" tabIndex={-1} className="hps-sec hps-contact" aria-labelledby="hps-hc">
          <div className="hps-sec-head">
            <p className="hps-eyebrow">Say hello</p>
            <h2 id="hps-hc" className="hps-h2">Tell me what you are making.</h2>
            <p className="hps-lede">A paragraph is plenty. I reply to every message within three working days.</p>
          </div>
          {done ? (
            <div className="hps-ok" role="status">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M7 12.5l3.5 3.5L17 9" /></svg>
              <b>Thank you, {done.name.trim().split(' ')[0]}.</b>
              <p>Your note about a {done.topic.toLowerCase()} project is on my desk. I will write to {done.email} within three working days.</p>
              <button type="button" className="hps-btn hps-btn-ghost" onClick={() => { setDone(null); setF({ name: '', email: '', topic: '', msg: '' }); }}>Send another note</button>
            </div>
          ) : (
            <form className="hps-form" onSubmit={submit} noValidate>
              <div className="hps-form-row">
                {fld('name', 'Your name', <input {...aria('name')} value={f.name} onChange={set('name')} autoComplete="name" />)}
                {fld('email', 'Email', <input {...aria('email')} type="email" value={f.email} onChange={set('email')} autoComplete="email" />)}
              </div>
              {fld('topic', 'Kind of project', <select {...aria('topic')} value={f.topic} onChange={set('topic')}><option value="">Choose one</option>{['Book jacket', 'Editorial', 'Packaging', 'Poster', 'Something else'].map((t) => <option key={t}>{t}</option>)}</select>)}
              {fld('msg', 'The project in a few lines', <textarea {...aria('msg')} rows={4} value={f.msg} onChange={set('msg')} />)}
              <button type="submit" className="hps-btn">Send to {first}</button>
            </form>
          )}
        </section>
      </main>

      <footer className="hps-foot">
        <span>&copy; 2026 {name}. Every drawing remains the artist&rsquo;s.</span>
        <button type="button" className="hps-btn hps-btn-ghost hps-btn-sm" onClick={() => scrollTo('hps-top')}>Back to top</button>
      </footer>

      <dialog ref={dlg} className="hps-dlg" aria-labelledby="hps-dh" onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <h2 id="hps-dh" className="hps-h2">Rates and availability</h2>
        <p>Prices include two rounds of notes and a high-resolution scan. Usage licences are quoted per project.</p>
        <table className="hps-rates"><tbody>{RATES.map(([a, b]) => <tr key={a}><th scope="row">{a}</th><td>{b}</td></tr>)}</tbody></table>
        <p className="hps-dlg-note"><i aria-hidden="true" />Books open for new work from January.</p>
        <div className="hps-dlg-act">
          <button type="button" className="hps-btn" onClick={() => { dlg.current?.close(); scrollTo('hps-contact', true); }}>Ask about a commission</button>
          <button type="button" className="hps-btn hps-btn-ghost" onClick={() => dlg.current?.close()}>Close</button>
        </div>
      </dialog>
      <span style={SR} aria-live="polite">{done ? 'Message sent.' : ''}</span>
    </div>
  );
}

export function Demo() {
  return <Preview w={1280} h={190}><HeroPaperSketchbook /></Preview>;
}
