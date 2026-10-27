'use client';
// Types, time helpers, a few extra icons and a keyboard-operable popover menu for the support inbox.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Glyph, cx } from './_dash';

export type Status = 'open' | 'pending' | 'resolved';
export type Priority = 'urgent' | 'high' | 'normal' | 'low';
export type Channel = 'email' | 'chat' | 'web';
export interface Msg { id: string; who: string; kind: 'customer' | 'agent' | 'note' | 'event'; ago: number; text: string; delivery?: 'sending' | 'delivered' | 'seen' }
export interface Customer { name: string; email: string; company: string; plan: 'Trial' | 'Starter' | 'Team' | 'Business' | 'Enterprise'; mrr: number; location: string; tz: number; since: string; tags: string[]; prev: Array<{ s: string; d: string; st: 'Resolved' | 'Open' }>; csat: number | null; ratings: number }
export interface Conv { id: string; num: number; subject: string; channel: Channel; priority: Priority; status: Status; assignee: string | null; unread: boolean; slaLeft: number | null; snooze?: string; msgs: Msg[]; cust: Customer }

export const ME = 'Dana Ortiz';
export const TEAM = ['Dana Ortiz', 'Marcus Lee', 'Priya Nair'];
export const NOW = Date.UTC(2026, 9, 24, 10, 42);
const MIN = 60000;

/* ---------------------------------------------------------------- time */
export const fmtDur = (m: number) => { const a = Math.abs(Math.round(m)); const s = a < 60 ? `${a}m` : a % 60 ? `${Math.floor(a / 60)}h ${String(a % 60).padStart(2, '0')}m` : `${a / 60}h`; return m < 0 ? `−${s}` : s; };
export const clock = (ago: number) => new Date(NOW - ago * MIN).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
export const localTime = (tz: number) => new Date(NOW + tz * 60 * MIN).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
const dayStart = (t: number) => Math.floor(t / 86400000);
export const dayLabel = (ago: number) => {
  const t = NOW - ago * MIN, diff = dayStart(NOW) - dayStart(t);
  return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : new Date(t).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
};
export const shortAgo = (ago: number) => ago < 1 ? 'now' : ago < 60 ? `${Math.round(ago)}m` : ago < 600 ? `${Math.floor(ago / 60)}h` : dayLabel(ago) === 'Today' ? clock(ago) : dayLabel(ago) === 'Yesterday' ? 'Yest' : new Date(NOW - ago * MIN).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
export const lastAgo = (c: Conv) => Math.min(...c.msgs.filter((m) => m.kind !== 'event').map((m) => m.ago));
/** First response time: first customer message to the first team reply, null while nobody has answered. */
export const frtOf = (c: Conv) => { const first = c.msgs.find((m) => m.kind === 'customer'); const reply = c.msgs.find((m) => m.kind === 'agent'); return first && reply ? first.ago - reply.ago : null; };
export const money = (n: number) => `$${n.toLocaleString('en-US')}`;

/* ---------------------------------------------------------------- icons */
const X: Record<string, string> = {
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  chat: 'M5 5h14a1 1 0 011 1v9a1 1 0 01-1 1h-7l-4 3.5V16H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  flag: 'M6 21V4M6 5h11l-2 4 2 4H6',
  back: 'M15 6l-6 6 6 6',
  bolt: 'M13 3L5 13h6l-1 8 8-10h-6z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0',
  panel: 'M4 5h16v14H4zM15 5v14',
  moon: 'M20 14A8 8 0 019.5 4 8 8 0 1020 14z',
  tick: 'M3 12.5l4 4L15 8M11 15l1.5 1.5L21 8',
  arrowup: 'M12 19V5M6 11l6-6 6 6',
};
export function Ico({ name, size = 15, className }: { name: string; size?: number; className?: string }) {
  return X[name] ? <svg className={cx('td-icon', className)} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={X[name]} /></svg> : <Glyph name={name} size={size} className={className} />;
}
export const channelName: Record<Channel, string> = { email: 'Email', chat: 'Live chat', web: 'Web form' };
export const channelIcon: Record<Channel, string> = { email: 'mail', chat: 'chat', web: 'globe' };

/* ---------------------------------------------------------------- popover menu */
export interface MenuItem { id: string; label: string; hint?: string; checked?: boolean; disabled?: boolean }
export function Menu({ label, icon, text, items, onPick, align = 'left', up = false, small = true, variant = 'default' }: { label: string; icon?: string; text?: ReactNode; items: MenuItem[]; onPick: (id: string) => void; align?: 'left' | 'right'; up?: boolean; small?: boolean; variant?: 'default' | 'ghost' }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    (wrap.current?.querySelector('[role="menuitem"]:not(:disabled)') as HTMLElement | null)?.focus();
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current?.focus(); return; }
    if (e.key === 'Tab') { setOpen(false); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const els = Array.from(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    els[e.key === 'Home' ? 0 : e.key === 'End' ? els.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus();
  };
  return (
    <div className="ti-menu" ref={wrap} onKeyDown={key}>
      <button ref={btn} type="button" className={cx('td-btn', `is-${variant}`, small && 'is-sm')} aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>
        {icon && <Ico name={icon} size={small ? 13 : 15} />}{text}
      </button>
      {open && (
        <div className={cx('ti-pop', align === 'right' && 'is-right', up && 'is-up')} role="menu" aria-label={label}>
          {items.map((it) => (
            <button key={it.id} type="button" role="menuitem" disabled={it.disabled} className="ti-mi" onClick={() => { setOpen(false); onPick(it.id); btn.current?.focus(); }}>
              <span className="ti-mi-c">{it.checked && <Ico name="check" size={13} />}</span>
              <span className="ti-mi-t"><b>{it.label}</b>{it.hint && <small>{it.hint}</small>}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
