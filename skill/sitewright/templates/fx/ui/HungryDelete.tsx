'use client';
import { useState } from 'react';
import { captionStyle, useReducedMotion, useTimers } from './_d1';

export interface HungryDeleteProps {
  /** Name shown on the file chip. */
  fileName?: string;
  label?: string;
  /** How long the Undo stays available after the file was eaten. */
  undoMs?: number;
  onDelete?: () => void;
  onUndo?: () => void;
  /** Fires when the undo window ran out. */
  onFinalize?: () => void;
}

type Phase = 'idle' | 'eating' | 'gone' | 'final';

/** Delete button shaped like a mouth: it opens on hover or focus, swallows the file chip when activated, and spits it back on Undo. */
export default function HungryDelete({ fileName = 'report-q3.pdf', label = 'Delete', undoMs = 6000, onDelete, onUndo, onFinalize }: HungryDeleteProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const { later, clear } = useTimers();

  const eat = () => {
    if (phase !== 'idle') return;
    onDelete?.();
    setPhase('eating');
    later(() => setPhase('gone'), reduced ? 0 : 900);
    later(() => { setPhase('final'); onFinalize?.(); }, (reduced ? 0 : 900) + undoMs);
  };
  const undo = () => { clear(); setPhase('idle'); onUndo?.(); };
  const reset = () => { clear(); setPhase('idle'); };

  const chewing = phase === 'eating';
  return (
    <div className="ui-hungry-delete" data-phase={phase}>
      <span className="ui-hungry-delete-chip" aria-hidden={phase !== 'idle' && phase !== 'eating' ? true : undefined}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z M14 3v4h4" /></svg>
        {fileName}
      </span>
      <button
        type="button"
        className="ui-hungry-delete-btn"
        data-open={open || chewing ? 'true' : 'false'}
        aria-label={`${label} ${fileName}`}
        aria-disabled={phase !== 'idle'}
        onClick={eat}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <span className="ui-hungry-delete-gap" aria-hidden="true"><i /></span>
        <span className="ui-hungry-delete-lid is-up" aria-hidden="true"><span>{label}</span></span>
        <span className="ui-hungry-delete-lid is-down" aria-hidden="true"><span>{label}</span></span>
      </button>
      <span className="ui-hungry-delete-status" role="status" aria-live="polite">
        {phase === 'gone' && (<><span>{fileName} deleted.</span> <button type="button" className="ui-hungry-delete-undo" onClick={undo}>Undo</button></>)}
        {phase === 'final' && (<><span>Gone for good.</span> <button type="button" className="ui-hungry-delete-undo" onClick={reset}>Reset</button></>)}
        {chewing && 'Deleting…'}
      </span>
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
      <HungryDelete />
      <span style={captionStyle}>Feed it a file</span>
    </div>
  );
}
