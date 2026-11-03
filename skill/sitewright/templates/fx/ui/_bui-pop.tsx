'use client';
/*
 * Adapted from BoardUI (MIT), Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI) (free tier). See THIRD_PARTY_NOTICES.md.
 * Popover, menu button and hint tooltip for the BoardUI-style components. Upstream used react-aria; these are small hand-written
 * equivalents: a portalled fixed panel placed from the trigger's rectangle, Escape / outside press / focus-out to close, focus returned.
 */
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Ico, cx, type BuiIcon } from './_bui';

export type Placement = 'bottom-start' | 'bottom-end' | 'right-top' | 'right-bottom';

function place(r: DOMRect, pw: number, ph: number, p: Placement): { left: number; top: number; origin: string } {
  const vw = window.innerWidth, vh = window.innerHeight, gap = 8, m = 8;
  let left = 0, top = 0, origin = 'top left';
  if (p === 'right-top' || p === 'right-bottom') {
    left = r.right + gap; top = p === 'right-top' ? r.top : r.bottom - ph; origin = p === 'right-top' ? 'top left' : 'bottom left';
    if (left + pw > vw - m) { left = Math.min(r.left, vw - pw - m); top = p === 'right-top' ? r.bottom + gap : r.top - ph - gap; } // no room on the right: open above or below
  } else {
    left = p === 'bottom-end' ? r.right - pw : r.left; top = r.bottom + gap; origin = p === 'bottom-end' ? 'top right' : 'top left';
  }
  if (top + ph > vh - m && r.top - ph - gap >= m && (p.startsWith('bottom') || p === 'right-top')) top = r.top - ph - gap;
  return { left: Math.max(m, Math.min(left, vw - pw - m)), top: Math.max(m, Math.min(top, vh - ph - m)), origin };
}

/** A trigger that opens a floating panel. `children` is the panel; call `close()` (the render prop) to dismiss it. */
export function Popover({ trigger, children, placement = 'bottom-start', label, width = 265, className, triggerClassName, triggerLabel, triggerProps, onOpenChange, role = 'dialog' }: {
  trigger: (open: boolean) => ReactNode; children: (close: () => void) => ReactNode; placement?: Placement; label: string; width?: number | string; className?: string; triggerClassName?: string; triggerLabel?: string;
  triggerProps?: Record<string, unknown>; onOpenChange?: (open: boolean) => void; role?: 'dialog' | 'menu';
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; origin: string } | null>(null);
  const tRef = useRef<HTMLButtonElement>(null); const pRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const set = useCallback((v: boolean, focusTrigger = false) => { setOpen(v); if (!v) setPos(null); onOpenChange?.(v); if (!v && focusTrigger) tRef.current?.focus(); }, [onOpenChange]);
  const measure = useCallback(() => { const t = tRef.current, p = pRef.current; if (t && p) setPos(place(t.getBoundingClientRect(), p.offsetWidth, p.offsetHeight, placement)); }, [placement]);
  useEffect(() => {
    if (!open) return;
    measure();
    const first = pRef.current?.querySelector<HTMLElement>('[data-autofocus], button, [href], input, select, [tabindex]:not([tabindex="-1"])');
    first?.focus({ preventScroll: true });
    const kd = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); set(false, true); } };
    const pd = (e: PointerEvent) => { const n = e.target as Node; if (!pRef.current?.contains(n) && !tRef.current?.contains(n)) set(false); };
    const rs = () => measure();
    document.addEventListener('keydown', kd, true); document.addEventListener('pointerdown', pd); window.addEventListener('resize', rs); window.addEventListener('scroll', rs, true);
    return () => { document.removeEventListener('keydown', kd, true); document.removeEventListener('pointerdown', pd); window.removeEventListener('resize', rs); window.removeEventListener('scroll', rs, true); };
  }, [open, measure, set]);
  const onBlur = (e: React.FocusEvent) => { const to = e.relatedTarget as Node | null; if (to && !pRef.current?.contains(to) && !tRef.current?.contains(to)) set(false); };
  const style: CSSProperties = pos ? { left: pos.left, top: pos.top, transformOrigin: pos.origin, width } : { left: 0, top: 0, visibility: 'hidden', width };
  return (
    <>
      <button ref={tRef} type="button" className={triggerClassName} aria-haspopup={role === 'menu' ? 'menu' : 'dialog'} aria-expanded={open} aria-controls={open ? id : undefined} aria-label={triggerLabel} onClick={() => set(!open)} {...triggerProps}>{trigger(open)}</button>
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={pRef} id={id} className={cx('bui bui-pop', pos && 'is-in', className)} role={role} aria-label={label} style={style} onBlur={onBlur}>{children(() => set(false, true))}</div>,
        document.body,
      )}
    </>
  );
}

export interface MenuAction { id: string; label: string; icon?: BuiIcon; danger?: boolean }
/** A "more" style menu button with arrow-key navigation (APG menu button). */
export function MenuButton({ label, actions, onSelect, icon = 'more', className }: { label: string; actions: MenuAction[]; onSelect: (id: string) => void; icon?: BuiIcon; className?: string }) {
  return (
    <Popover role="menu" placement="bottom-end" width={216} label={label} triggerLabel={label} triggerClassName={cx('bui-iconbtn', className)} trigger={() => <Ico name={icon} size={16} />}>
      {(close) => <MenuList actions={actions} onSelect={(id) => { onSelect(id); close(); }} />}
    </Popover>
  );
}
function MenuList({ actions, onSelect }: { actions: MenuAction[]; onSelect: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus(); }, []);
  const key = (e: KeyboardEvent) => {
    const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])]; const i = items.indexOf(document.activeElement as HTMLElement);
    const n = e.key === 'ArrowDown' ? (i + 1) % items.length : e.key === 'ArrowUp' ? (i - 1 + items.length) % items.length : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : -1;
    if (n >= 0) { e.preventDefault(); items[n]?.focus(); }
  };
  return (
    <div ref={ref} className="bui-menu" onKeyDown={key}>
      {actions.map((a) => <button key={a.id} type="button" role="menuitem" tabIndex={-1} className={cx('bui-mi', a.danger && 'is-danger')} onClick={() => onSelect(a.id)}>{a.icon && <Ico name={a.icon} size={18} />}<span>{a.label}</span></button>)}
    </div>
  );
}

/** A small "i" button that explains a figure: opens on hover, focus and click, closes on Escape or leaving. */
export function Hint({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false); const [pin, setPin] = useState(false); const id = useId();
  useEffect(() => {
    if (!open) return;
    const kd = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setPin(false); } };
    document.addEventListener('keydown', kd); return () => document.removeEventListener('keydown', kd);
  }, [open]);
  return (
    <span className="bui-hint" onMouseEnter={() => setOpen(true)} onMouseLeave={() => { if (!pin) setOpen(false); }}>
      <button type="button" className="bui-hint-b" aria-label={`About ${label}`} aria-describedby={open ? id : undefined} aria-expanded={open}
        onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setPin(false); }} onClick={() => { setPin(!pin); setOpen(!pin || !open); }}>
        <Ico name="info" size={20} />
      </button>
      {open && <span role="tooltip" id={id} className="bui-tip">{children}</span>}
    </span>
  );
}
