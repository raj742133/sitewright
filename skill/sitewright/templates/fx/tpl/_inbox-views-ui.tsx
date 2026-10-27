'use client';
// Small pieces the non-inbox views share: the page heading that takes focus on a view change, a toast, a switch, labelled fields and a search box.
import { createContext, useContext, useEffect, useId, useRef, type ReactNode } from 'react';
import { Glyph, cx } from './_dash';
import { Ico } from './_inbox';

export const ViewCtx = createContext<{ focus: boolean; announce: (s: string) => void }>({ focus: false, announce: () => {} });

/** The h1 of a view. On mount it scrolls the content to the top and, after the user navigated, takes focus and announces itself. */
export function ViewHead({ title, sub, children, back }: { title: string; sub?: string; children?: ReactNode; back?: { label: string; onClick: () => void } }) {
  const ctx = useContext(ViewCtx); const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const sc = ref.current?.closest('.td-content'); if (sc) sc.scrollTop = 0;
    if (ctx.focus) { ref.current?.focus({ preventScroll: true }); ctx.announce(`${title}`); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="td-ph tv-head">
      <div>
        {back && <button type="button" className="tv-back" onClick={back.onClick}><Ico name="back" size={14} />{back.label}</button>}
        <h1 ref={ref} tabIndex={-1} data-vh="">{title}</h1>{sub && <p>{sub}</p>}
      </div>
      <div className="td-ph-a">{children}</div>
    </div>
  );
}

export interface ToastMsg { id: number; text: string; undo?: () => void }
export function Toast({ t, onClose }: { t: ToastMsg | null; onClose: () => void }) {
  return (
    <div className="tv-toastwrap">
      {t && <div className="tv-toast" key={t.id}><Ico name="check" size={14} /><span>{t.text}</span>{t.undo && <button type="button" onClick={() => { t.undo?.(); onClose(); }}>Undo</button>}<button type="button" className="tv-toast-x" aria-label="Dismiss" onClick={onClose}><Ico name="x" size={12} /></button></div>}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="tv-switch" onClick={() => onChange(!checked)}><i /></button>;
}

/** A labelled input with an inline error wired up through aria-invalid and aria-describedby. */
export function Field({ label, error, hint, children, id: given }: { label: string; error?: string; hint?: string; children: (p: { id: string; 'aria-invalid': boolean | undefined; 'aria-describedby': string | undefined }) => ReactNode; id?: string }) {
  const auto = useId(); const id = given ?? auto; const d = error ? `${id}-e` : hint ? `${id}-h` : undefined;
  return (
    <div className={cx('tv-field', error && 'has-err')}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': d })}
      {error ? <p id={`${id}-e`} className="tv-err" role="alert">{error}</p> : hint ? <p id={`${id}-h`} className="tv-hint">{hint}</p> : null}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <label className="tv-search"><Glyph name="search" size={14} /><span className="td-sr">{label}</span>
      <input type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') onChange(''); }} />
      {value && <button type="button" aria-label="Clear search" onClick={() => onChange('')}><Ico name="x" size={13} /></button>}
    </label>
  );
}
export function SelectField({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: Array<{ id: string; label: string }>; label: string }) {
  return (
    <label className="tv-select"><span className="td-sr">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select><Glyph name="down" size={12} />
    </label>
  );
}
