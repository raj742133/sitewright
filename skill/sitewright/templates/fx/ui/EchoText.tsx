'use client';
import { useState, type CSSProperties } from 'react';

export interface EchoTextProps {
  /** The text that echoes. */
  text?: string;
  /** Number of echoes. */
  count?: number;
  /** Seconds for one echo to travel and fade. */
  duration?: number;
  /** ripple: echoes swell outward from the text. trail: echoes slide away behind it. */
  mode?: 'ripple' | 'trail';
  /** How far echoes travel (ripple: extra scale in %, trail: px). */
  spread?: number;
  /** Hover or tap makes the echoes travel further. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Solid text followed by outlined echoes that keep leaving it and fading out. Hover or tap throws them further. Under reduced motion the echoes rest as a still, fading stack. */
export default function EchoText({ text = 'Echo', count = 5, duration = 3.2, mode = 'ripple', spread, interactive = true, className, style }: EchoTextProps) {
  const [hot, setHot] = useState(false);
  const n = Math.max(1, Math.min(10, Math.round(count)));
  const base = spread ?? (mode === 'ripple' ? 38 : 56);
  const reach = hot ? base * 1.7 : base;
  const echoes = [];
  for (let i = n; i >= 1; i--) {
    echoes.push(
      <span key={i} className="ui-echo-text-copy" style={{ ['--i' as string]: i, ['--t' as string]: i / n, ['--delay' as string]: `${(-(i - 1) * duration) / n}s` }}>{text}</span>,
    );
  }
  return (
    <div role="img" aria-label={text} className={`ui-echo-text-root ${className ?? ''}`} data-mode={mode} data-hot={hot || undefined}
      style={{ ['--reach' as string]: reach, ['--dur' as string]: `${duration}s`, ...style }}
      onPointerEnter={() => interactive && setHot(true)} onPointerLeave={() => setHot(false)}
      onPointerDown={(e) => { if (interactive && e.pointerType === 'touch') setHot((v) => !v); }}>
      <div className="ui-echo-text-scene" aria-hidden="true">
        {echoes}
        <span className="ui-echo-text-main">{text}</span>
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-echo-text-stage">
      <EchoText text="Echo" />
    </div>
  );
}
