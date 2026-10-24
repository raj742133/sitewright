'use client';
import { useState } from 'react';
import { captionStyle, useReducedMotion, useTimers } from './_d1';

export interface FoldingSubscribeProps {
  label?: string;
  doneLabel?: string;
  onSubscribe?: () => void;
  onReset?: () => void;
}

type Phase = 'idle' | 'fold' | 'fly' | 'done';

/** Subscribe button that folds in half, then in thirds, turns into a paper plane and flies away, leaving a Subscribed state with a Reset. */
export default function FoldingSubscribe({ label = 'Subscribe', doneLabel = 'Subscribed', onSubscribe, onReset }: FoldingSubscribeProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const reduced = useReducedMotion();
  const { later, clear } = useTimers();

  const go = () => {
    if (phase !== 'idle') return;
    onSubscribe?.();
    if (reduced) { setPhase('done'); return; }
    setPhase('fold');
    later(() => setPhase('fly'), 800);
    later(() => setPhase('done'), 1500);
  };
  const reset = () => { clear(); setPhase('idle'); onReset?.(); };

  const half = (cls: string) => (
    <span className={`ui-folding-subscribe-panel ${cls}`} aria-hidden="true"><span>{label}</span></span>
  );
  return (
    <div className="ui-folding-subscribe" data-phase={phase}>
      <button type="button" className="ui-folding-subscribe-btn" onClick={go} disabled={phase === 'fold' || phase === 'fly'} aria-disabled={phase === 'done'} tabIndex={phase === 'done' ? -1 : undefined}>
        <span className="ui-folding-subscribe-stack">
          {half('is-top')}
          {half('is-bottom')}
          <svg className="ui-folding-subscribe-plane" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M3 15 29 4 22 28 15 19z" /><path d="M15 19 29 4" />
          </svg>
        </span>
        <span className="ui-folding-subscribe-ok">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          {doneLabel}
        </span>
        <span className="ui-folding-subscribe-sr">{phase === 'done' ? doneLabel : label}</span>
      </button>
      <button type="button" className="ui-folding-subscribe-reset" onClick={reset} hidden={phase !== 'done'}>Reset</button>
      <span className="ui-folding-subscribe-sr" role="status" aria-live="polite">{phase === 'done' ? 'Subscribed. You will get the next issue.' : phase === 'fold' ? 'Sending…' : ''}</span>
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 10, padding: '14px 0 0' }}>
      <FoldingSubscribe />
      <span style={captionStyle}>Folds, flies, confirms</span>
    </div>
  );
}
