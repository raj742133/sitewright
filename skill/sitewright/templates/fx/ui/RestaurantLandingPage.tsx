'use client';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Mini, useReducedMotion } from './_d8';

export interface MenuItem { name: string; desc: string; price: number }
export interface Review { quote: string; who: string; stars: number }
export interface RestaurantLandingPageProps {
  name?: string;
  menu?: Record<string, MenuItem[]>;
  hours?: { day: string; open: string }[];
  reviews?: Review[];
  className?: string;
}

const MENU: Record<string, MenuItem[]> = {
  Starters: [
    { name: 'Charred leeks, hazelnut', desc: 'Smoked butter, pickled shallot, brown crumbs', price: 9 },
    { name: 'Whipped ricotta toast', desc: 'Roast figs, thyme honey, black pepper', price: 10 },
    { name: 'Clam and fennel broth', desc: 'Little clams, white wine, grilled bread', price: 12 },
  ],
  Mains: [
    { name: 'Wood-fired hen', desc: 'Salt-baked celeriac, jus gras, lemon', price: 26 },
    { name: 'Hand-cut pappardelle', desc: 'Slow oxtail ragù, parmesan, parsley oil', price: 21 },
    { name: 'Roast cauliflower steak', desc: 'Tahini, dukkah, burnt chilli, herbs', price: 19 },
  ],
  Desserts: [
    { name: 'Burnt honey custard', desc: 'Bee pollen, sea salt, shortbread', price: 8 },
    { name: 'Dark chocolate pot', desc: 'Olive oil, crème fraîche, cocoa nib', price: 9 },
    { name: 'Poached pear', desc: 'Vanilla syrup, toasted almond, cream', price: 8 },
  ],
};
const HOURS = [{ day: 'Monday', open: 'Closed' }, { day: 'Tuesday', open: '17:00 – 22:00' }, { day: 'Wednesday', open: '17:00 – 22:00' }, { day: 'Thursday', open: '17:00 – 22:30' }, { day: 'Friday', open: '12:00 – 23:00' }, { day: 'Saturday', open: '12:00 – 23:00' }, { day: 'Sunday', open: '12:00 – 21:00' }];
const REVIEWS: Review[] = [
  { quote: 'The hen alone is worth the trip. Warm room, kind staff, and nobody rushed us once.', who: 'Priya N.', stars: 5 },
  { quote: 'We came for a birthday and left planning the next visit. The burnt honey custard is dangerous.', who: 'Callum R.', stars: 5 },
  { quote: 'Small menu, done properly. The pappardelle tasted like someone’s grandmother made it.', who: 'Elena V.', stars: 4 },
];
const TIMES = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
type Errs = Partial<Record<'name' | 'email' | 'date' | 'time' | 'guests', string>>;

function Plate() {
  return (
    <div className="ui-restaurant-landing-page-plate" aria-hidden="true">
      <svg className="ui-restaurant-landing-page-steam" viewBox="0 0 120 70" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        {[28, 60, 92].map((x, i) => <path key={x} style={{ animationDelay: `${i * -0.9}s` }} d={`M${x} 64c-8-12 8-18 0-30s8-18 0-30`} />)}
      </svg>
      <svg className="ui-restaurant-landing-page-disc" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="96" fill="#f4efe6" stroke="#d9cfbd" strokeWidth="3" />
        <circle cx="100" cy="100" r="74" fill="#ebe3d3" />
        <circle cx="100" cy="100" r="52" fill="#c8693a" /><circle cx="100" cy="100" r="40" fill="#e08a4b" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <ellipse key={i} cx={100 + 24 * Math.cos((i * 2 * Math.PI) / 7)} cy={100 + 24 * Math.sin((i * 2 * Math.PI) / 7)} rx="9" ry="4.5" fill="#5f8a4c" transform={`rotate(${i * 51.4} ${100 + 24 * Math.cos((i * 2 * Math.PI) / 7)} ${100 + 24 * Math.sin((i * 2 * Math.PI) / 7)})`} />)}
        <circle cx="100" cy="100" r="9" fill="#f2d57a" />
      </svg>
    </div>
  );
}

/** Restaurant landing page: steaming rotating plate hero, working menu tabs, validated reservation form, hours, reviews carousel. */
export default function RestaurantLandingPage({ name = 'Ember & Fig', menu = MENU, hours = HOURS, reviews = REVIEWS, className }: RestaurantLandingPageProps) {
  const reduced = useReducedMotion();
  const tabs = Object.keys(menu);
  const [tab, setTab] = useState(tabs[0] ?? '');
  const [rv, setRv] = useState(0);
  const [hold, setHold] = useState(false);
  const [today, setToday] = useState('');
  const [minDate, setMinDate] = useState('');
  const [f, setF] = useState({ name: '', email: '', date: '', time: '', guests: '2' });
  const [errs, setErrs] = useState<Errs>({});
  const [done, setDone] = useState<typeof f | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const d = new Date();
    setToday(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]!);
    setMinDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }, []);
  useEffect(() => {
    if (reduced || hold || reviews.length < 2) return;
    const t = window.setInterval(() => setRv((i) => (i + 1) % reviews.length), 6000);
    return () => clearInterval(t);
  }, [reduced, hold, reviews.length]);
  const keyTabs = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? -99 : e.key === 'End' ? 99 : 0;
    if (!d) return;
    e.preventDefault();
    const n = d === -99 ? 0 : d === 99 ? tabs.length - 1 : (i + d + tabs.length) % tabs.length;
    setTab(tabs[n]!);
    tabRefs.current[n]?.focus();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const er: Errs = {};
    if (f.name.trim().length < 2) er.name = 'Tell us the name for the booking.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) er.email = 'Enter a valid email, like name@example.com.';
    if (!f.date) er.date = 'Choose a date.'; else if (minDate && f.date < minDate) er.date = 'Pick today or a later date.';
    if (!f.time) er.time = 'Choose a time.';
    const g = Number(f.guests);
    if (!Number.isInteger(g) || g < 1 || g > 12) er.guests = 'Tables seat 1 to 12 guests.';
    setErrs(er);
    if (!Object.keys(er).length) setDone(f);
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const fld = (k: keyof Errs, label: string, input: React.ReactNode) => (
    <div className="ui-restaurant-landing-page-fld" data-bad={errs[k] ? 'true' : undefined}>
      <label htmlFor={`rl-${k}`}>{label}</label>{input}
      {errs[k] && <small id={`rl-${k}-e`} role="alert">{errs[k]}</small>}
    </div>
  );
  const aria = (k: keyof Errs) => ({ id: `rl-${k}`, 'aria-invalid': !!errs[k], 'aria-describedby': errs[k] ? `rl-${k}-e` : undefined });
  const rev = reviews[rv];
  return (
    <div className={`ui-restaurant-landing-page ${className ?? ''}`}>
      <header className="ui-restaurant-landing-page-hero">
        <nav aria-label="Restaurant"><b>{name}</b><span><a href="#rl-menu">Menu</a><a href="#rl-book">Reserve</a><a href="#rl-hours">Hours</a></span></nav>
        <div className="ui-restaurant-landing-page-hc">
          <div>
            <p className="ui-restaurant-landing-page-kicker">Fire, seasonal produce, good bread</p>
            <h1>Dinner cooked over open flame.</h1>
            <p>A twenty-eight seat room, a short menu that follows the market, and a wood oven that never really goes cold.</p>
            <a href="#rl-book" className="ui-restaurant-landing-page-btn">Reserve a table</a>
          </div>
          <Plate />
        </div>
      </header>
      <section id="rl-menu" className="ui-restaurant-landing-page-sec" aria-labelledby="rl-hm">
        <h2 id="rl-hm">The menu</h2>
        <div role="tablist" aria-label="Menu sections" className="ui-restaurant-landing-page-tabs">
          {tabs.map((t, i) => <button key={t} ref={(el) => { tabRefs.current[i] = el; }} role="tab" id={`rl-tab-${i}`} aria-selected={t === tab} aria-controls="rl-panel" tabIndex={t === tab ? 0 : -1} onClick={() => setTab(t)} onKeyDown={(e) => keyTabs(e, i)}>{t}</button>)}
        </div>
        <div role="tabpanel" id="rl-panel" aria-labelledby={`rl-tab-${Math.max(0, tabs.indexOf(tab))}`} key={tab} style={{ display: 'contents' }}><ul className="ui-restaurant-landing-page-items">
          {(menu[tab] ?? []).map((m) => <li key={m.name}><div><b>{m.name}</b><small>{m.desc}</small></div><span>${m.price}</span></li>)}
        </ul></div>
      </section>
      <div className="ui-restaurant-landing-page-two">
        <section id="rl-book" className="ui-restaurant-landing-page-sec ui-restaurant-landing-page-book" aria-labelledby="rl-hb">
          <h2 id="rl-hb">Reserve a table</h2>
          {done ? (
            <div role="status" className="ui-restaurant-landing-page-ok">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M7 12.5l3.5 3.5L17 9" /></svg>
              <b>You are booked, {done.name.split(' ')[0]}.</b>
              <p>A table for {done.guests} on {done.date} at {done.time}. We sent a confirmation to {done.email}.</p>
              <button type="button" onClick={() => { setDone(null); setF({ name: '', email: '', date: '', time: '', guests: '2' }); }}>Make another booking</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              {fld('name', 'Name', <input {...aria('name')} value={f.name} onChange={set('name')} autoComplete="name" />)}
              {fld('email', 'Email', <input {...aria('email')} type="email" value={f.email} onChange={set('email')} autoComplete="email" />)}
              <div className="ui-restaurant-landing-page-row">
                {fld('date', 'Date', <input {...aria('date')} type="date" min={minDate || undefined} value={f.date} onChange={set('date')} />)}
                {fld('time', 'Time', <select {...aria('time')} value={f.time} onChange={set('time')}><option value="">Choose…</option>{TIMES.map((t) => <option key={t}>{t}</option>)}</select>)}
                {fld('guests', 'Guests', <input {...aria('guests')} type="number" min={1} max={12} inputMode="numeric" value={f.guests} onChange={set('guests')} />)}
              </div>
              <button type="submit" className="ui-restaurant-landing-page-btn">Confirm reservation</button>
            </form>
          )}
        </section>
        <section id="rl-hours" className="ui-restaurant-landing-page-sec" aria-labelledby="rl-hh">
          <h2 id="rl-hh">Opening hours</h2>
          <table className="ui-restaurant-landing-page-hours"><tbody>
            {hours.map((h) => <tr key={h.day} data-today={h.day === today ? 'true' : undefined}><th scope="row">{h.day}{h.day === today && <em> today</em>}</th><td>{h.open}</td></tr>)}
          </tbody></table>
          <p className="ui-restaurant-landing-page-addr">14 Mill Lane, Old Quarter<br />Walk-ins welcome at the bar.</p>
        </section>
      </div>
      <section className="ui-restaurant-landing-page-sec ui-restaurant-landing-page-rev" aria-roledescription="carousel" aria-label="Guest reviews" onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
        {rev && <figure key={rv} aria-live={hold || reduced ? 'polite' : 'off'}>
          <div className="ui-restaurant-landing-page-stars" role="img" aria-label={`${rev.stars} out of 5 stars`}>{'★★★★★'.slice(0, rev.stars)}<span>{'★★★★★'.slice(rev.stars)}</span></div>
          <blockquote>“{rev.quote}”</blockquote><figcaption>{rev.who}</figcaption>
        </figure>}
        <div className="ui-restaurant-landing-page-ctl">
          <button type="button" aria-label="Previous review" onClick={() => setRv((i) => (i - 1 + reviews.length) % reviews.length)}>‹</button>
          {reviews.map((r, i) => <button key={r.who} type="button" className="ui-restaurant-landing-page-dot" aria-label={`Review ${i + 1} of ${reviews.length}`} aria-current={i === rv} onClick={() => setRv(i)}><i /></button>)}
          <button type="button" aria-label="Next review" onClick={() => setRv((i) => (i + 1) % reviews.length)}>›</button>
        </div>
      </section>
      <footer className="ui-restaurant-landing-page-foot">© {name}. Please tell us about allergies when you book.</footer>
    </div>
  );
}

export function Demo() {
  return <Mini w={1000}><RestaurantLandingPage /></Mini>;
}
