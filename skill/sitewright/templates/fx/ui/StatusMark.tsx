'use client';
import { useState } from 'react';

export type MarkStatus = 'idle' | 'loading' | 'success' | 'warning' | 'error';

export interface StatusMarkProps {
  status?: MarkStatus;
  /** Text announced to assistive tech and shown beside the mark. Defaults per status. */
  label?: string;
  /** Hide the visible text (it is still announced). */
  iconOnly?: boolean;
  /** Mark diameter in px. */
  size?: number;
  className?: string;
}

const DEFAULT_LABEL: Record<MarkStatus, string> = { idle: 'Ready', loading: 'Working', success: 'Done', warning: 'Needs attention', error: 'Failed' };

/** A compact status indicator that redraws itself per state: spinning arc, tick, exclamation or cross. Changes are announced through a live region (errors assertively). */
export default function StatusMark({ status = 'idle', label, iconOnly = false, size = 36, className = '' }: StatusMarkProps) {
  const text = label ?? DEFAULT_LABEL[status];
  return (
    <span className={`ui-status-mark ${className}`.trim()} data-status={status} style={{ ['--sm' as string]: `${size}px` }}>
      <svg key={status} className="ui-status-mark-svg" viewBox="0 0 36 36" width={size} height={size} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <circle className="ui-status-mark-disc" cx="18" cy="18" r="16" />
        <circle className="ui-status-mark-ring" cx="18" cy="18" r="16" pathLength={100} />
        {status === 'success' && <path className="ui-status-mark-glyph" d="M10.5 18.5 16 24l9.5-11" pathLength={1} />}
        {status === 'error' && <path className="ui-status-mark-glyph" d="M12 12l12 12M24 12 12 24" pathLength={1} />}
        {status === 'warning' && <><path className="ui-status-mark-glyph" d="M18 10.5v9" pathLength={1} /><circle className="ui-status-mark-dot" cx="18" cy="25.2" r="1.7" /></>}
        {status === 'idle' && <circle className="ui-status-mark-dot" cx="18" cy="18" r="3.2" />}
      </svg>
      {!iconOnly && <span className="ui-status-mark-text" aria-hidden="true">{text}</span>}
      <span className="ui-status-mark-sr" role={status === 'error' ? 'alert' : 'status'} aria-live={status === 'error' ? 'assertive' : 'polite'}>{text}</span>
    </span>
  );
}

const ORDER: MarkStatus[] = ['idle', 'loading', 'success', 'warning', 'error'];

export function Demo() {
  const [s, setS] = useState<MarkStatus>('success');
  return (
    <div className="ui-status-mark-stage">
      <div className="ui-status-mark-row">
        <StatusMark status={s} size={52} />
      </div>
      <div className="ui-status-mark-pick" role="group" aria-label="Choose a status">
        {ORDER.map((o) => (
          <button key={o} type="button" className="ui-status-mark-chip" aria-pressed={s === o} onClick={() => setS(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}
