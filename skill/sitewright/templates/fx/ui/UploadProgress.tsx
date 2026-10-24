'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent, type ChangeEvent } from 'react';

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadProgressProps {
  /** Called with the picked/dropped file (nothing is uploaded). */
  onFile?: (file: File) => void;
  /** Fake progress over ~3 s after a file is chosen (default true). A file name containing "fail" simulates an error. */
  simulate?: boolean;
  /** Controlled progress, 0-100. */
  progress?: number;
  /** Controlled status. */
  status?: UploadStatus;
  /** Optional name shown when controlled and no file was picked. */
  fileName?: string;
  accept?: string;
}

const X0 = 26, Y0 = 62, X1 = 196, Y1 = 36, LIFT = 34;

function ballAt(t: number) {
  return { x: X0 + (X1 - X0) * t, y: Y0 + (Y1 - Y0) * t - 4 * LIFT * t * (1 - t) };
}

export default function UploadProgress({
  onFile,
  simulate = true,
  progress,
  status,
  fileName,
  accept,
}: UploadProgressProps) {
  const [file, setFile] = useState<File | null>(null);
  const [innerP, setInnerP] = useState(0);
  const [innerS, setInnerS] = useState<UploadStatus>('idle');
  const [drag, setDrag] = useState(false);
  const [say, setSay] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStep = useRef(0);
  const lastStatus = useRef<UploadStatus>('idle');

  const p = Math.max(0, Math.min(100, progress ?? innerP));
  const st: UploadStatus =
    status ?? (progress !== undefined ? (p >= 100 ? 'success' : p > 0 ? 'uploading' : innerS) : innerS);
  const name = file?.name ?? fileName ?? 'Selected file';

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  const run = useCallback(
    (f: File) => {
      stop();
      lastStep.current = 0;
      setInnerP(0);
      setInnerS('uploading');
      if (!simulate) return;
      const failAt = /fail|error/i.test(f.name) ? 68 : -1;
      const start = Date.now();
      timer.current = setInterval(() => {
        const k = Math.min(1, (Date.now() - start) / 3000);
        const v = Math.round((k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2) * 100);
        if (failAt >= 0 && v >= failAt) {
          stop();
          setInnerP(failAt);
          setInnerS('error');
          return;
        }
        setInnerP(v);
        if (v >= 100) {
          stop();
          setInnerS('success');
        }
      }, 50);
    },
    [simulate, stop],
  );

  const take = (f: File | undefined | null) => {
    if (!f) return;
    setFile(f);
    onFile?.(f);
    run(f);
  };
  const reset = () => {
    stop();
    setFile(null);
    setInnerP(0);
    setInnerS('idle');
    if (input.current) input.current.value = '';
  };

  useEffect(() => {
    if (st === 'uploading') {
      const step = Math.floor(p / 25);
      if (step > lastStep.current && p < 100) {
        lastStep.current = step;
        setSay(`${name}: ${step * 25}% uploaded`);
      }
    }
    if (st !== lastStatus.current) {
      if (st === 'success') setSay(`${name} uploaded successfully`);
      else if (st === 'error') setSay(`Upload of ${name} failed. Retry available`);
      else if (st === 'idle' && lastStatus.current !== 'idle') setSay('Upload cancelled');
      lastStatus.current = st;
    }
  }, [p, st, name]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    take(e.dataTransfer.files?.[0]);
  };

  const t = st === 'error' ? Math.min(p, 100) / 100 : p / 100;
  const ball = ballAt(Math.max(0, Math.min(1, st === 'success' ? 1 : t)));
  const fallen = st === 'error';
  const dropY = st === 'success' ? 16 : fallen ? 68 - ball.y : 0;

  return (
    <div className="ui-upload-progress" data-status={st}>
      <input
        ref={input}
        type="file"
        accept={accept}
        tabIndex={-1}
        hidden
        onChange={(e: ChangeEvent<HTMLInputElement>) => take(e.target.files?.[0])}
      />
      <span className="ui-upload-progress-live" role="status" aria-live="polite">{say}</span>
      {st === 'idle' ? (
        <button
          type="button"
          className="ui-upload-progress-drop"
          data-drag={drag || undefined}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V5M7 9l5-5 5 5M5 19h14" />
          </svg>
          <strong>Choose a file</strong>
          <span>or drop it here</span>
        </button>
      ) : (
        <>
          <svg className="ui-upload-progress-scene" viewBox="0 0 240 76" aria-hidden="true" focusable="false">
            <path d={`M${X0} ${Y0} Q ${(X0 + X1) / 2} ${Y0 - 2 * LIFT + 6} ${X1} ${Y1}`} className="ui-upload-progress-trail" />
            <line x1="6" y1="70" x2="234" y2="70" className="ui-upload-progress-floor" />
            <g className={`ui-upload-progress-hoop${fallen ? ' is-shake' : ''}`}>
              <path d="M178 38 L184 60 M188 39 L190 61 M198 39 L198 62 M208 39 L206 61 M218 38 L212 60 M181 48 H215 M184 56 H212" className="ui-upload-progress-net" />
              <ellipse cx="198" cy="36" rx="22" ry="5" className="ui-upload-progress-rim" />
              {st === 'success' && (
                <>
                  <ellipse cx="198" cy="40" rx="22" ry="5" className="ui-upload-progress-ripple" />
                  <ellipse cx="198" cy="40" rx="22" ry="5" className="ui-upload-progress-ripple is-2" />
                </>
              )}
            </g>
            <g style={{ transform: `translate(${ball.x}px, ${ball.y + dropY}px)` }} className={`ui-upload-progress-ball${fallen ? ' is-fall' : ''}`}>
              <circle r="7" className="ui-upload-progress-ballfill" />
              <path d="M-7 0 H7 M0 -7 V7" className="ui-upload-progress-seam" />
            </g>
          </svg>
          <div className="ui-upload-progress-row">
            <span className="ui-upload-progress-name" title={name}>{name}</span>
            <span className="ui-upload-progress-pct">{st === 'success' ? 'Done' : st === 'error' ? 'Failed' : `${Math.round(p)}%`}</span>
          </div>
          <div
            className="ui-upload-progress-bar"
            role="progressbar"
            aria-label={`Upload progress for ${name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(p)}
          >
            <span style={{ width: `${p}%` }} />
          </div>
          <div className="ui-upload-progress-actions">
            {st === 'error' && (
              <button type="button" className="ui-upload-progress-btn is-main" onClick={() => (file ? run(file) : reset())}>
                Retry
              </button>
            )}
            {st === 'success' ? (
              <button type="button" className="ui-upload-progress-btn" onClick={reset}>Upload another</button>
            ) : (
              <button type="button" className="ui-upload-progress-btn" onClick={reset}>Cancel</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ width: '100%', maxWidth: 260 }}>
      <UploadProgress />
    </div>
  );
}
