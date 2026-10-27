'use client';
// Small shared pieces for the Analytics views: page heading that takes focus, switch, search box, modal dialog, form field, split bar.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Glyph, PALETTE, Segmented, cx, fmt } from './_dash';
import { RANGE_OPTS, type Range } from './_an-data';

export type Notify = (msg: string, undo?: () => void) => void;
export interface ViewProps { range: Range; setRange: (r: Range) => void; focus: boolean; notify: Notify }

/** The page heading. After a sidebar change it takes keyboard focus and the scroller returns to the top. */
export function Head({ title, sub, focus, children }: { title: string; sub?: string; focus?: boolean; children?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (!focus) return; const el = ref.current; el?.focus({ preventScroll: true }); el?.closest('.td-content')?.scrollTo({ top: 0 }); }, [focus]);
  return <div className="td-ph"><div><h1 ref={ref} tabIndex={-1} className="ta-h1">{title}</h1>{sub && <p>{sub}</p>}</div><div className="td-ph-a">{children}</div></div>;
}
export const RangeSeg = ({ value, onChange }: { value: Range; onChange: (r: Range) => void }) => <Segmented label="Date range" value={value} onChange={onChange} options={RANGE_OPTS} />;

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} disabled={disabled} className="ta-switch" onClick={() => onChange(!checked)}><i aria-hidden="true" /><span>{label}</span></button>;
}
export function SearchBox({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string }) {
  return (
    <label className="ta-search"><Glyph name="search" size={14} /><span className="td-sr">{label}</span>
      <input type="search" value={value} placeholder={placeholder ?? label} onChange={(e) => onChange(e.target.value)} />
      {value && <button type="button" aria-label="Clear search" onClick={() => onChange('')}><Glyph name="x" size={12} /></button>}
    </label>
  );
}
/** A native modal dialog: focus is trapped, Escape and the backdrop close it, focus returns to the opener. */
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null); const tid = useId();
  useEffect(() => { const d = ref.current; if (!d) return; if (!d.open) d.showModal(); (d.querySelector('[data-autofocus]') as HTMLElement | null)?.focus(); return () => { if (d.open) d.close(); }; }, []);
  return (
    <dialog ref={ref} className={cx('ta-modal', wide && 'is-wide')} aria-labelledby={tid} onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ta-modal-in">
        <header><h2 id={tid}>{title}</h2><button type="button" className="td-btn is-ghost is-icon" aria-label="Close dialog" onClick={onClose}><Glyph name="x" /></button></header>
        {children}
      </div>
    </dialog>
  );
}
export function Field({ label, hint, error, render }: { label: string; hint?: string; error?: string; render: (p: { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined; className: string }) => ReactNode }) {
  const id = useId(); const d = error ? `${id}-e` : hint ? `${id}-h` : undefined;
  return <div className="ta-field"><label htmlFor={id}>{label}</label>{render({ id, 'aria-invalid': !!error, 'aria-describedby': d, className: 'ta-input' })}{error ? <p id={`${id}-e`} className="ta-err">{error}</p> : hint ? <p id={`${id}-h`} className="ta-hint">{hint}</p> : null}</div>;
}
/** One stacked 100% bar plus its legend rows. */
export function SplitBar({ parts, label }: { parts: Array<{ label: string; value: number }>; label: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div className="ta-split">
      <div className="ta-splitbar" role="img" aria-label={label}>{parts.map((p, k) => <i key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: PALETTE[k % PALETTE.length] }} title={`${p.label} ${fmt.p(p.value / total, 1)}`} />)}</div>
      <ul>{parts.map((p, k) => <li key={p.label}><i style={{ background: PALETTE[k % PALETTE.length] }} /><span>{p.label}</span><b>{fmt.n(p.value)}</b><em>{fmt.p(p.value / total, 1)}</em></li>)}</ul>
    </div>
  );
}
