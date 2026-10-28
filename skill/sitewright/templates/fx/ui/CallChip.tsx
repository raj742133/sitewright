'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cx, useControlled } from './_micro-a';

export type CallState = 'idle' | 'calling' | 'connected' | 'ended';
export interface CallChipProps {
  /** Person or line being called. */
  name?: string;
  /** Secondary line while idle (role, number...). */
  detail?: string;
  /** Controlled call state. */
  state?: CallState;
  defaultState?: CallState;
  onStateChange?: (s: CallState) => void;
  /** Milliseconds of ringing before the call counts as connected. 0 = never auto-connect (drive `state` yourself). */
  connectAfter?: number;
  onCall?: () => void;
  onEnd?: (seconds: number) => void;
  className?: string;
  style?: CSSProperties;
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
const P = (p: { d: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={p.d} /></svg>
);
const PHONE = 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z';
const HANGUP = 'M3 15c5-4 13-4 18 0l-1 3-4-1.5v-2.5a10 10 0 0 0-8 0V16.5L4 18z';
const MIC = 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4';

/** A compact pill for placing a call: ring animation while calling, a live timer once connected, mute and hang-up controls, then a short "ended" summary. */
export default function CallChip({ name = 'Ada Moreno', detail = 'Design review', state, defaultState = 'idle', onStateChange, connectAfter = 2200, onCall, onEnd, className, style }: CallChipProps) {
  const [st, setSt] = useControlled<CallState>(state, defaultState, onStateChange);
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const last = useRef(0);
  const endCb = useRef(onEnd);
  useEffect(() => { endCb.current = onEnd; });

  useEffect(() => {
    if (st === 'calling' && connectAfter > 0) { const t = setTimeout(() => setSt('connected'), connectAfter); return () => clearTimeout(t); }
    if (st === 'connected') { setSecs(0); const t0 = Date.now(); const t = setInterval(() => { last.current = Math.floor((Date.now() - t0) / 1000); setSecs(last.current); }, 500); return () => clearInterval(t); }
    if (st === 'ended') { const t = setTimeout(() => { setSt('idle'); setMuted(false); }, 2400); return () => clearTimeout(t); }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st, connectAfter]);

  const start = () => { last.current = 0; setSecs(0); onCall?.(); setSt('calling'); };
  const end = () => { const s = st === 'connected' ? last.current : 0; endCb.current?.(s); setSt('ended'); };
  const status = st === 'idle' ? detail : st === 'calling' ? 'Calling…' : st === 'connected' ? (muted ? `${fmt(secs)} · muted` : fmt(secs)) : `Call ended · ${fmt(last.current)}`;
  const live = st !== 'idle';

  return (
    <div className={cx('ui-call-chip', className)} data-state={st} style={style} role="group" aria-label={`Call ${name}`}>
      <span className="ui-call-chip-avatar" aria-hidden="true">
        <span className="ui-call-chip-ring" /><span className="ui-call-chip-ring" />
        <span className="ui-call-chip-face">{initials(name)}</span>
      </span>
      <span className="ui-call-chip-info">
        <span className="ui-call-chip-name">{name}</span>
        <span className="ui-call-chip-status" role="status" aria-live="polite">{live ? status : <span>{detail}</span>}</span>
      </span>
      {st === 'connected' && (
        <button type="button" className="ui-call-chip-btn" aria-pressed={muted} aria-label="Mute microphone" onClick={() => setMuted(!muted)}>
          <P d={MIC} />{muted && <span className="ui-call-chip-slash" aria-hidden="true" />}
        </button>
      )}
      {st === 'idle' && <button type="button" className="ui-call-chip-btn is-call" aria-label={`Call ${name}`} onClick={start}><P d={PHONE} /></button>}
      {(st === 'calling' || st === 'connected') && <button type="button" className="ui-call-chip-btn is-end" aria-label={`End call with ${name}`} onClick={end}><P d={HANGUP} /></button>}
      {st === 'ended' && <span className="ui-call-chip-btn is-done" aria-hidden="true"><P d="M5 12l5 5L20 7" /></span>}
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-call-chip-demo">
      <CallChip />
      <CallChip name="Sam Okafor" detail="Support line" connectAfter={3200} />
    </div>
  );
}
