'use client';
import { useEffect, useState } from 'react';

export interface NeumorphicPlayButtonProps {
  playing?: boolean;
  defaultPlaying?: boolean;
  onChange?: (playing: boolean) => void;
  /** Seconds the visual progress ring takes to fill (visual only, no audio). */
  duration?: number;
  title?: string;
  className?: string;
}

const R = 46;
const C = 2 * Math.PI * R;

export default function NeumorphicPlayButton({ playing, defaultPlaying = false, onChange, duration = 24, title = 'Playback', className = '' }: NeumorphicPlayButtonProps) {
  const [inner, setInner] = useState(defaultPlaying);
  const on = playing ?? inner;
  const [p, setP] = useState(0);

  useEffect(() => {
    if (!on) return;
    const step = 200;
    const id = setInterval(() => setP((v) => (v + step / (duration * 1000) >= 1 ? 0 : v + step / (duration * 1000))), step);
    return () => clearInterval(id);
  }, [on, duration]);

  const toggle = () => {
    const next = !on;
    if (playing === undefined) setInner(next);
    onChange?.(next);
  };

  return (
    <button type="button" className={`ui-neumorphic-play-button ${className}`.trim()} onClick={toggle}
      aria-pressed={on} aria-label={`${on ? 'Pause' : 'Play'} ${title}`} data-playing={on || undefined}>
      <svg className="ui-neumorphic-play-button-ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ui-neumorphic-play-button-track" cx="50" cy="50" r={R} />
        <circle className="ui-neumorphic-play-button-arc" cx="50" cy="50" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - p)} transform="rotate(-90 50 50)" />
      </svg>
      <span className="ui-neumorphic-play-button-face" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="30" height="30" className="ui-neumorphic-play-button-icon">
          <path className="ui-neumorphic-play-button-play" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
          <g className="ui-neumorphic-play-button-pause">
            <rect x="6.5" y="5" width="3.8" height="14" rx="1.4" />
            <rect x="13.7" y="5" width="3.8" height="14" rx="1.4" />
          </g>
        </svg>
      </span>
      <span className="ui-neumorphic-play-button-eq" aria-hidden="true"><i /><i /><i /></span>
    </button>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', background: 'var(--raised, transparent)' }}>
      <NeumorphicPlayButton defaultPlaying title="demo track" />
    </div>
  );
}
