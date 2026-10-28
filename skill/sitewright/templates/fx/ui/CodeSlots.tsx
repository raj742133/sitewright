'use client';
import { useEffect, useRef, useState, type ClipboardEvent, type CSSProperties, type KeyboardEvent } from 'react';
import { cx, useControlled } from './_micro-a';

export interface CodeSlotsProps {
  /** Number of slots. */
  length?: number;
  /** Controlled value (string of up to `length` characters). */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Called once when every slot is filled. */
  onComplete?: (value: string) => void;
  /** Accept only digits (default) or letters and digits. */
  numeric?: boolean;
  /** Show bullets instead of the characters. */
  mask?: boolean;
  disabled?: boolean;
  /** Marks the code as wrong: red slots and a short shake. */
  error?: boolean;
  /** Accessible group label. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** A one-time-code field made of separate slots. Typing rolls each character into place and moves on, Backspace steps back, arrows move, and a pasted code spreads across the slots. */
export default function CodeSlots({ length = 6, value, defaultValue = '', onChange, onComplete, numeric = true, mask = false, disabled, error, label = 'Verification code', className, style }: CodeSlotsProps) {
  const [val, setVal] = useControlled(value, defaultValue.slice(0, length), onChange);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [shake, setShake] = useState(0);
  const done = useRef(onComplete);
  useEffect(() => { done.current = onComplete; });
  const clean = (s: string) => s.replace(numeric ? /[^0-9]/g : /[^a-zA-Z0-9]/g, '').slice(0, length);
  const chars = Array.from({ length }, (_, i) => val[i] ?? '');
  const complete = val.length === length;

  const lastComplete = useRef('');
  useEffect(() => {
    if (complete && lastComplete.current !== val) { lastComplete.current = val; done.current?.(val); }
    if (!complete) lastComplete.current = '';
  }, [complete, val]);
  useEffect(() => { if (error) setShake((n) => n + 1); }, [error]);

  const focus = (i: number) => { const el = refs.current[Math.max(0, Math.min(length - 1, i))]; el?.focus(); el?.select(); };
  const write = (i: number, c: string) => { const a = chars.slice(); a[i] = c; setVal(a.join('').replace(/\s+$/, '').slice(0, length)); };

  const onInput = (i: number, raw: string) => {
    const t = clean(raw);
    if (!t) { if (raw === '') write(i, ''); return; }
    if (t.length > 1) { // autofill / multi-char input spreads forward
      const merged = (val.slice(0, i) + t).slice(0, length);
      setVal(merged); focus(Math.min(merged.length, length - 1)); return;
    }
    if (i > val.length) return;
    write(i, t); focus(i + 1);
  };
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (chars[i]) write(i, ''); else if (i > 0) { setVal(val.slice(0, i - 1)); focus(i - 1); }
    } else if (e.key === 'Delete') { e.preventDefault(); if (chars[i]) setVal(val.slice(0, i)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); focus(i - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); focus(Math.min(i + 1, val.length)); }
    else if (e.key === 'Home') { e.preventDefault(); focus(0); }
    else if (e.key === 'End') { e.preventDefault(); focus(Math.min(val.length, length - 1)); }
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const t = clean(e.clipboardData.getData('text'));
    if (!t) return;
    setVal(t); focus(Math.min(t.length, length - 1));
  };

  return (
    <div className={cx('ui-code-slots', complete && 'is-complete', error && 'is-error', className)} style={style} role="group" aria-label={label} data-shake={shake % 2}>
      {chars.map((c, i) => (
        <span key={i} className="ui-code-slots-cell" style={{ '--i': i } as CSSProperties}>
          {length === 6 && i === 3 && <span className="ui-code-slots-dash" aria-hidden="true" />}
          <span className="ui-code-slots-slot" data-filled={c ? '' : undefined}>
            <span className="ui-code-slots-glyph" key={c || 'empty'} aria-hidden="true">{c ? (mask ? '•' : c) : ''}</span>
            <input ref={(el) => { refs.current[i] = el; }} className="ui-code-slots-input" type={mask ? 'password' : 'text'} inputMode={numeric ? 'numeric' : 'text'}
              autoComplete={i === 0 ? 'one-time-code' : 'off'} autoCapitalize="characters" spellCheck={false} maxLength={length} value={c} disabled={disabled}
              aria-label={`${label}, character ${i + 1} of ${length}`} aria-invalid={error || undefined}
              onChange={(e) => onInput(i, e.target.value)} onKeyDown={(e) => onKey(i, e)} onPaste={onPaste} onFocus={(e) => e.target.select()}
              onPointerDown={(e) => { if (i > val.length) { e.preventDefault(); focus(val.length); } }} />
          </span>
        </span>
      ))}
    </div>
  );
}

export function Demo() {
  const [v, setV] = useState('48');
  return (
    <div className="ui-code-slots-demo">
      <p className="ui-code-slots-cap">Enter the 6-digit code</p>
      <CodeSlots value={v} onChange={setV} />
      <p className="ui-code-slots-cap ui-code-slots-sub" role="status">{v.length === 6 ? 'Code accepted' : 'Type or paste your code'}</p>
    </div>
  );
}
