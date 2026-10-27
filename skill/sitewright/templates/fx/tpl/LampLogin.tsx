'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Mini } from './_shared';

export interface LampLoginProps {
  title?: string;
  /** Return nothing on success, or a message to show as an error. Defaults to a short simulated request. */
  onSubmit?: (v: { email: string; password: string }) => Promise<string | void> | string | void;
  forgotHref?: string;
  defaultOn?: boolean;
  className?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Login with a hanging lamp: pull the cord (a real button) to light the scene; the form works with the lamp off or on. */
export default function LampLogin({ title = 'Welcome back', onSubmit, forgotHref = '#', defaultOn = false, className }: LampLoginProps) {
  const [on, setOn] = useState(defaultOn);
  const [pull, setPull] = useState(false);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState({ email: false, pw: false });
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [serverErr, setServerErr] = useState('');
  const timer = useRef(0);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; clearTimeout(timer.current); }; }, []);

  const errEmail = !email.trim() ? 'Enter your email address.' : !EMAIL.test(email.trim()) ? 'That does not look like an email, try name@example.com.' : '';
  const errPw = !pw ? 'Enter your password.' : pw.length < 8 ? 'Passwords have at least 8 characters.' : '';
  const toggle = () => {
    setOn((v) => !v);
    setPull(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPull(false), 700);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, pw: true });
    setServerErr('');
    if (errEmail || errPw || state === 'busy') return;
    setState('busy');
    try {
      const r = onSubmit ? await onSubmit({ email: email.trim(), password: pw }) : await new Promise<void>((res) => { timer.current = window.setTimeout(res, 1100); });
      if (!live.current) return;
      if (typeof r === 'string' && r) { setServerErr(r); setState('idle'); } else setState('done');
    } catch {
      if (live.current) { setServerErr('Something went wrong. Please try again.'); setState('idle'); }
    }
  };
  const bad = (k: 'email' | 'pw') => touched[k] && (k === 'email' ? errEmail : errPw);
  return (
    <div className={`ui-lamp-login ${className ?? ''}`} data-on={on ? 'true' : 'false'}>
      <div className="ui-lamp-login-stage">
        <div className="ui-lamp-login-cone" aria-hidden="true" />
        <div className="ui-lamp-login-lamp" data-pull={pull ? 'true' : undefined}>
          <svg viewBox="0 0 200 240" width="100%" height="100%" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="ll-shade" x1="0" x2="1"><stop offset="0" stopColor="#c0583a" /><stop offset=".5" stopColor="#e07a52" /><stop offset="1" stopColor="#a8472f" /></linearGradient>
              <radialGradient id="ll-glow"><stop offset="0" stopColor="#ffe9a8" stopOpacity=".95" /><stop offset="1" stopColor="#ffd27a" stopOpacity="0" /></radialGradient>
            </defs>
            <line x1="100" y1="0" x2="100" y2="62" stroke="#8d93a3" strokeWidth="2" />
            <circle className="ui-lamp-login-halo" cx="100" cy="136" r="62" fill="url(#ll-glow)" />
            <path d="M60 134 L80 62 H120 L140 134 Z" fill="url(#ll-shade)" />
            <ellipse cx="100" cy="134" rx="40" ry="6" className="ui-lamp-login-rim" />
            <circle cx="100" cy="138" r="9" className="ui-lamp-login-bulb" />
            <rect x="94" y="56" width="12" height="9" rx="2" fill="#6b7080" />
          </svg>
          <div className="ui-lamp-login-cord" aria-hidden="false">
            <button type="button" aria-pressed={on} aria-label="Lamp pull cord" onClick={toggle}><i /></button>
          </div>
        </div>
        <p className="ui-lamp-login-hint" aria-hidden="true">{on ? 'Pull again to turn it off' : 'Pull the cord for some light'}</p>
        <p className="ui-lamp-login-sr" role="status">{on ? 'The lamp is on.' : 'The lamp is off.'}</p>
      </div>
      <form className="ui-lamp-login-card" onSubmit={submit} noValidate aria-label="Sign in">
        <h2>{title}</h2>
        {state === 'done' ? (
          <p role="status" className="ui-lamp-login-ok">Signed in. Taking you to your dashboard…</p>
        ) : (
          <>
            <div className="ui-lamp-login-fld" data-bad={bad('email') ? 'true' : undefined}>
              <label htmlFor="ll-email">Email</label>
              <input id="ll-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))} aria-invalid={!!bad('email')} aria-describedby={bad('email') ? 'll-email-e' : undefined} placeholder="you@example.com" />
              {bad('email') && <small id="ll-email-e" role="alert">{errEmail}</small>}
            </div>
            <div className="ui-lamp-login-fld" data-bad={bad('pw') ? 'true' : undefined}>
              <label htmlFor="ll-pw">Password</label>
              <div className="ui-lamp-login-pw">
                <input id="ll-pw" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, pw: true }))} aria-invalid={!!bad('pw')} aria-describedby={bad('pw') ? 'll-pw-e' : undefined} />
                <button type="button" aria-pressed={showPw} onClick={() => setShowPw((s) => !s)}>{showPw ? 'Hide' : 'Show'}</button>
              </div>
              {bad('pw') && <small id="ll-pw-e" role="alert">{errPw}</small>}
            </div>
            {serverErr && <p role="alert" className="ui-lamp-login-srv">{serverErr}</p>}
            <button type="submit" className="ui-lamp-login-submit" disabled={state === 'busy'} aria-busy={state === 'busy'}>
              {state === 'busy' ? <><span className="ui-lamp-login-spin" aria-hidden="true" />Signing in…</> : 'Sign in'}
            </button>
            <a href={forgotHref} className="ui-lamp-login-forgot">Forgot your password?</a>
          </>
        )}
      </form>
    </div>
  );
}

export function Demo() {
  return <Mini w={560}><LampLogin defaultOn /></Mini>;
}
