'use client';
import { useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion } from './_t2';
import { useLoop } from './_text-a-kit';

export interface CircularTextProps {
  /** The phrase set around the ring; it repeats (with a dot between) until the ring is full. */
  text?: string;
  /** Seconds for one turn. */
  duration?: number;
  /** Turn the other way. */
  reverse?: boolean;
  /** What pointer hover (or focus inside) does to the spin. */
  hover?: 'speed-up' | 'slow-down' | 'reverse' | 'pause' | 'none';
  /** Content in the middle of the ring; pass null for an empty centre. */
  children?: ReactNode;
  /** Ring diameter, CSS length. Defaults to filling the smaller side of the parent. */
  size?: number | string;
  className?: string;
  style?: CSSProperties;
}

const HOVER_SPEED = { 'speed-up': 3.2, 'slow-down': 0.18, reverse: -1, pause: 0, none: 1 } as const;

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="40%" height="40%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

/** Text set around a circle that turns slowly. Hover (or keyboard focus on something inside) can speed it up, slow it, reverse it or pause it; it never spins under reduced motion. */
export default function CircularText({ text = 'Build the web your way', duration = 22, reverse = false, hover = 'slow-down', children, size, className, style }: CircularTextProps) {
  const id = useId().replace(/:/g, '');
  const ring = useRef<SVGGElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [over, setOver] = useState(false);
  const s = useRef({ angle: 0, v: 1 });
  const dir = reverse ? -1 : 1;

  useLoop(root, (_t, dt) => {
    const k = s.current;
    const target = over ? HOVER_SPEED[hover] : 1;
    k.v += (target - k.v) * Math.min(1, dt * 4);
    k.angle = (k.angle + (360 / Math.max(1, duration)) * dir * k.v * dt) % 360;
    ring.current?.setAttribute('transform', `rotate(${k.angle.toFixed(2)} 100 100)`);
  }, !reduced);

  const unit = text.trim() || ' ';
  const reps = Math.max(1, Math.ceil(30 / (unit.length + 3)));
  const R = 78;
  const parts: ReactNode[] = [];
  for (let i = 0; i < reps; i++) {
    parts.push(<tspan key={'t' + i}>{unit}</tspan>);
    parts.push(<tspan key={'d' + i} className="ui-circular-text-dot" dx="0.5em" dy="0">{'●'}</tspan>);
  }
  const circ = 2 * Math.PI * R;
  const dim = size ?? 'min(100cqw, 100cqh)';
  return (
    <div ref={root} className={`ui-circular-text-root ${className ?? ''}`} style={style}
      onPointerEnter={() => setOver(true)} onPointerLeave={() => setOver(false)}
      onFocusCapture={() => setOver(true)} onBlurCapture={() => setOver(false)}>
      <div className="ui-circular-text-ring" style={{ width: dim, height: dim }}>
        <svg viewBox="0 0 200 200" role="img" aria-label={text} focusable="false">
          <circle cx="100" cy="100" r="96" className="ui-circular-text-edge" />
          <circle cx="100" cy="100" r="60" className="ui-circular-text-edge ui-circular-text-inner" />
          <g ref={ring}>
            <defs><path id={`ui-circ-${id}`} d={`M100 ${100 - R} a${R} ${R} 0 1 1 0 ${2 * R} a${R} ${R} 0 1 1 0 ${-2 * R}`} /></defs>
            <text className="ui-circular-text-type" aria-hidden="true">
              <textPath href={`#ui-circ-${id}`} textLength={circ - 2} lengthAdjust="spacing">{parts}</textPath>
            </text>
          </g>
        </svg>
        {children !== null && <div className="ui-circular-text-center">{children ?? <span className="ui-circular-text-disc"><Arrow /></span>}</div>}
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-circular-text-stage">
      <CircularText text="Design in motion" duration={24} hover="slow-down" size="min(100cqw, 100cqh, 280px)" />
    </div>
  );
}
