'use client';
/*
 * Adapted from BoardUI (MIT), Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI) (free tier). See THIRD_PARTY_NOTICES.md.
 * What changed from upstream: react-aria's ToggleButtonGroup is a native radio group (roving tabindex; the arrow keys move and select, Home / End jump);
 * the sliding thumb is measured with a ResizeObserver exactly as upstream does, and until it is measured (server render, no JS) the selected
 * segment paints its own background so nothing is blank. Upstream: base/segmented-control/segmented-control.tsx.
 */
import { useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { cx, useControlled, useIsoLayoutEffect } from './_bui';

export type SegmentedVariant = 'solid' | 'plain';
export interface SegmentOption<T extends string = string> { id: T; label: ReactNode; disabled?: boolean; text?: string }
export interface SegmentedControlProps<T extends string = string> {
  options: Array<SegmentOption<T>>;
  /** Controlled value. */
  value?: T;
  defaultValue?: T;
  onChange?: (id: T) => void;
  /** Accessible name of the group. */
  label: string;
  /** solid: tinted track with a sliding thumb (default). plain: no track, the selected segment is only bolder. */
  variant?: SegmentedVariant;
  /** Segments share the width equally. */
  fullWidth?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function SegmentedControl<T extends string = string>({ options, value, defaultValue, onChange, label, variant = 'solid', fullWidth = false, className, style }: SegmentedControlProps<T>) {
  const [cur, setCur] = useControlled<T>(value, defaultValue ?? options[0]!.id, onChange);
  const root = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  useIsoLayoutEffect(() => {
    const el = root.current; if (!el || variant !== 'solid') return;
    const measure = () => { const s = el.querySelector<HTMLElement>('[aria-checked="true"]'); if (s) setThumb({ x: s.offsetLeft, y: s.offsetTop, w: s.offsetWidth, h: s.offsetHeight }); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el); el.querySelectorAll('button').forEach((b) => ro.observe(b));
    return () => ro.disconnect();
  }, [cur, options, variant]);
  const enabled = options.filter((o) => !o.disabled);
  const onKey = (e: KeyboardEvent) => {
    const i = enabled.findIndex((o) => o.id === cur);
    const n = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? enabled.length - 1 : null;
    if (n === null) return;
    e.preventDefault();
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const k = rtl && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') ? (e.key === 'ArrowRight' ? i - 1 : i + 1) : n;
    const t = enabled[(k + enabled.length) % enabled.length]!; setCur(t.id);
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-seg="${CSS.escape(t.id)}"]`)?.focus());
  };
  return (
    <div ref={root} role="radiogroup" aria-label={label} onKeyDown={onKey} data-thumb={thumb ? '' : undefined} style={style}
      className={cx('bui', 'bui-seg', `is-${variant}`, fullWidth && 'is-full', className)}>
      {variant === 'solid' && thumb && <span className="bui-seg-thumb" aria-hidden="true" style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)`, width: thumb.w, height: thumb.h }} />}
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" data-seg={o.id} aria-checked={o.id === cur} aria-label={o.text} disabled={o.disabled} tabIndex={o.id === cur ? 0 : -1}
          className="bui-seg-i" onClick={() => setCur(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Demo() {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [view, setView] = useState('grid');
  return (
    <div className="bui-demo is-center is-stack">
      <SegmentedControl label="Reporting period" value={period} onChange={setPeriod}
        options={[{ id: 'weekly', label: 'Weekly' }, { id: 'monthly', label: 'Monthly' }, { id: 'yearly', label: 'Yearly' }]} />
      <p className="bui-demo-note" role="status">Showing {period} figures</p>
      <SegmentedControl label="Layout" variant="plain" value={view} onChange={setView} options={[{ id: 'grid', label: 'Grid' }, { id: 'list', label: 'List' }, { id: 'board', label: 'Board' }]} />
    </div>
  );
}
