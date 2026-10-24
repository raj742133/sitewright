'use client';
import { useEffect, useId, useRef, useState } from 'react';

export interface PaymentDetails { number: string; name: string; expiry: string; cvc: string; }
export interface PaymentCardProps {
  /** called after the fake processing delay; no network happens here */
  onPay?: (details: PaymentDetails) => void;
  /** e.g. "$48.00" */
  amount?: string;
  /** small layout: card beside one-line fields */
  compact?: boolean;
  defaultValues?: Partial<PaymentDetails>;
}

const groups = (digits: string) => digits.replace(/(\d{4})(?=\d)/g, '$1 ');
export function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return digits.length > 0 && sum % 10 === 0;
}
function fmtExpiry(prev: string, raw: string): string {
  let d = raw.replace(/\D/g, '').slice(0, 4);
  if (d.length === 1 && Number(d) > 1) d = '0' + d;
  if (d.length >= 3) return d.slice(0, 2) + '/' + d.slice(2);
  // typing "12" auto-adds the slash, but let backspace remove it
  if (d.length === 2 && raw.length > prev.length) return d + '/';
  return d;
}
function expiryOk(v: string): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const mo = Number(m[1]);
  return mo >= 1 && mo <= 12;
}

export default function PaymentCard({ onPay, amount = '$48.00', compact = false, defaultValues }: PaymentCardProps) {
  const id = useId();
  const [number, setNumber] = useState(defaultValues?.number ?? '');
  const [name, setName] = useState(defaultValues?.name ?? '');
  const [expiry, setExpiry] = useState(defaultValues?.expiry ?? '');
  const [cvc, setCvc] = useState(defaultValues?.cvc ?? '');
  const [flip, setFlip] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'busy' | 'done'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const digits = number.replace(/\D/g, '');
  const numOk = digits.length === 16 && luhn(digits);
  const expOk = expiryOk(expiry);
  const cvcOk = cvc.length >= 3;
  const ready = numOk && expOk && cvcOk && name.trim().length > 1;
  const shown = (digits + '•'.repeat(16)).slice(0, 16);
  const [ex1, ex2] = expiry.split('/');

  const pay = () => {
    if (phase === 'done') { setPhase('idle'); return; }
    if (!ready || phase !== 'idle') return;
    setPhase('busy');
    timer.current = setTimeout(() => {
      setPhase('done');
      onPay?.({ number: digits, name: name.trim(), expiry, cvc });
    }, 1400);
  };
  const locked = phase !== 'idle';
  const tick = (ok: boolean) => ok && (
    <svg className="ui-payment-card-tick" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
  );

  return (
    <form className="ui-payment-card-root" data-compact={compact || undefined} data-phase={phase} onSubmit={(e) => { e.preventDefault(); pay(); }} noValidate>
      <div className="ui-payment-card-scene" data-flip={flip || undefined} aria-hidden="true">
        <div className="ui-payment-card-card">
          <div className="ui-payment-card-face ui-payment-card-front">
            <div className="ui-payment-card-top">
              <svg className="ui-payment-card-chip" viewBox="0 0 32 24" aria-hidden="true">
                <rect x="1" y="1" width="30" height="22" rx="4" fill="#e8c874" stroke="#8a6d1f" strokeWidth="1" />
                <path d="M1 8h9M1 16h9M22 8h9M22 16h9M10 1v22M22 1v22M10 8h12M10 16h12" stroke="#8a6d1f" strokeWidth=".9" fill="none" />
              </svg>
              <svg className="ui-payment-card-wave" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 7a7 7 0 010 10M11 4.5a11 11 0 010 15M15 2a15 15 0 010 20" /></svg>
            </div>
            <div className="ui-payment-card-num">
              {[0, 1, 2, 3].map((g) => <span key={g}>{shown.slice(g * 4, g * 4 + 4)}</span>)}
            </div>
            <div className="ui-payment-card-meta">
              <span className="ui-payment-card-holder"><small>Card holder</small>{name.trim() || 'YOUR NAME'}</span>
              <span className="ui-payment-card-exp"><small>Expires</small>{(ex1 || 'MM').padEnd(2, '•').slice(0, 2)}/{(ex2 || 'YY').padEnd(2, '•').slice(0, 2)}</span>
            </div>
          </div>
          <div className="ui-payment-card-face ui-payment-card-back">
            <div className="ui-payment-card-strip" />
            <div className="ui-payment-card-sig"><span className="ui-payment-card-cvc">{cvc || '•••'}</span></div>
            <small className="ui-payment-card-fine">Security code</small>
          </div>
        </div>
        <div className="ui-payment-card-done" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="40%" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <circle className="ui-payment-card-ring" cx="24" cy="24" r="20" pathLength={1} />
            <path className="ui-payment-card-check" d="M14 25l7 7 13-15" pathLength={1} />
          </svg>
        </div>
      </div>

      <div className="ui-payment-card-fields">
        <label className="ui-payment-card-field ui-payment-card-f-num">
          <span className="ui-payment-card-lab">Card number</span>
          <input inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" value={number} disabled={locked}
            aria-invalid={digits.length === 16 && !numOk ? true : undefined}
            onChange={(e) => setNumber(groups(e.target.value.replace(/\D/g, '').slice(0, 16)))} />
          {tick(numOk)}
        </label>
        <label className="ui-payment-card-field ui-payment-card-f-name">
          <span className="ui-payment-card-lab">Name on card</span>
          <input autoComplete="cc-name" placeholder="Ada Lovelace" value={name} disabled={locked} maxLength={26} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="ui-payment-card-field ui-payment-card-f-exp">
          <span className="ui-payment-card-lab">Expiry</span>
          <input inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={expiry} disabled={locked} maxLength={5}
            onChange={(e) => setExpiry(fmtExpiry(expiry, e.target.value))} />
          {tick(expOk)}
        </label>
        <label className="ui-payment-card-field ui-payment-card-f-cvc">
          <span className="ui-payment-card-lab">CVC</span>
          <input inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={cvc} disabled={locked} maxLength={4} aria-describedby={`${id}-cvc`}
            onFocus={() => setFlip(true)} onBlur={() => setFlip(false)}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          {tick(cvcOk)}
        </label>
        <span id={`${id}-cvc`} className="ui-payment-card-sr">The card flips to show where the security code goes.</span>
        <button type="submit" className="ui-payment-card-pay" disabled={(!ready && phase === 'idle') || phase === 'busy'}>
          {phase === 'busy' ? <><span className="ui-payment-card-spin" aria-hidden="true" />Processing</> : phase === 'done' ? 'Paid, tap to reset' : `Pay ${amount}`}
        </button>
      </div>
      <p className="ui-payment-card-sr" role="status" aria-live="polite">{phase === 'busy' ? 'Processing payment' : phase === 'done' ? 'Payment successful (demo, nothing was charged)' : ''}</p>
    </form>
  );
}

export function Demo() {
  return (
    <div className="ui-payment-card-demo">
      <PaymentCard compact amount="$48" defaultValues={{ number: '4242 4242 4242 4242', name: 'Ada Lovelace', expiry: '08/29', cvc: '' }} />
    </div>
  );
}
