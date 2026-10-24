'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useReducedMotion } from './_m1';

export type ToastKind = 'success' | 'error' | 'info' | 'loading';
export interface ToastOptions {
  title: string;
  description?: string;
  kind?: ToastKind;
  /** ms before it closes by itself; 0 keeps it until dismissed (default 4000, loading toasts stay) */
  duration?: number;
  action?: { label: string; onClick: () => void };
}
interface Item extends ToastOptions { id: number; kind: ToastKind; leaving?: boolean }

// A tiny module-level store, so `toast(...)` works from any component or handler with no provider.
let items: Item[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => { items = [...items]; subs.forEach((f) => f()); };

function show(o: ToastOptions): number {
  const id = ++seq;
  items = [...items.slice(-4), { ...o, id, kind: o.kind ?? 'info' }];
  emit();
  return id;
}
function dismiss(id?: number) {
  items = items.map((t) => (id === undefined || t.id === id ? { ...t, leaving: true } : t));
  emit();
  setTimeout(() => { items = items.filter((t) => !t.leaving); emit(); }, 320);
}
function update(id: number, o: Partial<ToastOptions>) { items = items.map((t) => (t.id === id ? { ...t, ...o, kind: o.kind ?? t.kind } : t)); emit(); }

/** `toast('Saved')`, `toast.success('Saved', 'Your changes are live')`, `toast.error(...)`, `toast.loading(...)` (returns an id for `toast.update` / `toast.dismiss`). */
export const toast = Object.assign(
  (title: string, description?: string) => show({ title, description }),
  {
    success: (title: string, description?: string) => show({ title, description, kind: 'success' }),
    error: (title: string, description?: string) => show({ title, description, kind: 'error', duration: 6000 }),
    info: (title: string, description?: string) => show({ title, description, kind: 'info' }),
    loading: (title: string, description?: string) => show({ title, description, kind: 'loading', duration: 0 }),
    custom: show, update, dismiss,
  },
);

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const snapshot = () => items;
const server = (): Item[] => [];

function Icon({ kind }: { kind: ToastKind }) {
  const p = { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  // each glyph draws itself in (stroke-dash), which is what makes the icon feel like it morphs to the state
  if (kind === 'success') return <svg {...p}><path className="ui-toast-draw" pathLength={1} d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
  if (kind === 'error') return <svg {...p}><path className="ui-toast-draw" pathLength={1} d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>;
  if (kind === 'loading') return <svg {...p} className="ui-toast-spin"><path d="M12 3a9 9 0 1 0 9 9" /></svg>;
  return <svg {...p}><path className="ui-toast-draw" pathLength={1} d="M12 11v6" /><circle cx="12" cy="7.2" r=".6" fill="currentColor" /></svg>;
}

function Row({ t, still }: { t: Item; still: boolean }) {
  const [paused, setPaused] = useState(false);
  const left = useRef(t.duration ?? (t.kind === 'loading' ? 0 : 4000));
  const started = useRef(0);
  useEffect(() => {
    const total = t.duration ?? (t.kind === 'loading' ? 0 : t.kind === 'error' ? 6000 : 4000);
    left.current = total;
  }, [t.duration, t.kind, t.id]);
  useEffect(() => {
    if (paused || t.leaving || !left.current) return;
    started.current = Date.now();
    const h = setTimeout(() => dismiss(t.id), left.current);
    return () => { clearTimeout(h); left.current = Math.max(0, left.current - (Date.now() - started.current)); };
  }, [paused, t.leaving, t.id, t.kind, t.duration]);

  return (
    <li className="ui-toast-slot" data-leaving={t.leaving || undefined} data-still={still || undefined}>
      <div className="ui-toast-clip">
        <div className="ui-toast" data-kind={t.kind} role={t.kind === 'error' ? 'alert' : 'status'}
          onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
          <span className="ui-toast-ic" key={t.kind}><Icon kind={t.kind} /></span>
          <span className="ui-toast-body">
            <span className="ui-toast-title">{t.title}</span>
            {t.description ? <span className="ui-toast-desc">{t.description}</span> : null}
          </span>
          {t.action ? <button type="button" className="ui-toast-action" onClick={() => { t.action?.onClick(); dismiss(t.id); }}>{t.action.label}</button> : null}
          <button type="button" className="ui-toast-x" aria-label={`Dismiss: ${t.title}`} onClick={() => dismiss(t.id)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>
    </li>
  );
}

export interface ToasterProps {
  position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
  /** keep the stack inside its nearest positioned parent instead of the window (used by the gallery demo) */
  inline?: boolean;
  /** how many are shown at once (default 4); older ones are hidden while newer ones are on screen */
  max?: number;
  className?: string;
}

/** Mount once (for example in the layout). Anything that calls `toast(...)` shows up here. */
export default function Toaster({ position = 'bottom-center', inline = false, max = 4, className = '' }: ToasterProps) {
  const list = useSyncExternalStore(subscribe, snapshot, server);
  const still = useReducedMotion();
  return (
    <section className={`ui-toaster ${className}`.trim()} data-pos={position} data-inline={inline || undefined} aria-label="Notifications" aria-live="polite">
      <ul className="ui-toast-list">
        {list.slice(-Math.max(1, max)).map((t) => <Row key={t.id} t={t} still={still} />)}
      </ul>
    </section>
  );
}

export function Demo() {
  const n = useRef(0);
  return (
    <div className="ui-toast-demo">
      <div className="ui-toast-demo-btns">
        <button type="button" onClick={() => toast.success('Saved', `Change ${++n.current} is live`)}>Success</button>
        <button type="button" onClick={() => toast.error('Upload failed', 'The file is over 50 MB')}>Error</button>
        <button type="button" onClick={() => { const id = toast.loading('Publishing…'); setTimeout(() => { toast.update(id, { title: 'Published', description: 'v1.4.0 is on the home page', kind: 'success', duration: 3500 }); setTimeout(() => toast.dismiss(id), 3500); }, 1400); }}>Loading</button>
      </div>
      <Toaster inline max={1} position="bottom-center" />
    </div>
  );
}
