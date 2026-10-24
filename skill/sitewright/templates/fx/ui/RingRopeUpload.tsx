'use client';
import { useRef, useState } from 'react';
import { useFakeRun, useReducedMotion } from './_d2';

export interface RingRopeUploadProps {
  /** Name shown on the file chip when no real file is picked. */
  fileName?: string;
  /** When true the button opens a native file picker and uses the picked file name. */
  pick?: boolean;
  accept?: string;
  onFile?: (file: File) => void;
  className?: string;
}

const R = 22;
const L = 2 * Math.PI * R; // ring circumference == bar length
const X0 = 40 - R;
const short = (s: string) => (s.length > 12 ? `${s.slice(0, 9)}...${s.slice(s.lastIndexOf('.'))}`.slice(0, 13) : s);

export default function RingRopeUpload({ fileName = 'report.pdf', pick = false, accept, onFile, className = '' }: RingRopeUploadProps) {
  const run = useFakeRun(3000);
  const reduced = useReducedMotion();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(fileName);
  const idle = run.state === 'idle';
  const done = run.state === 'done';
  const busy = run.state === 'running';

  const begin = (n: string) => { setName(n); run.start(); };
  const press = () => {
    if (busy) return;
    if (done) { run.reset(); return; }
    if (pick) input.current?.click(); else begin(fileName);
  };
  const status = idle ? 'Press to upload a file' : busy ? `Uploading ${run.p}%` : `${name} uploaded`;
  const label = idle ? 'Upload file' : busy ? `Uploading, ${run.p} percent` : `${name} uploaded. Activate to reset`;

  return (
    <div className={`ui-ring-rope-upload ${className}`.trim()} data-phase={run.state}>
      {pick && <input ref={input} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { onFile?.(f); begin(f.name); } e.target.value = ''; }} />}
      {reduced ? (
        <div className="ui-ring-rope-upload-simple">
          <button type="button" className="ui-ring-rope-upload-btn" onClick={press} aria-label={label} aria-disabled={busy || undefined}>
            {idle ? 'Choose file' : busy ? 'Uploading...' : 'Done - upload another'}
          </button>
          <div className="ui-ring-rope-upload-simplebar" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={run.p}>
            <i style={{ width: `${run.p}%` }} />
          </div>
        </div>
      ) : (
        <div className="ui-ring-rope-upload-stage">
          <svg viewBox="0 0 260 100" className="ui-ring-rope-upload-svg" aria-hidden="true">
            <g className="ui-ring-rope-upload-bar">
              <line className="ui-ring-rope-upload-track" x1={X0} y1="50" x2={X0 + L} y2="50" strokeDasharray={L} strokeDashoffset={idle ? L : 0} />
              <line className="ui-ring-rope-upload-fill" x1={X0} y1="50" x2={X0 + L} y2="50" strokeDasharray={L} strokeDashoffset={L * (1 - run.p / 100)} />
            </g>
            <circle className="ui-ring-rope-upload-ring" cx="40" cy="50" r={R} strokeDasharray={L} strokeDashoffset={idle ? 0 : L} transform="rotate(180 40 50)" />
            <path className="ui-ring-rope-upload-arrow" d="M40 58V42m0 0l-6 6m6-6l6 6" />
            <g className="ui-ring-rope-upload-chipx"><g className="ui-ring-rope-upload-chipy">
              <rect x="178" y="38" width="76" height="24" rx="8" />
              <text x="216" y="54" textAnchor="middle">{short(name)}</text>
            </g></g>
            <circle className="ui-ring-rope-upload-okc" cx="40" cy="50" r="13" />
            <path className="ui-ring-rope-upload-ok" d="M33.5 50.5l4.5 4.5 8.5-9.5" pathLength={1} />
          </svg>
          <button type="button" className="ui-ring-rope-upload-hit" onClick={press} aria-label={label} aria-disabled={busy || undefined} />
        </div>
      )}
      <p className="ui-ring-rope-upload-status" role="status" aria-live="polite">{busy && run.p % 25 !== 0 ? '' : status}</p>
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <RingRopeUpload />
    </div>
  );
}
