'use client';
import { useEffect, useRef, useState } from 'react';
import { clamp } from './_micro-c';

export interface VoicePillProps {
  /** Accessible name of the toggle. */
  label?: string;
  /** Controlled listening state. */
  listening?: boolean;
  defaultListening?: boolean;
  /** Called when the person toggles it; the second argument is the seconds recorded when stopping. */
  onToggle?: (listening: boolean, seconds: number) => void;
  /** Optional live input level 0..1 (for example from an analyser). Without it the bars play a gentle ambient pattern. */
  level?: number;
  disabled?: boolean;
  className?: string;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const BARS = 7;
// Fixed pattern so the first render is deterministic.
const SHAPE = [0.45, 0.8, 0.6, 1, 0.7, 0.9, 0.5];

/** A pill-shaped voice toggle: tap to start listening and the mic swells into a live level meter with a running timer; tap again to stop. It is a real toggle button (aria-pressed) and announces start and stop. */
export default function VoicePill({ label = 'Voice note', listening, defaultListening = false, onToggle, level, disabled, className = '' }: VoicePillProps) {
  const [inner, setInner] = useState(defaultListening);
  const on = listening ?? inner;
  const [secs, setSecs] = useState(0);
  const secsRef = useRef(0);
  const [msg, setMsg] = useState('');
  const first = useRef(true);

  useEffect(() => {
    if (!on) return;
    secsRef.current = 0; setSecs(0);
    const t = setInterval(() => { secsRef.current += 1; setSecs(secsRef.current); }, 1000);
    return () => clearInterval(t);
  }, [on]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setMsg(on ? 'Listening' : `Stopped, ${fmt(secsRef.current)} recorded`);
  }, [on]);

  const toggle = () => {
    const next = !on;
    if (listening === undefined) setInner(next);
    onToggle?.(next, secsRef.current);
  };
  const lv = level === undefined ? undefined : clamp(level, 0, 1);
  return (
    <span className={`ui-voice-pill-wrap ${className}`.trim()}>
      <button type="button" className="ui-voice-pill" aria-pressed={on} disabled={disabled} onClick={toggle} data-on={on || undefined}>
        <span className="ui-voice-pill-mic" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
          </svg>
        </span>
        <span className="ui-voice-pill-label">{on ? 'Listening' : label}</span>
        <span className="ui-voice-pill-bars" aria-hidden="true">
          {SHAPE.slice(0, BARS).map((h, i) => (
            <i key={i} style={{ ['--h' as string]: h, ['--d' as string]: `${i * 90}ms`, ...(lv !== undefined ? { ['--lv' as string]: (0.2 + lv * h * 0.8).toFixed(3) } : {}) }} data-live={lv !== undefined || undefined} />
          ))}
        </span>
        <span className="ui-voice-pill-time" aria-hidden="true">{fmt(secs)}</span>
      </button>
      <span className="ui-voice-pill-sr" role="status" aria-live="polite">{msg}</span>
    </span>
  );
}

export function Demo() {
  return (
    <div className="ui-voice-pill-stage">
      <VoicePill />
      <p className="ui-voice-pill-note" aria-hidden="true">Tap to record</p>
    </div>
  );
}
