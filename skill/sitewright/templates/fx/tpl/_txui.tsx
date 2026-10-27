'use client';
// Small shared bits for the assistant workspace: icons the kit lacks, a toast with an action, a word-by-word typing hook, clipboard.
import { useEffect, useMemo, useState } from 'react';
import { cx } from './_dash';

const P: Record<string, string> = {
  thumbup: 'M7 11v9H4a1 1 0 01-1-1v-7a1 1 0 011-1zM7 11l4-8a2 2 0 012 2v4h5.5a2 2 0 012 2.3l-1 6A2 2 0 0117.5 20H7',
  thumbdown: 'M7 13V4H4a1 1 0 00-1 1v7a1 1 0 001 1zM7 13l4 8a2 2 0 002-2v-4h5.5a2 2 0 002-2.3l-1-6A2 2 0 0017.5 4H7',
  copy: 'M9 9h10a1 1 0 011 1v10a1 1 0 01-1 1H9a1 1 0 01-1-1V10a1 1 0 011-1zM5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1',
  bookmark: 'M6 4a1 1 0 011-1h10a1 1 0 011 1v17l-6-4-6 4z',
  pin: 'M9 4h6l-1 6 3 3H7l3-3zM12 13v8',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  back: 'M15 6l-6 6 6 6',
  table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  arrowr: 'M5 12h14M13 6l6 6-6 6',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
};
export function Ic({ name, size = 15, fill = false }: { name: keyof typeof P; size?: number; fill?: boolean }) {
  return <svg className="td-icon" width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={P[name]} /></svg>;
}

export async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; } catch { /* fall through to the legacy path */ }
  try { const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch { return false; }
}

export interface ToastMsg { id: number; text: string; action?: { label: string; run: () => void } }
export function Toast({ t, onClose }: { t: ToastMsg | null; onClose: () => void }) {
  useEffect(() => { if (!t) return; const h = window.setTimeout(onClose, t.action ? 9000 : 4500); return () => window.clearTimeout(h); }, [t, onClose]);
  if (!t) return null;
  return (
    <div className="tv-toast" role="status" key={t.id}>
      <span>{t.text}</span>
      {t.action && <button type="button" className="tv-toast-a" onClick={() => { t.action!.run(); onClose(); }}>{t.action.label}</button>}
      <button type="button" className="tv-toast-x" aria-label="Dismiss" onClick={onClose}><Ic name="x" size={13} /></button>
    </div>
  );
}

/** Reveals text word by word. With reduced motion, or when `on` is false, the whole text is there at once. */
export function useTyped(text: string, on: boolean, reduced: boolean, ms = 16) {
  const words = useMemo(() => text.split(' '), [text]);
  const [n, setN] = useState(on && !reduced ? 0 : words.length);
  useEffect(() => {
    if (!on || reduced) { setN(words.length); return; }
    if (n >= words.length) return;
    const h = window.setTimeout(() => setN((k) => k + 1), ms);
    return () => window.clearTimeout(h);
  }, [n, on, reduced, words.length, ms]);
  return { text: words.slice(0, n).join(' '), done: n >= words.length };
}

export function SearchBox({ value, onChange, label, placeholder, className }: { value: string; onChange: (v: string) => void; label: string; placeholder: string; className?: string }) {
  return (
    <label className={cx('tv-search', className)}>
      <Ic name="search" size={14} /><span className="td-sr">{label}</span>
      <input type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.stopPropagation(); onChange(''); } }} />
    </label>
  );
}
