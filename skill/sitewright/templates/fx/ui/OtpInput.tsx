'use client';
import { useEffect, useId, useRef, useState } from 'react';

export interface OtpInputProps {
  /** number of boxes */
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (code: string) => void;
  /** single-character regex source, default digits only */
  pattern?: string;
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
}

export default function OtpInput({
  length = 6, value, defaultValue = '', onChange, onComplete, pattern = '[0-9]',
  error = false, success = false, disabled = false, autoFocus = false, label = 'One-time code',
}: OtpInputProps) {
  const n = Math.max(1, Math.min(12, Math.floor(length)));
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [inner, setInner] = useState(defaultValue);
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);
  const [shake, setShake] = useState(0);
  const controlled = value !== undefined;
  const raw = controlled ? value : inner;

  let re: RegExp;
  try { re = new RegExp(`^(?:${pattern})$`); } catch { re = /^[0-9]$/; }
  const clean = (s: string) => Array.from(s).filter((c) => re.test(c)).join('').slice(0, n);
  const code = clean(raw);
  const numeric = pattern === '[0-9]' || pattern === '\\d';

  useEffect(() => { if (error) setShake((k) => k + 1); }, [error]);
  useEffect(() => { if (autoFocus && !disabled) ref.current?.focus(); }, [autoFocus, disabled]);

  const commit = (next: string) => {
    if (next === code) return;
    if (!controlled) setInner(next);
    onChange?.(next);
    if (next.length === n) onComplete?.(next);
  };
  const place = (pos: number) => {
    const p = Math.max(0, Math.min(n, pos));
    setCaret(p);
    requestAnimationFrame(() => { try { ref.current?.setSelectionRange(p, p); } catch { /* unsupported type */ } });
  };
  const syncCaret = () => {
    const el = ref.current;
    if (el) setCaret(el.selectionStart ?? code.length);
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const pos = el.selectionStart ?? el.value.length;
    const next = clean(el.value);
    // number of accepted chars before the caret
    const before = clean(el.value.slice(0, pos)).length;
    commit(next);
    if (el.value !== next) el.value = next;
    place(before);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Home') { e.preventDefault(); place(0); }
    else if (e.key === 'End') { e.preventDefault(); place(code.length); }
    setTimeout(syncCaret, 0);
  };

  const onBoxPointer = (i: number) => (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    ref.current?.focus();
    place(Math.min(i, code.length));
  };

  const active = focused && !disabled ? Math.min(caret, n - 1) : -1;
  const state = error ? 'error' : success ? 'success' : 'idle';
  const reduceDelay = (i: number) => ({ ['--ui-otp-i' as string]: i });

  return (
    <div className="ui-otp-input-root" data-state={state} data-disabled={disabled || undefined}>
      <div key={shake} className="ui-otp-input-row" data-shake={error && shake > 0 ? 'true' : undefined}>
        <input
          ref={ref}
          id={id}
          className="ui-otp-input-real"
          type="text"
          inputMode={numeric ? 'numeric' : 'text'}
          autoComplete="one-time-code"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={n * 2}
          pattern={pattern + '*'}
          aria-label={`${label}, ${n} characters`}
          aria-invalid={error || undefined}
          aria-describedby={`${id}-status`}
          disabled={disabled}
          value={code}
          onChange={onInput}
          onKeyDown={onKey}
          onKeyUp={syncCaret}
          onSelect={syncCaret}
          onFocus={() => { setFocused(true); syncCaret(); }}
          onBlur={() => setFocused(false)}
        />
        {Array.from({ length: n }, (_, i) => {
          const ch = code[i];
          return (
            <span key={i} className="ui-otp-input-box" aria-hidden="true" data-filled={ch ? 'true' : undefined}
              data-active={i === active || undefined} style={reduceDelay(i)} onPointerDown={onBoxPointer(i)}>
              {ch ? <span key={ch + i} className="ui-otp-input-char">{ch}</span> : i === active ? <span className="ui-otp-input-caret" /> : null}
            </span>
          );
        })}
        {success && (
          <span className="ui-otp-input-seal" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path className="ui-otp-input-tick" pathLength={1} d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        )}
      </div>
      <span id={`${id}-status`} className="ui-otp-input-sr" role="status" aria-live="polite">
        {error ? 'Incorrect code' : success ? 'Code verified' : `${code.length} of ${n} entered`}
      </span>
    </div>
  );
}

export function Demo() {
  const [state, setState] = useState<'idle' | 'error' | 'success'>('idle');
  const [val, setVal] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const check = (code: string) => {
    if (code === '123456') setState('success');
    else {
      setState('error');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { setState('idle'); setVal(''); }, 900);
    }
  };
  return (
    <div className="ui-otp-input-demo">
      <OtpInput length={6} value={val} onChange={(v) => { setVal(v); if (state !== 'idle') setState('idle'); }}
        onComplete={check} error={state === 'error'} success={state === 'success'} label="Verification code" />
      <p className="ui-otp-input-hint">
        {state === 'success' ? 'Verified. Welcome back.' : state === 'error' ? 'That code is not right.' : 'Try 123456, or paste a code.'}
      </p>
      {state === 'success' && <button type="button" className="ui-otp-input-reset" onClick={() => { setState('idle'); setVal(''); }}>Reset</button>}
    </div>
  );
}
