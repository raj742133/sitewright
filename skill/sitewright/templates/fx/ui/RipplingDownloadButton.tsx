'use client';
import { useState } from 'react';
import { useFakeRun } from './_d2';

export interface RipplingDownloadButtonProps {
  label?: string;
  doneLabel?: string;
  onDownload?: () => void;
  className?: string;
}

const R = 11;
const C = 2 * Math.PI * R;

export default function RipplingDownloadButton({ label = 'Download', doneLabel = 'Downloaded', onDownload, className = '' }: RipplingDownloadButtonProps) {
  const run = useFakeRun(2400);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [seq, setSeq] = useState(0);
  const busy = run.state === 'running';
  const done = run.state === 'done';

  const click = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const keyboard = e.detail === 0;
    const x = keyboard ? r.width / 2 : e.clientX - r.left;
    const y = keyboard ? r.height / 2 : e.clientY - r.top;
    const id = seq + 1;
    setSeq(id);
    setRipples((l) => [...l.slice(-3), { id, x, y }]);
    if (busy) return;
    if (done) { run.reset(); return; }
    onDownload?.();
    run.start();
  };

  return (
    <button type="button" className={`ui-rippling-download-button ${className}`.trim()} onClick={click}
      data-state={run.state} aria-disabled={busy || undefined}
      aria-label={busy ? `Downloading, ${run.p} percent` : done ? `${doneLabel}. Activate to reset` : label}>
      <span className="ui-rippling-download-button-ripples" aria-hidden="true">
        {ripples.map((r) => (
          <i key={r.id} style={{ left: r.x, top: r.y }} onAnimationEnd={() => setRipples((l) => l.filter((q) => q.id !== r.id))} />
        ))}
      </span>
      <svg className="ui-rippling-download-button-icon" viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <g className="ui-rippling-download-button-idle">
          <g className="ui-rippling-download-button-arrow"><path d="M14 5v12m0 0l-4.5-4.5M14 17l4.5-4.5" /></g>
          <path d="M6 18v2.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5V18" />
        </g>
        <g className="ui-rippling-download-button-prog">
          <circle cx="14" cy="14" r={R} strokeWidth="2" opacity=".25" />
          <circle cx="14" cy="14" r={R} strokeWidth="2.4" strokeDasharray={C} strokeDashoffset={C * (1 - run.p / 100)} transform="rotate(-90 14 14)" />
        </g>
        <path className="ui-rippling-download-button-check" d="M7.5 14.5l4.5 4.5 8.5-9.5" pathLength={1} />
      </svg>
      <span className="ui-rippling-download-button-text" aria-hidden="true">{done ? doneLabel : busy ? `${run.p}%` : label}</span>
      <span className="ui-rippling-download-button-sr" role="status" aria-live="polite">{done ? doneLabel : ''}</span>
    </button>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <RipplingDownloadButton label="Download report" doneLabel="Saved" />
    </div>
  );
}
