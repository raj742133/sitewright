'use client';
import { useFakeRun, useReducedMotion } from './_d2';

export interface LiquidUploadButtonProps {
  /** 0..100. When omitted the button simulates an upload when clicked. */
  progress?: number;
  label?: string;
  doneLabel?: string;
  onClick?: () => void;
  className?: string;
}

const WAVE = 'M0 20 Q25 4 50 20 T100 20 T150 20 T200 20 V60 H0Z';

export default function LiquidUploadButton({ progress, label = 'Upload', doneLabel = 'Uploaded', onClick, className = '' }: LiquidUploadButtonProps) {
  const controlled = typeof progress === 'number';
  const run = useFakeRun(3000);
  const reduced = useReducedMotion();
  const value = Math.max(0, Math.min(100, controlled ? (progress as number) : run.p));
  const done = value >= 100;
  const busy = value > 0 && !done;
  const pct = Math.round(value);
  const live = done ? doneLabel : busy && pct % 25 === 0 ? `Uploading ${pct} percent` : '';

  const click = () => {
    onClick?.();
    if (controlled || busy) return;
    if (done) run.reset(); else run.start();
  };
  const text = done ? doneLabel : busy ? `${Math.round(value)}%` : label;
  const icon = done ? (
    <path d="M5 12.5l4.2 4.2L19 7" />
  ) : (
    <path d="M12 16V5m0 0l-4.5 4.5M12 5l4.5 4.5M5 19h14" />
  );
  const inner = (
    <span className="ui-liquid-upload-button-row">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
      <span className="ui-liquid-upload-button-text">{text}</span>
    </span>
  );
  return (
    <button type="button" className={`ui-liquid-upload-button ${className}`.trim()} onClick={click}
      data-state={done ? 'done' : busy ? 'busy' : 'idle'} data-reduced={reduced || undefined}
      aria-label={done ? `${doneLabel}. Activate to upload again` : busy ? `Uploading, ${Math.round(value)} percent` : label}
      aria-disabled={busy || undefined}>
      <span className="ui-liquid-upload-button-label" aria-hidden="true">{inner}</span>
      <span className="ui-liquid-upload-button-liquid" aria-hidden="true" style={{ transform: `translateY(${100 - value}%)`, opacity: value > 0 ? 1 : 0 }}>
        <svg className="ui-liquid-upload-button-wave ui-liquid-upload-button-wave-b" viewBox="0 0 200 60" preserveAspectRatio="none"><path d={WAVE} /></svg>
        <svg className="ui-liquid-upload-button-wave ui-liquid-upload-button-wave-a" viewBox="0 0 200 60" preserveAspectRatio="none"><path d={WAVE} /></svg>
        <span className="ui-liquid-upload-button-body" />
      </span>
      <span className="ui-liquid-upload-button-label ui-liquid-upload-button-label-on" aria-hidden="true" style={{ clipPath: `inset(${100 - value}% 0 0 0)` }}>{inner}</span>
      <span className="ui-liquid-upload-button-sr" role="status" aria-live="polite">{live}</span>
    </button>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', gap: 8, alignContent: 'center' }}>
      <LiquidUploadButton />
      <span style={{ fontSize: 11, color: 'var(--muted, #666)', fontFamily: 'var(--font-body, system-ui)' }}>Click to upload</span>
    </div>
  );
}
