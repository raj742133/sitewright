'use client';
import { useState, type FormEvent } from 'react';
import { EMAIL } from './_ha-kit';
import { Art, PRODUCTS } from './_ha-green-art';

const FREE = 40;

/** Cart dialog body: quantities, free-refill progress, a checkout step with email validation and a confirmation. */
export function CartBody({ cart, setQty, clear, onClose }: { cart: Record<string, number>; setQty: (id: string, q: number) => void; clear: () => void; onClose: () => void }) {
  const rows = PRODUCTS.filter((p) => (cart[p.id] ?? 0) > 0);
  const sub = rows.reduce((s, p) => s + p.price * (cart[p.id] ?? 0), 0);
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ n: number; e: string; t: number } | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) return setErr('Enter a valid email so we can send the receipt.');
    setDone({ n: rows.reduce((s, p) => s + (cart[p.id] ?? 0), 0), e: email.trim(), t: sub }); clear();
  };
  if (done) {
    return (
      <div className="ha-ok hlg-ok" role="status">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M7.5 12.5l3 3 6-6.5" /></svg>
        <div><b>Order placed: {done.n} item{done.n === 1 ? '' : 's'}, ${done.t}.</b><p>A receipt is on its way to {done.e}. Your parcel is packed in compostable wrap and leaves the greenhouse on Monday.</p></div>
        <button type="button" className="hlg-ghost" onClick={onClose}>Keep browsing</button>
      </div>
    );
  }
  if (!rows.length) return <p className="hlg-empty">Your basket is empty. The shelf has six things growing, and every one of them is refillable.</p>;
  return (
    <form className="hlg-cart" onSubmit={submit} noValidate>
      <ul className="hlg-lines">
        {rows.map((p) => (
          <li key={p.id}>
            <span className="hlg-thumb"><Art kind={p.kind} /></span>
            <div><b>{p.name}</b><small>${p.price} each</small></div>
            <div className="hlg-qty" role="group" aria-label={`Quantity of ${p.name}`}>
              <button type="button" aria-label={`Remove one ${p.name}`} onClick={() => setQty(p.id, (cart[p.id] ?? 0) - 1)}>−</button>
              <output aria-live="polite">{cart[p.id]}</output>
              <button type="button" aria-label={`Add one ${p.name}`} onClick={() => setQty(p.id, Math.min(9, (cart[p.id] ?? 0) + 1))}>+</button>
            </div>
            <span className="hlg-lineprice">${p.price * (cart[p.id] ?? 0)}</span>
          </li>
        ))}
      </ul>
      <div className="hlg-ship" role="progressbar" aria-valuemin={0} aria-valuemax={FREE} aria-valuenow={Math.min(FREE, sub)} aria-label="Progress to free compostable refills">
        <i style={{ width: `${Math.min(100, (sub / FREE) * 100)}%` }} />
        <span>{sub >= FREE ? 'Free compostable refills unlocked.' : `$${FREE - sub} more for free compostable refills.`}</span>
      </div>
      <div className="ha-fld" data-bad={err ? 'true' : undefined}>
        <label htmlFor="hlg-cart-em">Email for the receipt</label>
        <input id="hlg-cart-em" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} aria-invalid={!!err} aria-describedby={err ? 'hlg-cart-er' : undefined} />
        {err && <small id="hlg-cart-er" role="alert">{err}</small>}
      </div>
      <button type="submit" className="hlg-solid">Place order, ${sub}</button>
    </form>
  );
}
