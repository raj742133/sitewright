'use client';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { useLive } from './_micro-b';

export interface SlideCommitProps {
  /** Prompt shown on the track (also the handle's accessible name). */
  label?: string;
  /** Text shown once committed. */
  doneLabel?: string;
  /** Called once when the handle reaches the end (or Enter / Space is pressed on it). */
  onCommit?: () => void;
  /** Milliseconds after which the control resets itself; null keeps it committed until the handle is pressed again. */
  resetAfter?: number | null;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** A slide-to-confirm control: drag the handle across the track to commit; let go early and it springs back. Keyboard: focus the handle and press Enter or Space. */
export default function SlideCommit({ label = 'Slide to send payment', doneLabel = 'Payment sent', onCommit, resetAfter = 2600, disabled, className = '', style }: SlideCommitProps) {
  const track = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const live = useLive(track);
  const [done, setDone] = useState(false);
  const [drag, setDrag] = useState(false);
  const [nudge, setNudge] = useState(0);
  const g = useRef({ x: 0, max: 1, p: 0, pid: -1, moved: false });
  const at = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cb = useRef(onCommit);
  useEffect(() => { cb.current = onCommit; });
  useEffect(() => () => clearTimeout(timer.current), []);

  const setP = (p: number) => { g.current.p = p; track.current?.style.setProperty('--p', p.toFixed(4)); };
  const finish = () => {
    setP(1); setDone(true); at.current = Date.now(); cb.current?.();
    clearTimeout(timer.current);
    if (resetAfter !== null) timer.current = setTimeout(reset, resetAfter);
  };
  const reset = () => { clearTimeout(timer.current); setDone(false); setP(0); };

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled || done || e.button !== 0) return;
    const tr = track.current;
    if (!tr) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    g.current = { x: e.clientX, max: Math.max(1, tr.clientWidth - 8 - e.currentTarget.offsetWidth), p: g.current.p, pid: e.pointerId, moved: false };
    setDrag(true);
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag || e.pointerId !== g.current.pid) return;
    const dx = e.clientX - g.current.x;
    if (Math.abs(dx) > 3) g.current.moved = true;
    setP(Math.min(1, Math.max(0, dx / g.current.max)));
  };
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== g.current.pid) return;
    g.current.pid = -1;
    setDrag(false);
    if (g.current.p >= 0.92) finish();
    else { setP(0); if (!g.current.moved) setNudge((n) => n + 1); }
  };
  const click = (e: { detail: number }) => {
    if (disabled) return;
    if (done) { if (Date.now() - at.current > 500) reset(); return; }
    if (e.detail === 0) finish(); // keyboard activation
  };

  return (
    <div ref={track} className={`ui-slide-commit ${className}`.trim()} style={style} data-done={done || undefined} data-drag={drag || undefined} data-disabled={disabled || undefined} data-live={live || undefined}>
      <span className="ui-slide-commit-fill" aria-hidden="true" />
      <span className="ui-slide-commit-label" aria-hidden="true" data-show={!done || undefined}>{label}</span>
      <span className="ui-slide-commit-label ui-slide-commit-done" aria-hidden="true" data-show={done || undefined}>{doneLabel}</span>
      <button ref={handle} key={nudge} type="button" className="ui-slide-commit-handle" data-nudge={nudge > 0 || undefined} disabled={disabled}
        aria-label={done ? `${doneLabel}. Press to undo` : `${label}. Press Enter to confirm`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={click}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          {done ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <><path d="M5 12h13" /><path d="M13 6l6 6-6 6" /></>}
        </svg>
      </button>
      <span className="ui-slide-commit-sr" role="status">{done ? doneLabel : ''}</span>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-slide-commit-stage">
      <SlideCommit />
    </div>
  );
}
