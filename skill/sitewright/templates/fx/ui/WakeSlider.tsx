'use client';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { clamp } from './_micro-c';

export interface WakeSliderProps {
  /** Text on the track while asleep. */
  label?: string;
  /** Text once awake. */
  awakeLabel?: string;
  /** Controlled awake state. */
  awake?: boolean;
  defaultAwake?: boolean;
  /** Called with true when the thumb reaches the end, false when it is returned. */
  onChange?: (awake: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const STEP = 10;
const WAKE_AT = 92;

/** A slide-to-confirm control: drag the thumb to the end to wake (the moon rises into a sun), or use the keyboard: arrows move it, End or Enter wakes, Home or Escape puts it back to sleep. Let go early and it springs back. */
export default function WakeSlider({ label = 'Slide to wake', awakeLabel = 'Awake', awake, defaultAwake = false, onChange, disabled, className = '' }: WakeSliderProps) {
  const [inner, setInner] = useState(defaultAwake);
  const on = awake ?? inner;
  const [p, setP] = useState(on ? 100 : 0);
  const [drag, setDrag] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const st = useRef<{ id: number; sx: number; base: number } | null>(null);
  const [msg, setMsg] = useState('');
  const shown = on && !drag ? 100 : p;

  const settle = (a: boolean) => {
    setP(a ? 100 : 0);
    if (a !== on) {
      if (awake === undefined) setInner(a);
      onChange?.(a);
      setMsg(a ? awakeLabel : 'Asleep');
    }
  };
  const range = () => Math.max(1, (track.current?.clientWidth ?? 280) - (track.current?.querySelector<HTMLElement>('.ui-wake-slider-thumb')?.offsetWidth ?? 52) - 8);
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    st.current = { id: e.pointerId, sx: e.clientX, base: shown };
    setDrag(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s || s.id !== e.pointerId) return;
    setP(clamp(s.base + ((e.clientX - s.sx) / range()) * 100, 0, 100));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s || s.id !== e.pointerId) return;
    st.current = null;
    setDrag(false);
    settle(p >= WAKE_AT);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowUp') { const n = clamp(shown + STEP, 0, 100); setP(n); if (n >= WAKE_AT) settle(true); }
    else if (k === 'ArrowLeft' || k === 'ArrowDown') { const n = clamp(shown - STEP, 0, 100); setP(n); if (on) settle(false); }
    else if (k === 'End' || k === 'Enter' || k === ' ') settle(true);
    else if (k === 'Home' || k === 'Escape') settle(false);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={track} className={`ui-wake-slider ${className}`.trim()} data-awake={on || undefined} data-drag={drag || undefined} data-disabled={disabled || undefined}
      style={{ ['--wp' as string]: shown / 100 }}>
      <div className="ui-wake-slider-fill" aria-hidden="true" />
      <span className="ui-wake-slider-text" aria-hidden="true"><span>{on ? awakeLabel : label}</span></span>
      <div className="ui-wake-slider-thumb" role="slider" tabIndex={disabled ? -1 : 0} aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(shown)}
        aria-valuetext={on ? awakeLabel : `${Math.round(shown)} percent, asleep`} aria-disabled={disabled || undefined} aria-keyshortcuts="ArrowRight End Home"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path className="ui-wake-slider-moon" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
          <g className="ui-wake-slider-sun"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></g>
        </svg>
      </div>
      <span className="ui-wake-slider-sr" role="status" aria-live="polite">{msg}</span>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-wake-slider-stage">
      <WakeSlider />
    </div>
  );
}
