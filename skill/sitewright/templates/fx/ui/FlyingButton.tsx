'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cx } from './_micro-a';

export interface FlyingButtonProps {
  label?: string;
  busyLabel?: string;
  doneLabel?: string;
  /** Called on click. May return a promise: the plane keeps flying until it settles (at least `minFlight` ms). A rejection shows an error and resets. */
  onSend?: () => void | Promise<unknown>;
  /** Shortest flight in ms. */
  minFlight?: number;
  /** How long the "sent" state stays before the button resets. */
  resetAfter?: number;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}
type Phase = 'idle' | 'flying' | 'done';

/** A send button: the paper plane lifts off and trails away while the work runs, then a check lands and the button resets. Busy state is announced and the button ignores repeat clicks. Under reduced motion only the labels swap. */
export default function FlyingButton({ label = 'Send message', busyLabel = 'Sending…', doneLabel = 'Sent', onSend, minFlight = 1100, resetAfter = 1800, disabled, className, style }: FlyingButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [err, setErr] = useState(false);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { alive.current = true; return () => { alive.current = false; clearTimeout(timer.current); }; }, []);

  const go = async () => {
    if (phase !== 'idle' || disabled) return;
    setErr(false); setPhase('flying');
    const wait = new Promise((r) => setTimeout(r, minFlight));
    try { await Promise.all([Promise.resolve(onSend?.()), wait]); } catch { if (alive.current) { setPhase('idle'); setErr(true); } return; }
    if (!alive.current) return;
    setPhase('done');
    timer.current = setTimeout(() => { if (alive.current) setPhase('idle'); }, resetAfter);
  };
  const text = phase === 'flying' ? busyLabel : phase === 'done' ? doneLabel : label;

  return (
    <span className={cx('ui-flying-button-wrap', className)} style={style}>
      <button type="button" className="ui-flying-button" data-phase={phase} aria-disabled={disabled || phase !== 'idle' || undefined} aria-label={label} aria-busy={phase === 'flying'} onClick={go}>
        <span className="ui-flying-button-trail" aria-hidden="true" />
        <span className="ui-flying-button-plane" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" focusable="false"><path d="M21.5 3.2 2.8 10.4a.8.8 0 0 0 0 1.5l6.2 2.3 2.3 6.2a.8.8 0 0 0 1.5 0L20 5.9z" opacity=".95" /><path d="M9 14.2 21.5 3.2l-9.4 13.7z" opacity=".55" /></svg>
        </span>
        <span className="ui-flying-button-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
        <span className="ui-flying-button-labels" aria-hidden="true">
          <span data-on={phase === 'idle' || undefined}>{label}</span>
          <span data-on={phase === 'flying' || undefined}>{busyLabel}</span>
          <span data-on={phase === 'done' || undefined}>{doneLabel}</span>
        </span>
      </button>
      <span className="ui-flying-button-status" role="status" aria-live="polite">{err ? 'Could not send. Try again.' : phase === 'idle' ? '' : text}</span>
    </span>
  );
}

export function Demo() {
  return (
    <div className="ui-flying-button-demo">
      <FlyingButton onSend={() => new Promise((r) => setTimeout(r, 400))} />
    </div>
  );
}
