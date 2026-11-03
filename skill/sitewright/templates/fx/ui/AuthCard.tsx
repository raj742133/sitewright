'use client';
/*
 * Adapted from BoardUI (MIT), Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI) (free tier). See THIRD_PARTY_NOTICES.md.
 * What changed from upstream: the react-aria inputs, checkbox and OTP field are native inputs written here (the one-time code is six real inputs that
 * take paste, backspace and arrow keys); the form validates before it submits and puts the message on the field (aria-invalid, aria-describedby,
 * a live summary); the card switches between sign in, sign up and verify by itself; password fields can be revealed. The provider glyphs are the
 * monochrome Simple Icons paths (CC0) that upstream also uses. The media carousel is not included: pass any node as `media`. Upstream: auth/auth-card.tsx.
 */
import { useEffect, useId, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Ico, cx, useControlled } from './_bui';

export type AuthMode = 'signin' | 'signup' | 'verify';
export type AuthLayout = 'stacked' | 'inline' | 'grid';
export type AuthProvider = 'google' | 'apple' | 'github';
const PROVIDERS: Record<AuthProvider, string> = { google: 'Google', apple: 'Apple', github: 'GitHub' };
const COPY = {
  signin: { title: 'Welcome back', description: 'Sign in to pick up where you left off.', cta: 'Sign in', lead: 'New here?', action: 'Create an account', to: 'signup' },
  signup: { title: 'Create your account', description: 'Start building in a couple of minutes.', cta: 'Create account', lead: 'Already have an account?', action: 'Sign in', to: 'signin' },
  verify: { title: 'Check your inbox', description: 'Enter the code we sent to finish signing in.', cta: 'Verify and continue', lead: 'Code not arriving?', action: 'Send a new one', to: 'verify' },
} as const;

export interface AuthCardProps {
  /** Controlled mode; omit to let the card switch itself. */
  mode?: AuthMode;
  defaultMode?: AuthMode;
  onModeChange?: (m: AuthMode) => void;
  /** verify: where the code went. */
  email?: string;
  codeLength?: number;
  onComplete?: (code: string) => void;
  onResend?: () => void;
  layout?: AuthLayout;
  providers?: AuthProvider[];
  title?: ReactNode;
  description?: ReactNode;
  /** Artwork for the right half; turns the card into a two column split that drops to the form alone in narrow containers. */
  media?: ReactNode;
  /** A mark above the title (a node, so the card stays brand neutral). */
  logo?: ReactNode;
  centered?: boolean;
  /** sign up: ask for the password twice instead of asking for a name. */
  confirmPassword?: boolean;
  footnote?: ReactNode;
  /** Receives the form's own FormData once it validates. */
  onSubmit?: (data: FormData) => void;
  onProvider?: (p: AuthProvider) => void;
  forgotHref?: string;
  /** 1 on a real sign-in page (the card is the page); 2+ when embedded under another heading. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

function Field({ name, label, type = 'text', placeholder, autoComplete, hint, error, reveal }: { name: string; label: string; type?: string; placeholder?: string; autoComplete?: string; hint?: string; error?: string; reveal?: boolean }) {
  const id = useId(); const [show, setShow] = useState(false);
  return (
    <div className={cx('bui-fld', error && 'has-err')}>
      <label htmlFor={id}>{label}</label>
      <div className="bui-fld-in">
        <input id={id} name={name} type={reveal && show ? 'text' : type} placeholder={placeholder} autoComplete={autoComplete} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-d` : undefined} />
        {reveal && <button type="button" className="bui-fld-eye" aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={show} onClick={() => setShow(!show)}><Ico name={show ? 'eye-off' : 'eye'} size={18} /></button>}
      </div>
      {(error || hint) && <p id={`${id}-d`} className={cx('bui-fld-h', error && 'is-err')}>{error ?? hint}</p>}
    </div>
  );
}

function Otp({ length, value, onChange, onComplete }: { length: number; value: string; onChange: (v: string) => void; onComplete?: (v: string) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const set = (next: string) => { const v = next.replace(/\D/g, '').slice(0, length); onChange(v); if (v.length === length) onComplete?.(v); };
  const key = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) { e.preventDefault(); set(value.slice(0, i - 1) + value.slice(i)); refs.current[i - 1]?.focus(); }
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); refs.current[i - 1]?.focus(); }
    else if (e.key === 'ArrowRight' && i < length - 1) { e.preventDefault(); refs.current[i + 1]?.focus(); }
  };
  const paste = (e: ClipboardEvent) => { e.preventDefault(); const t = e.clipboardData.getData('text'); set(t); refs.current[Math.min(length - 1, t.replace(/\D/g, '').length)]?.focus(); };
  const half = length % 2 === 0 ? length / 2 : -1;
  return (
    <div className="bui-otp" role="group" aria-label="Verification code" onPaste={paste}>
      {Array.from({ length }, (_, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} className={cx('bui-otp-i', i === half && 'is-gap')} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={1} aria-label={`Digit ${i + 1} of ${length}`}
          value={value[i] ?? ''} onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(-1); if (!d) return set(value.slice(0, i) + value.slice(i + 1)); set(value.slice(0, i) + d + value.slice(i + 1)); if (i < length - 1) refs.current[i + 1]?.focus(); }} onKeyDown={(e) => key(i, e)} onFocus={(e) => e.currentTarget.select()} />
      ))}
    </div>
  );
}

export default function AuthCard({ mode, defaultMode = 'signin', onModeChange, email, codeLength = 6, onComplete, onResend, layout = 'stacked', providers = ['google', 'apple', 'github'], title, description, media, logo, centered = false, confirmPassword = false, footnote, onSubmit, onProvider, forgotHref = '#', headingLevel = 1, className }: AuthCardProps) {
  const [m, setM] = useControlled<AuthMode>(mode, defaultMode, onModeChange);
  const [errors, setErrors] = useState<Record<string, string>>({}); const [code, setCode] = useState(''); const [remember, setRemember] = useState(true); const [sent, setSent] = useState('');
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { setErrors({}); setCode(''); }, [m]);
  const c = COPY[m]; const signup = m === 'signup'; const verify = m === 'verify'; const H = `h${headingLevel}` as 'h1';
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const er: Record<string, string> = {};
    if (verify) { if (code.length < codeLength) er.code = `Enter all ${codeLength} digits.`; }
    else {
      if (signup && !confirmPassword && !String(fd.get('name') ?? '').trim()) er.name = 'Enter your full name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(fd.get('email') ?? '').trim())) er.email = 'Enter an email address like you@company.com.';
      const pw = String(fd.get('password') ?? '');
      if (!pw) er.password = signup ? 'Choose a password.' : 'Enter your password.'; else if (signup && pw.length < 8) er.password = 'Use at least 8 characters.';
      if (signup && confirmPassword && String(fd.get('confirmPassword') ?? '') !== pw) er.confirmPassword = 'The passwords do not match.';
    }
    setErrors(er);
    const first = Object.keys(er)[0];
    if (first) { requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(first === 'code' ? '.bui-otp-i' : `[name="${first}"]`)?.focus()); return; }
    if (verify) fd.set('code', code);
    onSubmit?.(fd);
  };
  const body = (
    <>
      {(logo || verify) && <div className={cx('bui-auth-mark', centered && 'is-c')}>{logo ?? <Ico name="mail-check" size={32} />}</div>}
      <div className={cx('bui-auth-head', centered && 'is-c')}>
        <H className="bui-auth-t">{title ?? c.title}</H>
        <p className="bui-auth-d">{description ?? (verify && email ? <>Enter the code we sent to <b>{email}</b> to finish signing in.</> : c.description)}</p>
      </div>
      <form ref={form} className="bui-auth-form" noValidate onSubmit={submit}>
        {verify ? (
          <div className="bui-fld"><span className="bui-fld-l" id="bui-otp-l">Verification code</span>
            <Otp length={codeLength} value={code} onChange={setCode} onComplete={onComplete} />
            {errors.code && <p className="bui-fld-h is-err" role="alert">{errors.code}</p>}</div>
        ) : (
          <>
            {signup && !confirmPassword && <Field name="name" label="Full name" placeholder="Ada Lovelace" autoComplete="name" error={errors.name} />}
            <Field name="email" type="email" label="Email" placeholder="you@company.com" autoComplete="email" hint={signup ? 'We use this to contact you, and never share it.' : undefined} error={errors.email} />
            <Field name="password" type="password" reveal label="Password" placeholder={signup ? 'At least 8 characters' : 'Enter your password'} autoComplete={signup ? 'new-password' : 'current-password'} error={errors.password} />
            {signup && confirmPassword && <Field name="confirmPassword" type="password" reveal label="Confirm password" placeholder="Repeat your password" autoComplete="new-password" error={errors.confirmPassword} />}
            {!signup && <div className="bui-auth-row"><label className="bui-chk"><input type="checkbox" className="bui-check" checked={remember} onChange={(e) => setRemember(e.target.checked)} />Remember me</label><a className="bui-link" href={forgotHref}>Forgot password?</a></div>}
          </>
        )}
        <button type="submit" className="bui-btn is-primary is-block">{c.cta}</button>
        {signup && !footnote && <p className="bui-auth-fine">By creating an account you agree to our Terms of Service and Privacy Policy.</p>}
      </form>
      {!verify && providers.length > 0 && (
        <>
          <div className="bui-auth-or"><span>or continue with</span></div>
          <div className={cx('bui-auth-soc', `is-${layout}`)}>
            {providers.map((p) => (
              <button key={p} type="button" className="bui-btn is-secondary" aria-label={`Continue with ${PROVIDERS[p]}`} onClick={() => onProvider?.(p)}><Ico name={p} size={18} />{layout === 'stacked' && `Continue with ${PROVIDERS[p]}`}</button>
            ))}
          </div>
        </>
      )}
      <p className="bui-auth-sw">{c.lead}{' '}
        {verify ? <button type="button" className="bui-link" onClick={() => { onResend?.(); setSent('A new code is on its way.'); }}>{c.action}</button>
          : <button type="button" className="bui-link" onClick={() => setM(c.to as AuthMode)}>{c.action}</button>}</p>
      <p className="bui-sr" role="status" aria-live="polite">{Object.values(errors).length ? `${Object.values(errors).length} problem${Object.values(errors).length > 1 ? 's' : ''} to fix. ${Object.values(errors)[0]}` : sent}</p>
    </>
  );
  const card = media ? (
    <div className={cx('bui-auth', 'is-split', className)}><div className="bui-auth-pane">{body}</div><div className="bui-auth-media" aria-hidden="true">{media}</div></div>
  ) : <div className={cx('bui-auth', className)}><div className="bui-auth-pane">{body}</div></div>;
  return (
    <div className="bui bui-auth-root">
      {card}
      {footnote && <p className="bui-auth-foot">{footnote}</p>}
    </div>
  );
}

export function Demo() {
  const [mode, setMode] = useState<AuthMode>('signin'); const [mail, setMail] = useState(''); const [done, setDone] = useState('');
  return (
    <div className="bui-demo is-center is-scroll">
      <div className="bui-demo-col is-auth">
        <AuthCard mode={mode} onModeChange={setMode} email={mail} headingLevel={2} logo={<span className="bui-auth-logo" aria-hidden="true"><Ico name="home" size={20} /></span>}
          onSubmit={(d) => { if (mode === 'signup') { setMail(String(d.get('email'))); setMode('verify'); setDone(''); } else setDone(mode === 'verify' ? 'Code accepted. You are signed in.' : `Signed in as ${String(d.get('email'))}`); }}
          onProvider={(p) => setDone(`Continue with ${p}`)} onResend={() => setDone('A new code was sent.')} />
        <p className="bui-demo-note" role="status">{done}</p>
      </div>
    </div>
  );
}
