'use client';
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { cx, useControlled, useDismiss, useTypeahead } from './_micro-a';

export interface GlideOption { value: string; label: string; hint?: string; disabled?: boolean }
export interface GlideSelectProps {
  options?: GlideOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Visible label above the control. */
  label?: string;
  placeholder?: string;
  /** Form field name: renders a hidden input carrying the value. */
  name?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

const OPTS: GlideOption[] = [
  { value: 'daily', label: 'Daily digest', hint: '8:00' },
  { value: 'weekly', label: 'Weekly summary', hint: 'Mon' },
  { value: 'monthly', label: 'Monthly report', hint: '1st' },
  { value: 'never', label: 'Never send' },
];

/** A custom select (listbox) whose highlight glides between options instead of jumping. Arrows, Home/End, type-ahead, Enter/Space to pick, Escape to close; also works as a form field via `name`. */
export default function GlideSelect({ options = OPTS, value, defaultValue, onChange, label = 'Email frequency', placeholder = 'Choose…', name, disabled, className, style }: GlideSelectProps) {
  const [val, setVal] = useControlled<string>(value, defaultValue ?? '', onChange);
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const uid = useId();
  const cur = options.findIndex((o) => o.value === val);
  const ahead = useTypeahead(useMemo(() => options.map((o) => o.label), [options]));
  const ok = (i: number) => i >= 0 && i < options.length && !options[i]?.disabled;

  useDismiss(root, open, () => setOpen(false));
  const show = () => { if (disabled) return; setAct(ok(cur) ? cur : options.findIndex((o) => !o.disabled)); setOpen(true); };
  const hide = (refocus = true) => { setOpen(false); if (refocus) btn.current?.focus(); };
  const pick = (i: number) => { const o = options[i]; if (!o || o.disabled) return; setVal(o.value); hide(); };
  const step = (from: number, d: 1 | -1) => { for (let k = 1; k <= options.length; k++) { const i = (from + d * k + options.length * 2) % options.length; if (ok(i)) return i; } return from; };

  useEffect(() => { if (open) list.current?.querySelector<HTMLElement>('[data-active]')?.scrollIntoView({ block: 'nearest' }); }, [open, act]);

  const onKey = (e: KeyboardEvent) => {
    if (disabled) return;
    const k = e.key;
    if (!open) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') { e.preventDefault(); show(); return; }
      const m = ahead(k, Math.max(cur, 0)); if (m >= 0 && ok(m)) { e.preventDefault(); setVal(options[m]?.value ?? ''); }
      return;
    }
    if (k === 'ArrowDown') { e.preventDefault(); setAct(step(act, 1)); }
    else if (k === 'ArrowUp') { e.preventDefault(); setAct(step(act, -1)); }
    else if (k === 'Home') { e.preventDefault(); setAct(step(-1, 1)); }
    else if (k === 'End') { e.preventDefault(); setAct(step(0, -1)); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); pick(act); }
    else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); hide(); }
    else if (k === 'Tab') hide(false);
    else { const m = ahead(k, Math.max(act, 0)); if (m >= 0 && ok(m)) { e.preventDefault(); setAct(m); } }
  };
  const selected = cur >= 0 ? options[cur] : undefined;

  return (
    <div ref={root} className={cx('ui-glide-select', open && 'is-open', disabled && 'is-disabled', className)} style={style}>
      <span id={`${uid}-l`} className="ui-glide-select-label">{label}</span>
      <button ref={btn} type="button" className="ui-glide-select-btn" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${uid}-list`} aria-labelledby={`${uid}-l ${uid}-v`}
        aria-activedescendant={open && act >= 0 ? `${uid}-o${act}` : undefined} aria-disabled={disabled || undefined}
        onClick={() => (open ? hide() : show())} onKeyDown={onKey}>
        <span id={`${uid}-v`} className={cx('ui-glide-select-value', !selected && 'is-empty')}>{selected ? selected.label : placeholder}</span>
        <svg className="ui-glide-select-chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M7 10l5 5 5-5" /></svg>
      </button>
      <ul ref={list} id={`${uid}-list`} role="listbox" aria-labelledby={`${uid}-l`} className="ui-glide-select-list" tabIndex={-1} hidden={!open}
        style={{ '--act': Math.max(act, 0), '--n': options.length } as CSSProperties}>
        <li className="ui-glide-select-glider" aria-hidden="true" role="presentation" />
        {options.map((o, i) => (
          <li key={o.value} id={`${uid}-o${i}`} role="option" aria-selected={i === cur} aria-disabled={o.disabled || undefined} data-active={i === act || undefined} className="ui-glide-select-opt"
            onPointerMove={() => { if (!o.disabled && act !== i) setAct(i); }} onClick={() => pick(i)} onMouseDown={(e) => e.preventDefault()}>
            <span className="ui-glide-select-check" aria-hidden="true">{i === cur ? '✓' : ''}</span>
            <span className="ui-glide-select-text">{o.label}</span>
            {o.hint && <span className="ui-glide-select-hint">{o.hint}</span>}
          </li>
        ))}
      </ul>
      {name && <input type="hidden" name={name} value={val} />}
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-glide-select-demo">
      <GlideSelect defaultValue="weekly" />
    </div>
  );
}
