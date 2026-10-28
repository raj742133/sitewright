'use client';
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { clamp } from './_micro-b';

export interface ScrubFieldProps {
  /** Controlled value. */
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  label?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Pixels of horizontal drag per step. Shift = 10x finer, Alt = 10x coarser. */
  pxPerStep?: number;
  name?: string;
  className?: string;
  style?: CSSProperties;
}

const decimals = (step: number) => { const s = String(step); const i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; };

/** A number field with a scrubbable label: drag the label sideways to change the value (a ruler shows the travel), or type, or use the arrow keys. Escape reverts an edit. */
export default function ScrubField({ value, defaultValue = 50, onChange, label = 'Opacity', unit = '%', min = 0, max = 100, step = 1, pxPerStep = 4, name, className = '', style }: ScrubFieldProps) {
  const id = useId();
  const hint = `${id}-h`;
  const dp = decimals(step);
  const fmt = (n: number) => n.toFixed(dp);
  const [inner, setInner] = useState(clamp(defaultValue, min, max));
  const cur = clamp(value ?? inner, min, max);
  const [text, setText] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const g = useRef({ x: 0, v: 0, acc: 0, moved: false, pid: -1 });
  const curRef = useRef(cur);
  useEffect(() => { curRef.current = cur; });

  const commit = (n: number) => {
    const v = clamp(Math.round(n / step) * step, min, max);
    const out = Number(v.toFixed(dp));
    if (out !== curRef.current) { curRef.current = out; if (value === undefined) setInner(out); onChange?.(out); }
    return out;
  };
  const down = (e: PointerEvent<HTMLLabelElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    g.current = { x: e.clientX, v: cur, acc: 0, moved: false, pid: e.pointerId };
    setDrag(true);
  };
  const move = (e: PointerEvent<HTMLLabelElement>) => {
    if (!drag || e.pointerId !== g.current.pid) return;
    const gain = e.shiftKey ? 0.1 : e.altKey ? 10 : 1;
    g.current.acc += ((e.clientX - g.current.x) / pxPerStep) * step * gain;
    g.current.x = e.clientX;
    if (Math.abs(g.current.acc) > step * 0.5) g.current.moved = true;
    g.current.v = clamp(g.current.v + g.current.acc, min, max);
    g.current.acc = 0;
    commit(g.current.v);
  };
  const up = (e: PointerEvent<HTMLLabelElement>) => {
    if (e.pointerId !== g.current.pid) return;
    g.current.pid = -1;
    setDrag(false);
    if (!g.current.moved) input.current?.focus();
  };
  const key = (e: KeyboardEvent<HTMLInputElement>) => {
    const big = e.shiftKey ? 10 : 1;
    let n: number | null = null;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') n = cur + step * big;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') n = cur - step * big;
    else if (e.key === 'PageUp') n = cur + step * 10;
    else if (e.key === 'PageDown') n = cur - step * 10;
    else if (e.key === 'Home') n = min;
    else if (e.key === 'End') n = max;
    else if (e.key === 'Enter') { finish(); e.preventDefault(); return; }
    else if (e.key === 'Escape') { setText(null); return; }
    if (n === null) return;
    e.preventDefault();
    setText(null);
    commit(n);
  };
  const finish = () => {
    if (text === null) return;
    const n = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(n)) commit(n);
    setText(null);
  };
  const frac = max > min ? (cur - min) / (max - min) : 0;
  return (
    <div className={`ui-scrub-field ${className}`.trim()} style={{ ...style, ['--sf-frac' as string]: frac, ['--sf-pos' as string]: `${(cur / step) * pxPerStep}px` }} data-drag={drag || undefined}>
      <label htmlFor={id} className="ui-scrub-field-handle" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} title="Drag sideways to scrub">
        <span className="ui-scrub-field-grip" aria-hidden="true" />
        <span className="ui-scrub-field-label">{label}</span>
      </label>
      <input ref={input} id={id} name={name} className="ui-scrub-field-input" type="text" inputMode="decimal" role="spinbutton" autoComplete="off" aria-describedby={hint}
        aria-valuemin={min} aria-valuemax={max} aria-valuenow={cur} aria-valuetext={`${fmt(cur)}${unit ? ' ' + unit : ''}`}
        value={text ?? fmt(cur)} onChange={(e) => setText(e.target.value)} onFocus={(e) => e.currentTarget.select()} onBlur={finish} onKeyDown={key} />
      {unit && <span className="ui-scrub-field-unit" aria-hidden="true">{unit}</span>}
      <span className="ui-scrub-field-ruler" aria-hidden="true" />
      <span className="ui-scrub-field-fill" aria-hidden="true" />
      <span id={hint} className="ui-scrub-field-sr">Drag the label sideways to scrub, type a number, or use the arrow keys. Shift steps by ten.</span>
    </div>
  );
}

export function Demo() {
  const [a, setA] = useState(64);
  const [b, setB] = useState(12);
  return (
    <div className="ui-scrub-field-stage">
      <div className="ui-scrub-field-preview" aria-hidden="true" style={{ opacity: a / 100, borderRadius: b * 1.5 }} />
      <ScrubField value={a} onChange={setA} label="Opacity" unit="%" />
      <ScrubField value={b} onChange={setB} label="Radius" unit="px" max={32} />
    </div>
  );
}
