'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { EMAIL } from './_ha-kit';

export interface Stay { id: string; name: string; sleeps: number; price: number; note: string }
type F = { name: string; email: string; stay: string; date: string; nights: string; guests: string };
type E = Partial<Record<keyof F, string>>;

/** Booking form of the Lanternfall page: field validation, a price summary that follows the inputs, and a confirmation. */
export function BookForm({ stays, initial, onDone }: { stays: Stay[]; initial: string; onDone: () => void }) {
  const [f, setF] = useState<F>({ name: '', email: '', stay: initial, date: '', nights: '2', guests: '2' });
  const [er, setEr] = useState<E>({});
  const [ok, setOk] = useState<F | null>(null);
  const [min, setMin] = useState('');
  useEffect(() => { const d = new Date(); setMin(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); }, []);
  const stay = stays.find((s) => s.id === f.stay) ?? stays[0]!;
  const nights = Number(f.nights);
  const total = Number.isInteger(nights) && nights > 0 ? stay.price * nights : 0;
  const set = (k: keyof F) => (e: { target: { value: string } }) => { setF((s) => ({ ...s, [k]: e.target.value })); setEr((s) => ({ ...s, [k]: undefined })); };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const x: E = {};
    if (f.name.trim().length < 2) x.name = 'Tell us who the room is for.';
    if (!EMAIL.test(f.email.trim())) x.email = 'Enter a valid email, like name@example.com.';
    if (!f.date) x.date = 'Choose an arrival date.'; else if (min && f.date < min) x.date = 'Arrival cannot be in the past.';
    if (!Number.isInteger(nights) || nights < 1 || nights > 7) x.nights = 'Stay between 1 and 7 nights.';
    const g = Number(f.guests);
    if (!Number.isInteger(g) || g < 1) x.guests = 'At least one guest.'; else if (g > stay.sleeps) x.guests = `${stay.name} sleeps ${stay.sleeps}.`;
    setEr(x);
    if (!Object.keys(x).length) setOk(f);
  };
  if (ok) {
    const s = stays.find((v) => v.id === ok.stay) ?? stay;
    return (
      <div className="ha-ok hnt-ok" role="status">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M7.5 12.5l3 3 6-6.5" /></svg>
        <div><b>A lantern is lit for you, {ok.name.trim().split(' ')[0]}.</b><p>{s.name}, {ok.nights} night{ok.nights === '1' ? '' : 's'} from {ok.date}, for {ok.guests}. We sent the details to {ok.email}. Nothing is charged until we confirm by hand within a day.</p></div>
        <button type="button" className="hnt-cta" onClick={onDone}>Back to the mountain</button>
      </div>
    );
  }
  const fld = (k: keyof F, label: string, input: React.ReactNode) => (
    <div className="ha-fld" data-bad={er[k] ? 'true' : undefined}><label htmlFor={`hnt-f-${k}`}>{label}</label>{input}{er[k] && <small id={`hnt-f-${k}-e`} role="alert">{er[k]}</small>}</div>
  );
  const a = (k: keyof F) => ({ id: `hnt-f-${k}`, 'aria-invalid': !!er[k], 'aria-describedby': er[k] ? `hnt-f-${k}-e` : undefined, value: f[k], onChange: set(k) });
  return (
    <form className="ha-form" onSubmit={submit} noValidate>
      {fld('name', 'Name', <input {...a('name')} autoComplete="name" />)}
      {fld('email', 'Email', <input {...a('email')} type="email" autoComplete="email" />)}
      {fld('stay', 'Room', <select {...a('stay')}>{stays.map((s) => <option key={s.id} value={s.id}>{s.name}, sleeps {s.sleeps}</option>)}</select>)}
      <div className="ha-row3">
        {fld('date', 'Arrival', <input {...a('date')} type="date" min={min || undefined} />)}
        {fld('nights', 'Nights', <input {...a('nights')} type="number" min={1} max={7} inputMode="numeric" />)}
        {fld('guests', 'Guests', <input {...a('guests')} type="number" min={1} max={stay.sleeps} inputMode="numeric" />)}
      </div>
      <p className="ha-sum" aria-live="polite">{total ? <>Estimated <b>${total.toLocaleString('en-US')}</b> for {nights} night{nights === 1 ? '' : 's'}, supper and the lantern walk included.</> : 'Choose how many nights to see the estimate.'}</p>
      <button type="submit" className="hnt-cta">Request these nights</button>
    </form>
  );
}
