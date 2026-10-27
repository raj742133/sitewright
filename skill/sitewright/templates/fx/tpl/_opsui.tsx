'use client';
// Small shared UI for the operations views: view heading (focus target), modal/drawer with focus trap, sortable grid, form field, search box, toast.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { Button, Glyph, Pill, cx } from './_dash';
import type { Toast } from './_opsstate';

export function ViewHeader({ title, sub, hRef, children }: { title: string; sub?: string; hRef: RefObject<HTMLHeadingElement | null>; children?: ReactNode }) {
  return <div className="td-ph"><div><h1 ref={hRef} tabIndex={-1} className="to-h1">{title}</h1>{sub && <p>{sub}</p>}</div><div className="td-ph-a">{children}</div></div>;
}

export function dueInfo(due: number, done = false): { label: string; tone: 'bad' | 'warn' | 'neutral' | 'ok' } {
  if (done) return { label: 'Delivered', tone: 'ok' };
  if (due < 0) return { label: `${-due} d late`, tone: 'bad' };
  if (due === 0) return { label: 'Due today', tone: 'warn' };
  return { label: `in ${due} d`, tone: 'neutral' };
}

/** A modal dialog, or a right-hand drawer: focus moves in, Tab is trapped, Escape and the scrim close it, focus returns to the opener. */
export function Modal({ title, sub, onClose, children, footer, drawer, id }: { title: string; sub?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; drawer?: boolean; id: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { const prev = document.activeElement as HTMLElement | null; (box.current?.querySelector<HTMLElement>('[data-first]') ?? box.current?.querySelector<HTMLElement>('input,textarea,select,button'))?.focus(); return () => prev?.focus?.(); }, []);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !box.current) return;
    const f = [...box.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, textarea, a[href]')]; const a = document.activeElement;
    if (e.shiftKey && a === f[0]) { e.preventDefault(); f[f.length - 1]?.focus(); } else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0]?.focus(); }
  };
  return (
    <div className={cx('to-scrim', drawer && 'is-drawer')} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('to-dialog', drawer && 'is-drawer')} ref={box} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} onKeyDown={onKey}>
        <header><div><h2 id={`${id}-t`}>{title}</h2>{sub && <p>{sub}</p>}</div><Button variant="ghost" icon="x" label="Close" onClick={onClose} /></header>
        <div className="to-dlg-b">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}

export interface GCol<T> { id: string; label: string; right?: boolean; hide?: 'sm' | 'md'; sort?: (a: T, b: T) => number; cell: (r: T) => ReactNode; w?: string }
/** A dense sortable table. Sort state is local; the caller passes filtered rows. Rows are activated from a button inside a cell (keyboard friendly). */
export function Grid<T>({ cols, rows, rowKey, caption, empty, selected, initial, maxHeight }: { cols: Array<GCol<T>>; rows: T[]; rowKey: (r: T) => string; caption: string; empty: ReactNode; selected?: string | null; initial?: { id: string; dir: 1 | -1 }; maxHeight?: number | string }) {
  const [sort, setSort] = useState<{ id: string; dir: 1 | -1 } | null>(initial ?? null);
  const sorted = useMemo(() => { const c = cols.find((x) => x.id === sort?.id); return sort && c?.sort ? [...rows].sort((a, b) => c.sort!(a, b) * sort.dir) : rows; }, [rows, sort, cols]);
  return (
    <div className="td-tablewrap to-grid" style={{ maxHeight }}>
      <table className="td-table to-tbl">
        <caption className="td-sr">{caption}</caption>
        <thead><tr>{cols.map((c) => (
          <th key={c.id} scope="col" style={{ width: c.w }} className={cx(c.right && 'is-r', c.hide && `hide-${c.hide}`)} aria-sort={sort?.id === c.id ? (sort.dir === 1 ? 'ascending' : 'descending') : c.sort ? 'none' : undefined}>
            {c.sort ? <button type="button" onClick={() => setSort((s) => ({ id: c.id, dir: s?.id === c.id && s.dir === 1 ? -1 : 1 }))}>{c.label}<Glyph name="down" size={11} className={cx('td-sortic', sort?.id === c.id && 'is-on', sort?.id === c.id && sort.dir === 1 && 'is-asc')} /></button> : c.label}
          </th>))}</tr></thead>
        <tbody>
          {sorted.length === 0 && <tr><td colSpan={cols.length} className="to-noneCell">{empty}</td></tr>}
          {sorted.map((r) => <tr key={rowKey(r)} className={cx(selected === rowKey(r) && 'is-sel')}>{cols.map((c) => <td key={c.id} className={cx(c.right && 'is-r', c.hide && `hide-${c.hide}`)}>{c.cell(r)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function SearchBox({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder: string }) {
  return <label className="to-find"><Glyph name="search" size={14} /><input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} /></label>;
}
export function Select<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ id: T; label: string }>; label: string }) {
  return <label className="to-sel-w"><span className="td-sr">{label}</span><select value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label}>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select><Glyph name="down" size={12} /></label>;
}
export function Field({ label, error, help, children, id }: { label: string; error?: string; help?: string; children: (p: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode; id: string }) {
  const d = error ? `${id}-e` : help ? `${id}-h` : undefined;
  return <div className={cx('to-field', error && 'has-err')}><label htmlFor={id}>{label}</label>{children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': d })}{error ? <small id={`${id}-e`} className="to-err">{error}</small> : help ? <small id={`${id}-h`}>{help}</small> : null}</div>;
}
export function Toaster({ toast, onClose }: { toast: Toast | null; onClose: () => void }) {
  useEffect(() => { if (!toast) return; const t = setTimeout(onClose, toast.undo ? 9000 : 6000); return () => clearTimeout(t); }, [toast, onClose]);
  return (
    <>
      <div className="td-sr" role="status" aria-live="polite">{toast?.msg ?? ''}</div>
      {toast && <div className="to-toast"><Glyph name="check" size={14} /><span>{toast.msg}</span>{toast.undo && <button type="button" className="to-undo" onClick={() => { toast.undo?.(); }}>Undo</button>}<button type="button" onClick={onClose} aria-label="Dismiss"><Glyph name="x" size={12} /></button></div>}
    </>
  );
}
export const StatusPill = ({ status }: { status: 'new' | 'production' | 'ready' | 'shipped' | 'late' }) => {
  const m = { new: ['neutral', 'New'], production: ['info', 'In production'], ready: ['accent', 'Ready'], shipped: ['ok', 'Shipped'], late: ['bad', 'Late'] } as const;
  return <Pill tone={m[status][0]}>{m[status][1]}</Pill>;
};
