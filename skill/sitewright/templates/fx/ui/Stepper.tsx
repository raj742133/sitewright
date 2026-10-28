'use client';
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon, Stage, useControlled, useReducedMotion } from './_menus-kit';

export interface StepperStep {
  id: string;
  title: string;
  /** Small text under the title in the indicator row. */
  hint?: string;
  content: ReactNode;
  /** Return false (or a message) to block moving forward from this step. */
  validate?: () => boolean | string;
}
export interface StepperProps {
  steps?: StepperStep[];
  /** Controlled index of the current step. */
  step?: number;
  defaultStep?: number;
  onStepChange?: (index: number) => void;
  /** Called when Next is pressed on the last step. */
  onComplete?: () => void;
  /** true: indicators of steps beyond the furthest reached one cannot be clicked. */
  linear?: boolean;
  backLabel?: string;
  nextLabel?: string;
  finishLabel?: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** A multi-step flow: numbered indicators joined by a progress line, an animated content panel, and Back / Next buttons.
 *  The indicator list is an ordered list with aria-current="step"; reached steps are buttons you can jump back to. Focus moves to the new step's heading on change,
 *  `validate` can block Next with a message, and the last step turns Next into a finish button that fires onComplete. */
export default function Stepper({ steps = [], step, defaultStep = 0, onStepChange, onComplete, linear = true, backLabel = 'Back', nextLabel = 'Next', finishLabel = 'Finish', label = 'Progress', className = '', style }: StepperProps) {
  const n = steps.length;
  const [cur, setCur] = useControlled<number>(step, defaultStep, onStepChange);
  const i = Math.max(0, Math.min(n - 1, cur));
  const [reached, setReached] = useState(i);
  const [dir, setDir] = useState(1);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const reduced = useReducedMotion();
  const uid = useId();
  const head = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const max = Math.max(reached, i);
  useEffect(() => { if (moved.current) head.current?.focus({ preventScroll: true }); }, [i, done]);
  if (!n) return null;

  const go = (to: number) => {
    if (to === i || to < 0 || to >= n) return;
    moved.current = true; setErr(''); setDone(false); setDir(to > i ? 1 : -1);
    setReached((r) => Math.max(r, to));
    setCur(to);
  };
  const next = () => {
    const v = steps[i]?.validate?.();
    if (v === false || typeof v === 'string') { setErr(typeof v === 'string' ? v : 'Complete this step to continue.'); return; }
    if (i === n - 1) { moved.current = true; setDone(true); onComplete?.(); return; }
    go(i + 1);
  };
  const s = steps[i] as StepperStep;
  const pct = n > 1 ? (Math.min(max, n - 1) / (n - 1)) * 100 : 100;
  return (
    <section className={`ui-stepper-root${reduced ? ' is-still' : ''} ${className}`} style={style} aria-label={label}>
      <ol className="ui-stepper-rail" style={{ ['--n' as string]: n, ['--pct' as string]: pct.toFixed(1), ['--cur' as string]: ((i + 0.5) / n) * 100 + '%' }}>
        {steps.map((st, k) => {
          const complete = done || k < i || (k <= max && k !== i && k < max);
          const clickable = k !== i && (!linear || k <= max);
          const dot = (
            <>
              <span className="ui-stepper-dot" aria-hidden="true">{complete || (done && k === i) ? <Icon name="check" size={16} /> : k + 1}</span>
              <span className="ui-stepper-cap"><strong>{st.title}</strong>{st.hint ? <small>{st.hint}</small> : null}</span>
            </>
          );
          return (
            <li key={st.id} className={`ui-stepper-li${k === i && !done ? ' is-current' : ''}${complete ? ' is-done' : ''}`} aria-current={k === i && !done ? 'step' : undefined}>
              {clickable ? <button type="button" className="ui-stepper-ind" onClick={() => go(k)} aria-label={`Go to step ${k + 1}: ${st.title}`}>{dot}</button> : <div className="ui-stepper-ind is-static">{dot}</div>}
            </li>
          );
        })}
      </ol>
      <div className="ui-stepper-stage">
        <div key={done ? 'done' : s.id} className={`ui-stepper-panel ${dir > 0 ? 'fwd' : 'back'}`} id={`${uid}-p`}>
          {done ? (
            <>
              <h3 className="ui-stepper-title" ref={head} tabIndex={-1}>All done</h3>
              <p className="ui-stepper-note" role="status">Every step is complete.</p>
            </>
          ) : (
            <>
              <h3 className="ui-stepper-title" ref={head} tabIndex={-1}>{s.title}</h3>
              <div className="ui-stepper-body">{s.content}</div>
            </>
          )}
        </div>
      </div>
      <p className="ui-stepper-err" role="alert">{err}</p>
      <div className="ui-stepper-actions">
        {done
          ? <button type="button" className="ui-stepper-btn ghost" onClick={() => { setDone(false); moved.current = false; setReached(0); setCur(0); }}>Start over</button>
          : <>
            <button type="button" className="ui-stepper-btn ghost" onClick={() => go(i - 1)} disabled={i === 0}>{backLabel}</button>
            <span className="ui-stepper-count" aria-hidden="true">{i + 1} / {n}</span>
            <button type="button" className="ui-stepper-btn" onClick={next}>{i === n - 1 ? finishLabel : nextLabel}</button>
          </>}
      </div>
    </section>
  );
}

function Demo1() {
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('team');
  const [tone, setTone] = useState(true);
  const steps: StepperStep[] = [
    { id: 'who', title: 'Details', hint: 'Who is this for', validate: () => (name.trim() ? true : 'Add a project name first.'), content: (
      <label className="ui-stepper-field"><span>Project name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Autumn launch" autoComplete="off" /></label>) },
    { id: 'plan', title: 'Plan', hint: 'Pick a size', content: (
      <div className="ui-stepper-choices" role="radiogroup" aria-label="Plan">
        {[['solo', 'Solo'], ['team', 'Team'], ['org', 'Studio']].map(([v, t]) => (
          <button key={v} type="button" role="radio" aria-checked={plan === v} className={`ui-stepper-choice${plan === v ? ' on' : ''}`} onClick={() => setPlan(v as string)}>{t}</button>))}
      </div>) },
    { id: 'go', title: 'Review', hint: 'Check and finish', content: (
      <div className="ui-stepper-review">
        <p><b>{name || 'Untitled'}</b> on the <b>{plan}</b> plan.</p>
        <label className="ui-stepper-check"><input type="checkbox" checked={tone} onChange={(e) => setTone(e.target.checked)} /> Send me a summary</label>
      </div>) },
  ];
  return <Stepper steps={steps} />;
}
export function Demo() {
  return <Stage align="center"><div className="ui-stepper-demo"><Demo1 /></div></Stage>;
}
