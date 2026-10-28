'use client';
import { useEffect, useId, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { useReducedMotion } from './_t2';
import { clampN, snapTo, useControlled } from './_inputs-ui';

export interface CounterProps {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Accessible name and visible caption. */
  label?: string;
  /** Minimum digits shown (zero padded). */
  digits?: number;
  className?: string;
  style?: CSSProperties;
}

function Digit({ d, reduced }: { d: number; reduced: boolean }) {
  return (
    <span className="ui-counter-digit" aria-hidden="true">
      <span className="ui-counter-strip" style={{ transform: `translateY(${-d * 10}%)`, transition: reduced ? 'none' : undefined }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <span key={n}>{n}</span>)}
      </span>
    </span>
  );
}

/** A rolling-digit counter. It is a spinbutton: arrows, Page keys and Home/End change it, the +/- buttons repeat while held. */
export default function Counter({ value, defaultValue = 0, onChange, min = 0, max = 9999, step = 1, label = 'Quantity', digits = 3, className, style }: CounterProps) {
  const [v, setV] = useControlled(value, clampN(defaultValue, min, max), onChange);
  const reduced = useReducedMotion();
  const id = useId();
  const vRef = useRef(v);
  vRef.current = v;
  const hold = useRef<{ t: number; i: number }>({ t: 0, i: 0 });
  const by = (n: number) => setV(clampN(snapTo(vRef.current + n * step, min, step), min, max));
  const stop = () => { window.clearTimeout(hold.current.t); window.clearInterval(hold.current.i); };
  useEffect(() => stop, []);
  const start = (dir: number) => {
    stop();
    by(dir);
    hold.current.t = window.setTimeout(() => { hold.current.i = window.setInterval(() => by(dir), 70); }, 420);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowRight') by(1);
    else if (k === 'ArrowDown' || k === 'ArrowLeft') by(-1);
    else if (k === 'PageUp') by(10);
    else if (k === 'PageDown') by(-10);
    else if (k === 'Home') setV(min);
    else if (k === 'End') setV(max);
    else return;
    e.preventDefault();
  };
  const text = String(Math.abs(Math.round(v))).padStart(Math.max(digits, String(Math.abs(Math.round(max))).length > digits ? 0 : digits), '0');
  const dec = v < 0;
  return (
    <div className={`ui-counter-root ${className ?? ''}`} style={style}>
      <span className="ui-counter-label" id={id}>{label}</span>
      <div className="ui-counter-row">
        <button type="button" className="ui-counter-btn" aria-label={`Decrease ${label}`} disabled={v <= min}
          onPointerDown={(e) => { if (e.button === 0) start(-1); }} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) by(-1); } }}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>
        </button>
        <div className="ui-counter-display" role="spinbutton" tabIndex={0} aria-labelledby={id} aria-valuenow={v} aria-valuemin={min} aria-valuemax={max} onKeyDown={onKey}>
          {dec && <span className="ui-counter-sign" aria-hidden="true">-</span>}
          {text.split('').map((c, i) => <Digit key={text.length - i} d={Number(c)} reduced={reduced} />)}
        </div>
        <button type="button" className="ui-counter-btn" aria-label={`Increase ${label}`} disabled={v >= max}
          onPointerDown={(e) => { if (e.button === 0) start(1); }} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) by(1); } }}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3v10" /></svg>
        </button>
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-counter-demo">
      <Counter defaultValue={24} label="Seats" max={500} />
    </div>
  );
}
