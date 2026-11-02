'use client';
// The contact note (validated, with a confirmation) and the rates dialog (a native <dialog>).
import { useState, type FormEvent, type ReactNode, type RefObject } from 'react';

const RATES: [string, string][] = [['Spot illustration', 'from 350 EUR'], ['Half-page editorial', 'from 620 EUR'], ['Book jacket', 'from 1,400 EUR'], ['Packaging set of three', 'from 2,600 EUR']];
type Errs = Partial<Record<'name' | 'email' | 'topic' | 'msg', string>>;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMPTY = { name: '', email: '', topic: '', msg: '' };

export function Contact({ first, focusField }: { first: string; focusField: (k: string) => void }) {
  const [f, setF] = useState(EMPTY);
  const [errs, setErrs] = useState<Errs>({});
  const [done, setDone] = useState<typeof EMPTY | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const er: Errs = {};
    if (f.name.trim().length < 2) er.name = 'Tell me your name so I know who to write back to.';
    if (!EMAIL.test(f.email.trim())) er.email = 'Enter an email address like name@studio.com.';
    if (!f.topic) er.topic = 'Choose the kind of project.';
    if (f.msg.trim().length < 20) er.msg = `A few more words please (${f.msg.trim().length} of 20 characters).`;
    setErrs(er);
    const k = (['name', 'email', 'topic', 'msg'] as const).find((x) => er[x]);
    if (k) { focusField(k); return; }
    setDone(f);
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF((s) => ({ ...s, [k]: e.target.value })); if (errs[k]) setErrs((s) => ({ ...s, [k]: undefined })); };
  const fld = (k: keyof Errs, label: string, input: ReactNode) => (
    <div className="hps-fld" data-bad={errs[k] ? 'true' : undefined}>
      <label htmlFor={`hps-f-${k}`}>{label}</label>{input}
      {errs[k] && <small id={`hps-f-${k}-e`} role="alert">{errs[k]}</small>}
    </div>
  );
  const aria = (k: keyof Errs) => ({ id: `hps-f-${k}`, 'aria-invalid': !!errs[k], 'aria-describedby': errs[k] ? `hps-f-${k}-e` : undefined });
  return (
    <section id="hps-contact" tabIndex={-1} className="hps-sec hps-contact" aria-labelledby="hps-hc">
      <div className="hps-sec-head">
        <p className="hps-eyebrow"><i aria-hidden="true" />Say hello</p>
        <h2 id="hps-hc" className="hps-h2">Tell me <em>what you are making.</em></h2>
        <p className="hps-lede">A paragraph is plenty. I reply to every message within three working days.</p>
      </div>
      {done ? (
        <div className="hps-ok hps-paper" role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M7 12.5l3.5 3.5L17 9" /></svg>
          <b>Thank you, {done.name.trim().split(' ')[0]}.</b>
          <p>Your note about a {done.topic.toLowerCase()} project is on my desk. I will write to {done.email} within three working days.</p>
          <button type="button" className="hps-btn hps-btn-ghost" onClick={() => { setDone(null); setF(EMPTY); }}>Send another note</button>
        </div>
      ) : (
        <form className="hps-form hps-paper" onSubmit={submit} noValidate>
          <span className="hps-tape hps-tape-a" aria-hidden="true" />
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
  );
}

export function RatesDialog({ dlg, onAsk }: { dlg: RefObject<HTMLDialogElement | null>; onAsk: () => void }) {
  return (
    <dialog ref={dlg} className="hps-dlg hps-paper" aria-labelledby="hps-dh" onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
      <h2 id="hps-dh" className="hps-h2">Rates and availability</h2>
      <p>Prices include two rounds of notes and a high-resolution scan. Usage licences are quoted per project.</p>
      <table className="hps-rates"><tbody>{RATES.map(([a, b]) => <tr key={a}><th scope="row">{a}</th><td>{b}</td></tr>)}</tbody></table>
      <p className="hps-dlg-note"><i aria-hidden="true" />Books open for new work from January.</p>
      <div className="hps-dlg-act">
        <button type="button" className="hps-btn" onClick={() => { dlg.current?.close(); onAsk(); }}>Ask about a commission</button>
        <button type="button" className="hps-btn hps-btn-ghost" onClick={() => dlg.current?.close()}>Close</button>
      </div>
    </dialog>
  );
}
