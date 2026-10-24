'use client';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './_d2';

export interface NeonSendButtonProps {
  label?: string;
  sentLabel?: string;
  /** ms before the button returns to its idle state. 0 keeps it on "Sent". */
  resetAfter?: number;
  onSend?: () => void;
  className?: string;
}

export default function NeonSendButton({ label = 'Send', sentLabel = 'Sent', resetAfter = 2400, onSend, className = '' }: NeonSendButtonProps) {
  const [sent, setSent] = useState(false);
  const [flying, setFlying] = useState(false);
  const reduced = useReducedMotion();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const click = () => {
    if (sent || flying) return;
    onSend?.();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (reduced) { setSent(true); } else {
      setFlying(true);
      timers.current.push(setTimeout(() => { setFlying(false); setSent(true); }, 650));
    }
    if (resetAfter > 0) timers.current.push(setTimeout(() => setSent(false), (reduced ? 0 : 650) + resetAfter));
  };

  return (
    <button type="button" className={`ui-neon-send-button ${className}`.trim()} onClick={click}
      data-state={sent ? 'sent' : flying ? 'flying' : 'idle'} aria-disabled={flying || undefined}>
      <span className="ui-neon-send-button-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path className="ui-neon-send-button-plane" d="M21 3L10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3z" />
        </svg>
      </span>
      <span className="ui-neon-send-button-text">{sent ? sentLabel : label}</span>
      <span className="ui-neon-send-button-sr" role="status" aria-live="polite">{sent ? sentLabel : ''}</span>
    </button>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <NeonSendButton label="Send message" />
    </div>
  );
}
