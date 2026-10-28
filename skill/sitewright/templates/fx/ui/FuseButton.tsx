'use client';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { cx } from './_micro-a';
import { useReducedMotion } from './_t2';

export interface FuseButtonProps {
  label?: string;
  /** Label while the fuse is burning. */
  holdLabel?: string;
  doneLabel?: string;
  /** How long the fuse takes to burn (ms). */
  holdMs?: number;
  /** Fires once when the fuse burns out (or on the second press in confirm mode). */
  onFuse?: () => void;
  /** How long the done state shows before resetting. 0 keeps it. */
  resetAfter?: number;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}
type Phase = 'idle' | 'burning' | 'armed' | 'done';

/** A press-and-hold confirm button with a burning fuse. Hold the pointer, Enter or Space until the spark reaches the end; let go early and it snuffs out. Where holding is not practical (reduced motion, assistive-tech clicks) it falls back to press twice to confirm. */
export default function FuseButton({ label = 'Hold to launch', holdLabel = 'Keep holding…', doneLabel = 'Launched', holdMs = 1200, onFuse, resetAfter = 2000, disabled, className, style }: FuseButtonProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const btn = useRef<HTMLButtonElement>(null);
  const raf = useRef(0);
  const t0 = useRef(0);
  const p = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const phaseRef = useRef<Phase>('idle');
  const fuseCb = useRef(onFuse);
  useEffect(() => { fuseCb.current = onFuse; });
  const set = (x: Phase) => { phaseRef.current = x; setPhase(x); };
  const paint = (v: number) => { p.current = v; btn.current?.style.setProperty('--p', v.toFixed(4)); };
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => { cancelAnimationFrame(raf.current); timers.current.forEach(clearTimeout); }, []);

  const finish = () => {
    cancelAnimationFrame(raf.current);
    paint(1); set('done'); fuseCb.current?.();
    if (resetAfter > 0) later(() => { paint(0); set('idle'); }, resetAfter);
  };
  const burn = (now: number) => {
    const v = Math.min(1, (now - t0.current) / holdMs);
    paint(v);
    if (v >= 1) finish(); else raf.current = requestAnimationFrame(burn);
  };
  const start = () => {
    if (disabled || phaseRef.current === 'done' || phaseRef.current === 'burning') return;
    timers.current.forEach(clearTimeout); timers.current = [];
    set('burning'); t0.current = performance.now() - p.current * holdMs * 0;
    raf.current = requestAnimationFrame(burn);
  };
  const snuff = () => {
    if (phaseRef.current !== 'burning') return;
    cancelAnimationFrame(raf.current);
    set('idle');
    const from = p.current, s = performance.now();
    const back = (now: number) => { const k = Math.min(1, (now - s) / 260); paint(from * (1 - k)); if (k < 1 && phaseRef.current === 'idle') raf.current = requestAnimationFrame(back); };
    raf.current = requestAnimationFrame(back);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (reduced || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    if (!e.repeat) start();
  };
  const onKeyUp = (e: KeyboardEvent) => { if (!reduced && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); snuff(); } };
  const onClick = (e: MouseEvent) => {
    // Real pointer clicks were already handled by the hold; confirm-twice covers reduced motion and assistive clicks (detail 0).
    if (disabled || !(reduced || e.detail === 0)) return;
    if (phaseRef.current === 'armed') { timers.current.forEach(clearTimeout); finish(); }
    else if (phaseRef.current === 'idle') {
      set('armed'); paint(0.5);
      later(() => { if (phaseRef.current === 'armed') { paint(0); set('idle'); } }, 3500);
    }
  };
  const shown = phase === 'done' ? doneLabel : phase === 'burning' ? holdLabel : phase === 'armed' ? 'Press again to confirm' : label;

  return (
    <span className={cx('ui-fuse-button-wrap', className)} style={style}>
      <button ref={btn} type="button" className="ui-fuse-button" data-phase={phase} aria-disabled={disabled || undefined} aria-describedby="ui-fuse-button-help"
        onPointerDown={(e) => { if (reduced || e.button !== 0 || e.pointerType === 'mouse' && e.detail === 0) return; e.currentTarget.setPointerCapture(e.pointerId); start(); }}
        onPointerUp={snuff} onPointerCancel={snuff} onLostPointerCapture={snuff} onBlur={snuff} onContextMenu={(e) => e.preventDefault()}
        onKeyDown={onKeyDown} onKeyUp={onKeyUp} onClick={onClick}>
        <span className="ui-fuse-button-row">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            {phase === 'done' ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 2 2 2 0-3-1-5 1-8z" />}
          </svg>
          <span className="ui-fuse-button-label" aria-hidden="true">
            <span data-on={shown === label || undefined}>{label}</span>
            <span data-on={phase === 'burning' || undefined}>{holdLabel}</span>
            <span data-on={phase === 'armed' || undefined}>Press again to confirm</span>
            <span data-on={phase === 'done' || undefined}>{doneLabel}</span>
          </span>
        </span>
        <span className="ui-fuse-button-fuse" aria-hidden="true">
          <span className="ui-fuse-button-rope" />
          <span className="ui-fuse-button-burnt" />
          <span className="ui-fuse-button-spark" />
        </span>
        <span className="ui-fuse-button-sr">{label}</span>
      </button>
      <span id="ui-fuse-button-help" className="ui-fuse-button-sr">{reduced ? 'Press twice to confirm.' : 'Press and hold until the fuse burns out, or press twice with a screen reader.'}</span>
      <span className="ui-fuse-button-sr" role="status" aria-live="polite">{phase === 'done' ? doneLabel : phase === 'armed' ? 'Press again to confirm' : ''}</span>
    </span>
  );
}

export function Demo() {
  const [n, setN] = useState(0);
  return (
    <div className="ui-fuse-button-demo">
      <FuseButton onFuse={() => setN((v) => v + 1)} />
      <p className="ui-fuse-button-note">{n ? `Launched ${n} time${n > 1 ? 's' : ''}` : 'Press and hold'}</p>
    </div>
  );
}
