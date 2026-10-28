'use client';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { clamp, useFrameLoop } from './_micro-c';
import { useReducedMotion } from './_t2';

export interface ThoughtLineProps {
  /** Visible label above the field. */
  label?: string;
  placeholder?: string;
  /** Controlled value. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Characters at which the line is fully drawn (also the input's maxLength). */
  maxLength?: number;
  name?: string;
  disabled?: boolean;
  className?: string;
}

function wave(amp: number, phase: number): string {
  let d = '';
  for (let i = 0; i <= 50; i++) {
    const x = i * 2;
    const env = Math.sin((i / 50) * Math.PI);
    const y = 6 + amp * env * Math.sin(phase + i * 0.42);
    d += `${i === 0 ? 'M' : 'L'}${x} ${y.toFixed(2)} `;
  }
  return d;
}

/** A text field with a living underline: while you type the line ripples like a train of thought and settles flat when you pause, and its coloured stretch grows as you fill the character budget. */
export default function ThoughtLine({ label = 'What is on your mind?', placeholder = 'Start a thought', value, defaultValue = '', onChange, maxLength = 60, name, disabled, className = '' }: ThoughtLineProps) {
  const reduced = useReducedMotion();
  const id = useId();
  const [inner, setInner] = useState(defaultValue);
  const text = value ?? inner;
  const baseRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const st = useRef({ amp: 0, phase: 0 });
  const progress = clamp(text.length / maxLength, 0, 1);

  const loop = useFrameLoop((dt) => {
    const s = st.current;
    s.phase += dt * 14;
    s.amp *= Math.exp(-dt * 2.4);
    const live = s.amp > 0.05;
    if (!live) s.amp = 0;
    const d = wave(s.amp, s.phase);
    baseRef.current?.setAttribute('d', d);
    fillRef.current?.setAttribute('d', d);
    return live;
  });

  const change = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (value === undefined) setInner(v);
    onChange?.(v);
    if (!reduced) { st.current.amp = Math.min(4.2, st.current.amp + 2.2); loop.start(); }
  };
  const flat = wave(0, 0);
  return (
    <div className={`ui-thought-line ${className}`.trim()} data-disabled={disabled || undefined} style={{ ['--tl-p' as string]: progress }}>
      <label className="ui-thought-line-label" htmlFor={id}>{label}</label>
      <input id={id} className="ui-thought-line-input" type="text" value={text} onChange={change} placeholder={placeholder} maxLength={maxLength} name={name} disabled={disabled}
        autoComplete="off" aria-describedby={`${id}-n`} />
      <div className="ui-thought-line-rail" aria-hidden="true">
        <svg viewBox="0 0 100 12" preserveAspectRatio="none" focusable="false">
          <path ref={baseRef} className="ui-thought-line-base" d={flat} />
          <path ref={fillRef} className="ui-thought-line-fill" d={flat} pathLength={100} strokeDasharray={`${(progress * 100).toFixed(2)} 100`} />
        </svg>
        <span className="ui-thought-line-head" style={{ left: `${(progress * 100).toFixed(2)}%`, opacity: progress > 0 ? 1 : 0 }} />
      </div>
      <span id={`${id}-n`} className="ui-thought-line-count">{text.length} of {maxLength} characters</span>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-thought-line-stage">
      <ThoughtLine defaultValue="Maybe the answer is" />
    </div>
  );
}
