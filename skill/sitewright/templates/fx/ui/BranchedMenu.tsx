'use client';
import { useEffect, useId, useMemo, useRef, type KeyboardEvent, type ReactNode, type CSSProperties } from 'react';
import { cx, useControlled, useDismiss, useTypeahead } from './_micro-a';

export interface BranchedMenuItem {
  id: string;
  label: string;
  /** Small secondary text shown after the label. */
  hint?: string;
  disabled?: boolean;
  icon?: ReactNode;
}
export interface BranchedMenuProps {
  /** Text of the trigger button. */
  label?: string;
  items?: BranchedMenuItem[];
  onSelect?: (item: BranchedMenuItem) => void;
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  style?: CSSProperties;
}

const Dot = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={d} /></svg>
);
export const DEFAULT_ITEMS: BranchedMenuItem[] = [
  { id: 'new', label: 'New page', hint: 'N', icon: <Dot d="M12 5v14M5 12h14" /> },
  { id: 'dup', label: 'Duplicate', hint: 'D', icon: <Dot d="M9 9h10v10H9zM5 15V5h10" /> },
  { id: 'move', label: 'Move to…', icon: <Dot d="M5 12h14M13 6l6 6-6 6" /> },
  { id: 'del', label: 'Archive', hint: '⌫', icon: <Dot d="M4 7h16M6 7v12h12V7M10 11v4M14 11v4M9 7V4h6v3" /> },
];

/** A menu button whose actions grow out of the trigger along a branching line. Arrow keys, Home/End and type-ahead move, Enter/Space choose, Escape closes. */
export default function BranchedMenu({ label = 'Actions', items = DEFAULT_ITEMS, onSelect, open, defaultOpen = false, onOpenChange, className, style }: BranchedMenuProps) {
  const [isOpen, setOpen] = useControlled(open, defaultOpen, onOpenChange);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const wantFocus = useRef<number | 'last' | null>(null);
  const uid = useId();
  const menuId = `${uid}-menu`;
  const enabled = useMemo(() => items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0), [items]);
  const ahead = useTypeahead(useMemo(() => items.map((i) => i.label), [items]));

  useDismiss(root, isOpen, () => setOpen(false));
  useEffect(() => {
    if (!isOpen || wantFocus.current === null) return;
    const w = wantFocus.current;
    wantFocus.current = null;
    const i = w === 'last' ? enabled[enabled.length - 1] : (enabled[w] ?? enabled[0]);
    if (i !== undefined) refs.current[i]?.focus();
  }, [isOpen, enabled]);

  const close = (refocus: boolean) => { setOpen(false); if (refocus) trigger.current?.focus(); };
  const focusAt = (i: number | undefined) => { if (i !== undefined) refs.current[i]?.focus(); };

  const onTriggerKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      wantFocus.current = e.key === 'ArrowUp' ? 'last' : 0;
      if (isOpen) { focusAt(e.key === 'ArrowUp' ? enabled[enabled.length - 1] : enabled[0]); wantFocus.current = null; } else setOpen(true);
    } else if (e.key === 'Escape' && isOpen) { e.preventDefault(); close(false); }
  };
  const onMenuKey = (e: KeyboardEvent) => {
    const cur = refs.current.findIndex((r) => r === document.activeElement);
    const pos = enabled.indexOf(cur);
    if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(enabled[(pos + 1) % enabled.length]); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(enabled[(pos - 1 + enabled.length) % enabled.length]); }
    else if (e.key === 'Home') { e.preventDefault(); focusAt(enabled[0]); }
    else if (e.key === 'End') { e.preventDefault(); focusAt(enabled[enabled.length - 1]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === 'Tab') close(false);
    else {
      const m = ahead(e.key, Math.max(cur, 0));
      if (m >= 0 && !items[m]?.disabled) { e.preventDefault(); focusAt(m); }
    }
  };
  const choose = (it: BranchedMenuItem) => { if (it.disabled) return; onSelect?.(it); close(true); };

  return (
    <div ref={root} className={cx('ui-branched-menu', isOpen && 'is-open', className)} style={style}>
      <button ref={trigger} type="button" className="ui-branched-menu-trigger" aria-haspopup="menu" aria-expanded={isOpen} aria-controls={menuId}
        onClick={() => { wantFocus.current = null; setOpen(!isOpen); }} onKeyDown={onTriggerKey}>
        <span>{label}</span>
        <svg className="ui-branched-menu-caret" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <ul id={menuId} role="menu" aria-label={label} className="ui-branched-menu-list" onKeyDown={onMenuKey} style={{ '--n': items.length } as CSSProperties}>
        {items.map((it, i) => (
          <li key={it.id} role="none" className="ui-branched-menu-row" style={{ '--i': i } as CSSProperties}>
            <span className="ui-branched-menu-branch" aria-hidden="true" />
            <button ref={(el) => { refs.current[i] = el; }} type="button" role="menuitem" className="ui-branched-menu-item" tabIndex={-1}
              aria-disabled={it.disabled || undefined} onClick={() => choose(it)}>
              {it.icon && <span className="ui-branched-menu-icon" aria-hidden="true">{it.icon}</span>}
              <span className="ui-branched-menu-text">{it.label}</span>
              {it.hint && <kbd className="ui-branched-menu-hint" aria-hidden="true">{it.hint}</kbd>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-branched-menu-demo">
      <BranchedMenu defaultOpen />
    </div>
  );
}
