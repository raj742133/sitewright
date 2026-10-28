'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { jitter } from './_micro-b';
import { useReducedMotion } from './_t2';

export interface ShredderProps {
  /** Number of strips (6 to 16). */
  strips?: number;
  /** Called when shredding finishes. */
  onShred?: () => void;
  /** Document content; defaults to a sample statement. */
  children?: ReactNode;
  /** Button text: [idle, working, finished]. */
  labels?: [string, string, string];
  className?: string;
  style?: CSSProperties;
}

const W = 132;

function Doc() {
  return (
    <div className="ui-shredder-doc">
      <strong>Statement 07</strong>
      <i style={{ width: '90%' }} /><i style={{ width: '72%' }} /><i style={{ width: '56%' }} />
      <b>$4,210.00</b>
    </div>
  );
}

/** A paper shredder: the document feeds down into the slot and drops out the bottom as loose strips. One button shreds, then restores. Instant under reduced motion. */
export default function Shredder({ strips = 10, onShred, children, labels = ['Shred document', 'Shredding...', 'Start over'], className = '', style }: ShredderProps) {
  const [state, setState] = useState<'idle' | 'run' | 'done'>('idle');
  const reduced = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cb = useRef(onShred);
  useEffect(() => { cb.current = onShred; });
  useEffect(() => () => clearTimeout(timer.current), []);
  const n = Math.max(6, Math.min(16, Math.round(strips)));
  const sw = W / n;

  const press = () => {
    if (state === 'run') return;
    clearTimeout(timer.current);
    if (state === 'done') { setState('idle'); return; }
    if (reduced) { setState('done'); cb.current?.(); return; }
    setState('run');
    timer.current = setTimeout(() => { setState('done'); cb.current?.(); }, 2100);
  };
  const doc = children ?? <Doc />;
  return (
    <div className={`ui-shredder ${className}`.trim()} style={style} data-state={state}>
      <div className="ui-shredder-scene" style={{ ['--w' as string]: `${W}px` }}>
        <div className="ui-shredder-feed"><div className="ui-shredder-paper" aria-hidden={state !== 'idle' || undefined}>{doc}</div></div>
        <div className="ui-shredder-head" aria-hidden="true"><span className="ui-shredder-slot" /><span className="ui-shredder-led" /></div>
        <div className="ui-shredder-out" aria-hidden="true">
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className="ui-shredder-strip" style={{ width: sw + 0.5, left: i * sw, ['--dl' as string]: `${i * 45}ms`, ['--dy' as string]: `${(6 + (i % 3) * 7 + jitter(i) * 5).toFixed(1)}px`, ['--r' as string]: `${(jitter(i + 9) * 7).toFixed(1)}deg`, ['--dx' as string]: `${(jitter(i + 3) * 4).toFixed(1)}px` }}>
              <span className="ui-shredder-copy" style={{ left: -i * sw }}>{doc}</span>
            </span>
          ))}
        </div>
      </div>
      <button type="button" className="ui-shredder-btn" onClick={press} disabled={state === 'run'}>{labels[state === 'idle' ? 0 : state === 'run' ? 1 : 2]}</button>
      <span className="ui-shredder-sr" role="status">{state === 'done' ? 'Document shredded' : ''}</span>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-shredder-stage">
      <Shredder />
    </div>
  );
}
