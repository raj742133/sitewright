'use client';
import { useEffect, useRef, useState } from 'react';
import { captionStyle, useReducedMotion } from './_d1';

export interface RollingPublishProps {
  /** Labels in rolling order: idle, working, finished. */
  labels?: [string, string, string];
  /** Duration of the fake progress, ms. */
  durationMs?: number;
  onPublish?: () => void;
  onDone?: () => void;
  onReset?: () => void;
}

type Phase = 'idle' | 'working' | 'done';

/** Publish button: the cloud icon rolls upward into a check while the label rolls slot-machine style from Publish to Published, with a progress fill. */
export default function RollingPublish({ labels = ['Publish', 'Publishing', 'Published'], durationMs = 2000, onPublish, onDone, onReset }: RollingPublishProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [pct, setPct] = useState(0);
  const reduced = useReducedMotion();
  const raf = useRef(0);
  const cb = useRef({ onDone });
  cb.current = { onDone };

  useEffect(() => {
    if (phase !== 'working') return;
    if (reduced) { setPct(100); setPhase('done'); cb.current.onDone?.(); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      setPct(Math.round((t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2) * 100));
      if (t < 1) { raf.current = requestAnimationFrame(step); return; }
      setPhase('done');
      cb.current.onDone?.();
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, durationMs, reduced]);

  const click = () => {
    if (phase === 'working') return;
    if (phase === 'done') { setPhase('idle'); setPct(0); onReset?.(); return; }
    onPublish?.();
    setPct(0);
    setPhase('working');
  };
  const idx = phase === 'idle' ? 0 : phase === 'working' ? 1 : 2;
  const aria = phase === 'idle' ? labels[0] : phase === 'working' ? `${labels[1]}, ${pct} percent` : `${labels[2]}. Press to reset.`;
  return (
    <div className="ui-rolling-publish" data-phase={phase}>
      <button type="button" className="ui-rolling-publish-btn" onClick={click} aria-disabled={phase === 'working'} aria-label={aria}>
        <span className="ui-rolling-publish-fill" aria-hidden="true" style={{ transform: `scaleX(${pct / 100})` }} />
        <span className="ui-rolling-publish-icon" aria-hidden="true">
          <span className="ui-rolling-publish-roll" style={{ transform: `translateY(${-idx * 24}px)` }}>
            <svg viewBox="0 0 24 24"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10a4 4 0 0 1-.5 8z" /><path d="M12 16v-5M9.5 13l2.5-2.5 2.5 2.5" /></svg>
            <svg viewBox="0 0 24 24" className="ui-rolling-publish-spin"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10a4 4 0 0 1-.5 8z" /><path d="M12 16v-5M9.5 13l2.5-2.5 2.5 2.5" /></svg>
            <svg viewBox="0 0 24 24"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10a4 4 0 0 1-.5 8z" /><path d="M9.5 13.5l2 2 3.5-4" /></svg>
          </span>
        </span>
        <span className="ui-rolling-publish-window" aria-hidden="true">
          <span className="ui-rolling-publish-roll" style={{ transform: `translateY(${-idx * 24}px)` }}>
            {labels.map((l, i) => (
              <span key={i} className="ui-rolling-publish-word">{i === 1 ? `${l} ${pct}%` : l}</span>
            ))}
          </span>
        </span>
      </button>
      <span className="ui-rolling-publish-sr" role="status" aria-live="polite">{phase === 'done' ? labels[2] : phase === 'working' && pct < 2 ? labels[1] : ''}</span>
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
      <RollingPublish />
      <span style={captionStyle}>Press again to reset</span>
    </div>
  );
}
