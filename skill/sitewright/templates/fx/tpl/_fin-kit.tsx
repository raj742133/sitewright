'use client';
// Small shared pieces for the finance views: a modal with a focus trap, labelled form fields with inline errors, a switch,
// a search box, a select, the undo toast and a CSV download helper.
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Button, Glyph, cx } from './_dash';

export function Modal({ id, title, onClose, children }: { id: string; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const prev = document.activeElement as HTMLElement | null; (ref.current?.querySelector('input:not([type=hidden]),select,textarea') as HTMLElement | null ?? ref.current?.querySelector('button.is-primary') as HTMLElement | null)?.focus(); return () => prev?.focus?.(); }, []);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab') return;
    const f = Array.from(ref.current?.querySelectorAll<HTMLElement>('input,select,textarea,button:not(:disabled)') ?? []); if (!f.length) return;
    const first = f[0]!, last = f[f.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  return (
    <div className="tf-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tf-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} ref={ref} onKeyDown={onKey}>
        <div className="tf-mod">
          <div className="tf-dlg-h"><h2 id={`${id}-t`}>{title}</h2><Button variant="ghost" small icon="x" label="Close" onClick={onClose} /></div>
          {children}
        </div>
      </div>
    </div>
  );
}

interface FieldBase { id: string; label: string; error?: string; hint?: string; optional?: boolean }
const describe = (id: string, error?: string, hint?: string) => [error ? `${id}-e` : '', hint ? `${id}-h` : ''].filter(Boolean).join(' ') || undefined;
function Shell({ id, label, error, hint, optional, children }: FieldBase & { children: ReactNode }) {
  return <div className="tf-f"><label htmlFor={id}><span>{label}{optional && <em>optional</em>}</span></label>{children}{hint && !error && <small id={`${id}-h`} className="tf-fh">{hint}</small>}{error && <small id={`${id}-e`} className="tf-fe" role="alert">{error}</small>}</div>;
}
export function TextField({ value, onChange, type = 'text', inputMode, placeholder, min, max, ...b }: FieldBase & { value: string; onChange: (v: string) => void; type?: string; inputMode?: 'decimal' | 'text'; placeholder?: string; min?: string; max?: string }) {
  return <Shell {...b}><input id={b.id} type={type} value={value} min={min} max={max} inputMode={inputMode} placeholder={placeholder} autoComplete="off" aria-invalid={b.error ? true : undefined} aria-describedby={describe(b.id, b.error, b.hint)} onChange={(e) => onChange(e.target.value)} /></Shell>;
}
export function SelectField({ value, onChange, options, ...b }: FieldBase & { value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return <Shell {...b}><select id={b.id} value={value} aria-invalid={b.error ? true : undefined} aria-describedby={describe(b.id, b.error, b.hint)} onChange={(e) => onChange(e.target.value)}>{options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Shell>;
}
export const parseCents = (s: string) => Math.round(parseFloat(s.replace(/[$,\s]/g, '')) * 100);

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className="tf-sw" onClick={() => onChange(!on)}><i /></button>;
}
export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return <label className="tf-search"><Glyph name="search" size={14} /><input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} /></label>;
}
export function SelectBox({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: Array<[string, string] | { group: string; items: Array<[string, string]> }>; label: string }) {
  return <label className="tf-select"><select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>{options.map((o) => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <optgroup key={o.group} label={o.group}>{o.items.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</optgroup>)}</select><Glyph name="down" size={12} /></label>;
}

export function Toast({ msg, onUndo, onClose }: { msg: string; onUndo?: () => void; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 8000); return () => clearTimeout(t); }, [msg, onClose]);
  return <div className="tf-toast"><span>{msg}</span>{onUndo && <button type="button" onClick={onUndo}>Undo</button>}<button type="button" className="tf-toast-x" aria-label="Dismiss" onClick={onClose}><Glyph name="x" size={13} /></button></div>;
}

export const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;
/** Saves text as a file. Returns false where downloads are not available (a sandboxed preview). */
export function download(name: string, text: string, type = 'text/csv') {
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href); return true; } catch { return false; }
}
export const Meter = ({ value, cap, label, tone }: { value: number; cap: number; label: string; tone?: 'bad' | 'signal' }) => (
  <div className={cx('tf-meter', value / cap > 0.85 && 'is-hot')} role="progressbar" aria-label={label} aria-valuenow={Math.round(Math.min(1, value / cap) * 100)} aria-valuemin={0} aria-valuemax={100} data-tone={tone}><i style={{ width: `${Math.min(1, value / cap) * 100}%` }} /></div>
);
