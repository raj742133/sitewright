'use client';
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { useReducedMotion } from './_t2';
import { clampN, useControlled } from './_inputs-ui';

export interface WheelOption { value: string; label: string }
export interface OptionWheelProps {
  options?: WheelOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT: WheelOption[] = [
  { value: 'sun', label: 'Sunrise' }, { value: 'day', label: 'Daylight' }, { value: 'gold', label: 'Golden' },
  { value: 'dusk', label: 'Dusk' }, { value: 'night', label: 'Night' }, { value: 'moon', label: 'Moonlit' },
];

/** A rotary selector. Drag around the dial, scroll over it, click a dot or use the arrow keys; the chosen option is announced as a radio. */
export default function OptionWheel({ options = DEFAULT, value, defaultValue, onChange, label = 'Lighting', className, style }: OptionWheelProps) {
  const n = options.length;
  const [val, setVal] = useControlled(value, defaultValue ?? options[0]?.value ?? '', onChange);
  const reduced = useReducedMotion();
  const id = useId();
  const dial = useRef<HTMLDivElement>(null);
  const idx = Math.max(0, options.findIndex((o) => o.value === val));
  const step = 360 / Math.max(1, n);
  const [rot, setRot] = useState(0); // continuous rotation of the ring in degrees
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ last: 0, acc: 0, moved: false });
  const btns = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep the ring in step with the selected option (shortest way round) unless the user is dragging it.
  useEffect(() => {
    if (dragging) return;
    setRot((r) => { const want = -idx * step; let d = (want - r) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return r + d; });
  }, [idx, step, dragging]);

  const pick = (i: number) => { const o = options[((i % n) + n) % n]; if (o) setVal(o.value); };
  const angleOf = (e: PointerEvent) => { const r = dial.current!.getBoundingClientRect(); return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI; };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { last: angleOf(e), acc: rot, moved: false };
    setDragging(true);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const a = angleOf(e);
    let d = a - drag.current.last;
    if (d > 180) d -= 360; if (d < -180) d += 360;
    drag.current.last = a; drag.current.acc += d; drag.current.moved = true;
    setRot(drag.current.acc);
    pick(Math.round(-drag.current.acc / step));
  };
  const up = () => {
    if (!dragging) return;
    setDragging(false);
    if (drag.current.moved) setRot(Math.round(drag.current.acc / step) * step);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key; let t = idx;
    if (k === 'ArrowRight' || k === 'ArrowDown') t = idx + 1;
    else if (k === 'ArrowLeft' || k === 'ArrowUp') t = idx - 1;
    else if (k === 'Home') t = 0; else if (k === 'End') t = n - 1; else return;
    e.preventDefault(); pick(t); btns.current[((t % n) + n) % n]?.focus();
  };
  const wheelAcc = useRef(0);
  const onWheel = (e: React.WheelEvent) => { wheelAcc.current += e.deltaY; if (Math.abs(wheelAcc.current) > 60) { pick(idx + Math.sign(wheelAcc.current)); wheelAcc.current = 0; } };
  const cur = options[idx];
  return (
    <div className={`ui-option-wheel-root ${className ?? ''}`} style={style}>
      <div ref={dial} className="ui-option-wheel-dial" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={onWheel}>
        <span className="ui-option-wheel-notch" aria-hidden="true" />
        <div role="radiogroup" aria-labelledby={id} className="ui-option-wheel-ring" onKeyDown={key}
          style={{ transform: `rotate(${rot}deg)`, transition: dragging || reduced ? 'none' : undefined }}>
          {options.map((o, i) => {
            const on = i === idx;
            return (
              <button key={o.value} ref={(el) => { btns.current[i] = el; }} type="button" role="radio" aria-checked={on} aria-label={o.label} tabIndex={on ? 0 : -1}
                className={on ? 'ui-option-wheel-dot is-on' : 'ui-option-wheel-dot'} style={{ ['--a' as string]: `${i * step}deg` }} onClick={() => pick(i)}><i /></button>
            );
          })}
        </div>
        <div className="ui-option-wheel-hub" aria-hidden="true"><small>{label}</small><strong>{cur?.label}</strong><em>{clampN(idx + 1, 1, n)} / {n}</em></div>
      </div>
      <span id={id} className="ui-option-wheel-sr">{label}</span>
    </div>
  );
}

export function Demo() {
  return <div className="ui-option-wheel-demo"><OptionWheel /></div>;
}
