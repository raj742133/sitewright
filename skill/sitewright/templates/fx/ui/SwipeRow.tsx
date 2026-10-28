'use client';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { clamp } from './_micro-c';
import { useReducedMotion } from './_t2';

export interface SwipeAction { id: string; label: string; tone?: 'neutral' | 'primary' | 'danger' }

export interface SwipeRowProps {
  /** Row title (also the accessible name of the row). */
  title: string;
  subtitle?: string;
  /** Leading content, e.g. an avatar. */
  leading?: ReactNode;
  /** Actions revealed by swiping left or pressing ArrowLeft. The LAST action is committed by a full swipe or the Delete key. */
  actions?: SwipeAction[];
  onAction?: (id: string) => void;
  className?: string;
}

const ACTION_W = 84;

/** A list row that slides left to reveal action buttons (touch or mouse drag); a long swipe commits the last action. Keyboard: ArrowLeft reveals, ArrowRight/Escape hides, Delete commits the last action, and the revealed buttons are tabbable. */
export default function SwipeRow({ title, subtitle, leading, actions = [{ id: 'archive', label: 'Archive', tone: 'primary' }, { id: 'delete', label: 'Delete', tone: 'danger' }], onAction, className = '' }: SwipeRowProps) {
  const reduced = useReducedMotion();
  const rowRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const total = actions.length * ACTION_W;
  const [x, setX] = useState(0);
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const [gone, setGone] = useState(false);
  const [msg, setMsg] = useState('');
  const st = useRef<{ id: number; sx: number; sy: number; base: number; lock: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const setOpenState = (o: boolean) => { setOpen(o); setX(o ? -total : 0); setMsg(o ? `${title}: actions shown` : ''); };
  const run = (id: string) => {
    onAction?.(id);
    setOpen(false); setX(0);
    setMsg(`${actions.find((a) => a.id === id)?.label ?? id}: ${title}`);
  };
  const commit = () => {
    const last = actions[actions.length - 1];
    if (!last) return;
    setGone(true);
    setX(-(rowRef.current?.offsetWidth ?? 320));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { run(last.id); setGone(false); }, reduced ? 0 : 220);
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    st.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, base: open ? -total : 0, lock: false };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    if (!s.lock) {
      if (Math.abs(dx) < 6) { if (Math.abs(dy) > 10) st.current = null; return; }
      if (Math.abs(dy) > Math.abs(dx)) { st.current = null; return; }
      s.lock = true; setDrag(true);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    }
    const w = rowRef.current?.offsetWidth ?? 320;
    const raw = s.base + dx;
    setX(clamp(raw > 0 ? raw * 0.2 : raw, -w, 24));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s || s.id !== e.pointerId) return;
    st.current = null;
    if (!s.lock) return;
    setDrag(false);
    const w = rowRef.current?.offsetWidth ?? 320;
    if (x < -Math.max(total + 40, w * 0.6)) commit();
    else setOpenState(x < -total * 0.45);
  };

  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'ArrowLeft') { setOpenState(true); e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'Escape') { setOpenState(false); e.preventDefault(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { commit(); e.preventDefault(); }
  };

  return (
    <div className={`ui-swipe-row ${className}`.trim()} data-open={open || undefined} data-drag={drag || undefined} data-gone={gone || undefined}>
      <div ref={rowRef} className="ui-swipe-row-face" role="group" tabIndex={0} aria-label={subtitle ? `${title}, ${subtitle}` : title}
        aria-describedby={hintId} aria-keyshortcuts="ArrowLeft ArrowRight Delete"
        style={{ transform: `translateX(${x.toFixed(1)}px)` }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
        {leading && <span className="ui-swipe-row-lead" aria-hidden="true">{leading}</span>}
        <span className="ui-swipe-row-text"><strong>{title}</strong>{subtitle && <span>{subtitle}</span>}</span>
        <span className="ui-swipe-row-grip" aria-hidden="true">‹</span>
      </div>
      <div className="ui-swipe-row-actions" style={{ width: Math.max(total, -x), ['--n' as string]: actions.length }}>
        {actions.map((a) => (
          <button key={a.id} type="button" className="ui-swipe-row-action" data-tone={a.tone ?? 'neutral'} tabIndex={open ? 0 : -1} onClick={() => run(a.id)}
            aria-label={`${a.label} ${title}`}>{a.label}</button>
        ))}
      </div>
      <span id={hintId} className="ui-swipe-row-sr">Swipe left or press the left arrow to show actions, the right arrow to hide them. Delete performs {actions[actions.length - 1]?.label ?? 'the last action'}.</span>
      <span className="ui-swipe-row-sr" role="status" aria-live="polite">{msg}</span>
    </div>
  );
}

const INITIAL = [
  { id: 'a', title: 'Design review notes', subtitle: 'Mara, 9:41', hue: 0 },
  { id: 'b', title: 'Invoice 2041 paid', subtitle: 'Billing, Tue', hue: 1 },
  { id: 'c', title: 'Welcome to the team', subtitle: 'People ops, Mon', hue: 2 },
];

export function Demo() {
  const [rows, setRows] = useState(INITIAL);
  const [log, setLog] = useState('Swipe a row left, or focus it and press the left arrow.');
  return (
    <div className="ui-swipe-row-stage">
      <div className="ui-swipe-row-list">
        {rows.map((r) => (
          <SwipeRow key={r.id} title={r.title} subtitle={r.subtitle}
            leading={<span className="ui-swipe-row-avatar" data-hue={r.hue}>{r.title[0]}</span>}
            onAction={(id) => { setRows((p) => p.filter((x) => x.id !== r.id)); setLog(`${id === 'delete' ? 'Deleted' : 'Archived'} "${r.title}"`); }} />
        ))}
        {rows.length === 0 && <button type="button" className="ui-swipe-row-reset" onClick={() => { setRows(INITIAL); setLog('Restored'); }}>Inbox zero. Restore rows</button>}
      </div>
      <p className="ui-swipe-row-log">{log}</p>
    </div>
  );
}
