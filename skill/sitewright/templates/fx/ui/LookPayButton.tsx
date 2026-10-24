'use client';
import { useEffect, useRef, useState } from 'react';
import { captionStyle, useCoarsePointer, useReducedMotion, useTimers } from './_d1';

export interface LookPayButtonProps {
  /** Amount shown on the button, e.g. "$24.00". */
  amount?: string;
  label?: string;
  /** Fires when the payment animation finishes. */
  onPaid?: () => void;
  onReset?: () => void;
}

type Phase = 'idle' | 'paying' | 'paid';
const MAX = 4; // how far a pupil may travel, in px

/** Pay button with two eyes that follow the pointer, look at the label on keyboard focus, and close when pressed. */
export default function LookPayButton({ amount = '$24.00', label = 'Pay', onPaid, onReset }: LookPayButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const { later } = useTimers();
  const btn = useRef<HTMLButtonElement>(null);
  const pupils = useRef<(HTMLSpanElement | null)[]>([]);
  const focusLook = useRef(false);
  const cb = useRef({ onPaid, onReset });
  cb.current = { onPaid, onReset };

  const look = (i: number, x: number, y: number) => {
    const p = pupils.current[i];
    if (p) p.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  };

  useEffect(() => {
    if (coarse || reduced || phase !== 'idle') return;
    let raf = 0;
    let last: PointerEvent | null = null;
    const apply = () => {
      raf = 0;
      if (!last || focusLook.current) return;
      pupils.current.forEach((p, i) => {
        if (!p || !p.parentElement) return;
        const r = p.parentElement.getBoundingClientRect();
        const dx = last!.clientX - (r.left + r.width / 2);
        const dy = last!.clientY - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(MAX, d / 10) / d;
        look(i, dx * k, dy * k);
      });
    };
    const move = (e: PointerEvent) => { last = e; if (!raf) raf = requestAnimationFrame(apply); };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [coarse, reduced, phase]);

  const pay = () => {
    if (phase !== 'idle') return;
    setPhase('paying');
    later(() => { setPhase('paid'); cb.current.onPaid?.(); }, reduced ? 0 : 750);
  };
  const reset = () => {
    setPhase('idle');
    cb.current.onReset?.();
    requestAnimationFrame(() => btn.current?.focus());
  };

  const status = phase === 'paying' ? 'Processing payment.' : phase === 'paid' ? `Payment of ${amount} confirmed.` : '';
  return (
    <div className="ui-look-pay-button" data-phase={phase}>
      <button
        ref={btn}
        type="button"
        className="ui-look-pay-button-btn"
        aria-disabled={phase !== 'idle'}
        onClick={pay}
        onFocus={(e) => {
          if (!e.currentTarget.matches(':focus-visible')) return;
          focusLook.current = true;
          look(0, 3, 1); look(1, 3, 1);
        }}
        onBlur={() => { focusLook.current = false; look(0, 0, 0); look(1, 0, 0); }}
      >
        <span className="ui-look-pay-button-eyes" aria-hidden="true">
          {phase === 'paid' ? (
            <svg viewBox="0 0 24 24" className="ui-look-pay-button-check"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          ) : (
            [0, 1].map((i) => (
              <span key={i} className="ui-look-pay-button-eye">
                <span className="ui-look-pay-button-pupil" ref={(el) => { pupils.current[i] = el; }} />
              </span>
            ))
          )}
        </span>
        <span className="ui-look-pay-button-label">
          {phase === 'idle' && `${label} ${amount}`}
          {phase === 'paying' && 'Paying…'}
          {phase === 'paid' && `Paid ${amount}`}
        </span>
      </button>
      {phase === 'paid' && <button type="button" className="ui-look-pay-button-reset" onClick={reset}>Reset</button>}
      <span className="ui-look-pay-button-sr" role="status" aria-live="polite">{status}</span>
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
      <LookPayButton amount="$24.00" />
      <span style={captionStyle}>It watches your cursor</span>
    </div>
  );
}
