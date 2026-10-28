'use client';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { clamp } from './_micro-c';
import { useReducedMotion } from './_t2';

export interface SwipeToastProps {
  title?: string;
  message?: string;
  variant?: 'info' | 'success' | 'error';
  /** Controlled visibility. */
  open?: boolean;
  /** Initial visibility when uncontrolled. */
  defaultOpen?: boolean;
  /** Called after the toast has been dismissed (swipe, keys, close button or timeout). */
  onClose?: () => void;
  /** Auto-dismiss after this many ms; 0 disables it. The timer pauses while hovered or focused. */
  duration?: number;
  /** Optional inline action button. */
  action?: { label: string; onAction: () => void };
  className?: string;
}

const THRESHOLD = 90;

/** A toast notification you can flick away sideways. Keyboard: Escape, or ArrowLeft/ArrowRight on the focused toast, dismisses it, and the close button is always there. Errors use role=alert, the rest role=status. */
export default function SwipeToast({ title = 'Changes saved', message = 'Your draft was synced to every device.', variant = 'success', open, defaultOpen = true, onClose, duration = 6000, action, className = '' }: SwipeToastProps) {
  const reduced = useReducedMotion();
  const [inner, setInner] = useState(defaultOpen);
  const shown = open ?? inner;
  const [x, setX] = useState(0);
  const [drag, setDrag] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const st = useRef<{ id: number; sx: number; lock: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const finish = () => { setLeaving(false); setX(0); if (open === undefined) setInner(false); onClose?.(); };
  const dismiss = (dir: -1 | 1) => {
    if (leaving) return;
    clearTimeout(timer.current);
    if (reduced) { finish(); return; }
    setLeaving(true);
    setX(dir * ((root.current?.offsetWidth ?? 320) + 40));
    timer.current = setTimeout(finish, 260);
  };
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  useEffect(() => {
    if (!shown || !duration || paused) return;
    const t = setTimeout(() => dismissRef.current(1), duration);
    return () => clearTimeout(t);
  }, [shown, duration, paused]);

  if (!shown) return null;

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    st.current = { id: e.pointerId, sx: e.clientX, lock: false };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.sx;
    if (!s.lock) {
      if (Math.abs(dx) < 5) return;
      s.lock = true; setDrag(true);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    }
    setX(dx);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s || s.id !== e.pointerId) return;
    st.current = null;
    if (!s.lock) return;
    setDrag(false);
    if (Math.abs(x) > THRESHOLD) dismiss(x < 0 ? -1 : 1);
    else setX(0);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { dismiss(1); e.preventDefault(); e.stopPropagation(); }
    else if (e.target === e.currentTarget && e.key === 'ArrowLeft') { dismiss(-1); e.preventDefault(); }
    else if (e.target === e.currentTarget && e.key === 'ArrowRight') { dismiss(1); e.preventDefault(); }
  };

  const fade = clamp(1 - Math.abs(x) / 320, 0.25, 1);
  return (
    <div ref={root} className={`ui-swipe-toast ${className}`.trim()} data-variant={variant} data-drag={drag || undefined}
      role={variant === 'error' ? 'alert' : 'status'} tabIndex={0} aria-keyshortcuts="Escape ArrowLeft ArrowRight"
      aria-label={`${title}. ${message} Swipe or press Escape to dismiss.`}
      style={{ transform: `translateX(${x.toFixed(1)}px)`, opacity: leaving ? 0 : fade }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}
      onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <span className="ui-swipe-toast-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          {variant === 'success' && <path d="M5 12.5 10 17.5 19 7.5" />}
          {variant === 'error' && <path d="M12 6v7M12 17.5v.01" />}
          {variant === 'info' && <path d="M12 11v6M12 7.5v.01" />}
        </svg>
      </span>
      <span className="ui-swipe-toast-body"><strong>{title}</strong><span>{message}</span></span>
      {action && <button type="button" className="ui-swipe-toast-action" onClick={() => { action.onAction(); dismiss(1); }}>{action.label}</button>}
      <button type="button" className="ui-swipe-toast-close" aria-label="Dismiss notification" onClick={() => dismiss(1)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      {duration > 0 && <span className="ui-swipe-toast-bar" aria-hidden="true" data-paused={paused || undefined} style={{ animationDuration: `${duration}ms` }} />}
    </div>
  );
}

export function Demo() {
  const [open, setOpen] = useState(true);
  return (
    <div className="ui-swipe-toast-stage">
      <div className="ui-swipe-toast-slot">
        <SwipeToast open={open} onClose={() => setOpen(false)} duration={0} action={{ label: 'Undo', onAction: () => undefined }} />
      </div>
      {!open && <button type="button" className="ui-swipe-toast-again" onClick={() => setOpen(true)}>Show toast again</button>}
      <p className="ui-swipe-toast-hint" aria-hidden="true">{open ? 'Flick it sideways' : 'Dismissed'}</p>
    </div>
  );
}
