'use client';
import { cloneElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';

export interface WarmTooltipProps {
  /** Tooltip content (keep it short and non-interactive). */
  content: ReactNode;
  /** The single focusable element the tooltip describes; it receives aria-describedby. */
  children: ReactElement<{ 'aria-describedby'?: string }>;
  placement?: 'top' | 'bottom';
  /** Hover delay in ms before the first tooltip opens. Tooltips opened shortly after another one closed show instantly (the "warm" state). */
  delay?: number;
  className?: string;
}

// Shared "warm" clock: when any tooltip closed recently, the next one opens without waiting. Only read and written inside event handlers.
let lastClosed = -1e9;
const WARM_MS = 700;
const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);

/** A tooltip with warm-up behaviour: the first hover waits a beat, but moving along a row of controls opens neighbours instantly. It opens on keyboard focus, stays open while the pointer is over it, closes with Escape, flips below when there is no room above, and is exposed with role=tooltip and aria-describedby. */
export default function WarmTooltip({ content, children, placement = 'top', delay = 450, className = '' }: WarmTooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [warm, setWarm] = useState(false);
  const [side, setSide] = useState(placement);
  const tip = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => setSide(placement), [placement]);

  const show = (immediate: boolean) => {
    clearTimeout(timer.current);
    const isWarm = now() - lastClosed < WARM_MS;
    const go = () => { setWarm(isWarm); setOpen(true); };
    if (immediate || isWarm || delay <= 0) go(); else timer.current = setTimeout(go, delay);
  };
  const openRef = useRef(false);
  openRef.current = open;
  const hide = (grace = 0) => {
    clearTimeout(timer.current);
    if (openRef.current) lastClosed = now(); // leaving an open tooltip warms its neighbours straight away
    const go = () => { setOpen((o) => { if (o) lastClosed = now(); return false; }); };
    if (grace) timer.current = setTimeout(go, grace); else go();
  };

  useEffect(() => {
    if (!open) return;
    const el = tip.current;
    if (el) {
      const r = el.getBoundingClientRect();
      if (placement === 'top' && r.top < 4) setSide('bottom');
      else if (placement === 'bottom' && r.bottom > window.innerHeight - 4 && r.top > r.height + 40) setSide('top');
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const described = [children.props['aria-describedby'], id].filter(Boolean).join(' ');
  return (
    <span className={`ui-warm-tooltip ${className}`.trim()}
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') show(false); }}
      onPointerLeave={(e) => { if (e.pointerType !== 'touch') hide(90); }}
      onFocus={() => show(true)} onBlur={() => hide()}>
      {cloneElement(children, { 'aria-describedby': described })}
      <span ref={tip} id={id} role="tooltip" className="ui-warm-tooltip-tip" data-open={open || undefined} data-warm={warm || undefined} data-side={side}>
        {content}
      </span>
    </span>
  );
}

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={d} /></svg>
);
const TOOLS = [
  { label: 'Bold', tip: 'Bold (Ctrl+B)', d: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z' },
  { label: 'Italic', tip: 'Italic (Ctrl+I)', d: 'M10 5h8M6 19h8M14 5l-4 14' },
  { label: 'Link', tip: 'Add a link', d: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' },
  { label: 'Comment', tip: 'Leave a comment', d: 'M5 5h14v10H11l-4 4v-4H5z' },
];

export function Demo() {
  return (
    <div className="ui-warm-tooltip-stage">
      <div className="ui-warm-tooltip-bar" role="toolbar" aria-label="Text formatting">
        {TOOLS.map((t) => (
          <WarmTooltip key={t.label} content={t.tip}>
            <button type="button" className="ui-warm-tooltip-btn" aria-label={t.label}><Icon d={t.d} /></button>
          </WarmTooltip>
        ))}
      </div>
    </div>
  );
}
