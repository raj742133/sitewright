'use client';
import { useState } from 'react';

export interface SquishyLabelsProps {
  labels?: string[];
  /** Labels selected at the start. */
  defaultSelected?: string[];
  onChange?: (selected: string[]) => void;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULTS = ['Espresso', 'Filter', 'Cold brew', 'Oat milk', 'Decaf', 'Pastries'];

/** A row of pill toggles that squash and stretch like soft bodies when hovered or focused, pushing their neighbours aside. Press to select. */
export default function SquishyLabels({ labels = DEFAULTS, defaultSelected = ['Filter'], onChange, className, style }: SquishyLabelsProps) {
  const [on, setOn] = useState<string[]>(defaultSelected);
  const [near, setNear] = useState(-1);
  const [pop, setPop] = useState(-1);

  const toggle = (l: string, i: number) => {
    const next = on.includes(l) ? on.filter((x) => x !== l) : [...on, l];
    setOn(next);
    setPop(i);
    onChange?.(next);
  };

  return (
    <ul className={`ui-squishy-labels${className ? ' ' + className : ''}`} style={style} aria-label="Labels" onPointerLeave={() => setNear(-1)}>
      {labels.map((l, i) => {
        const d = near < 0 ? 0 : i - near;
        const k = near < 0 ? 0 : Math.abs(d);
        const push = near < 0 || k === 0 ? 0 : Math.sign(d) * 16 / k;
        const sx = near < 0 ? 1 : k === 0 ? 1.18 : k === 1 ? 0.94 : 1;
        const sy = near < 0 ? 1 : k === 0 ? 0.88 : k === 1 ? 1.05 : 1;
        return (
          <li key={l}>
            <button
              type="button"
              className={`ui-squishy-labels-pill${pop === i ? ' is-pop' : ''}`}
              aria-pressed={on.includes(l)}
              style={{ transform: `translateX(${push.toFixed(1)}px) scale(${sx}, ${sy})` }}
              onPointerEnter={(e) => { if (e.pointerType !== 'touch') setNear(i); }}
              onFocus={() => setNear(i)}
              onBlur={() => setNear(-1)}
              onClick={() => toggle(l, i)}
              onAnimationEnd={() => setPop(-1)}
            >
              {l}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Demo() {
  return <SquishyLabels labels={['Espresso', 'Filter', 'Cold brew', 'Oat milk', 'Decaf']} />;
}
