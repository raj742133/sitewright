'use client';
import { useEffect, useRef, useState } from 'react';
import { usePrefs, useActive } from './_d6';

export interface HoverMarqueeProps {
  items?: string[];
  /** Idle drift speed in px per second (leftwards). */
  speed?: number;
  /** Speed in px per second while hovered (moves the other way). */
  hoverSpeed?: number;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULTS = ['Fresh roasted', 'Small batch', 'Single origin', 'Slow brewed', 'Roasted on Tuesdays'];

/** A ticker that drifts slowly, then speeds up and reverses while hovered. Focus pauses it; on touch, tap toggles the fast mode. Static with reduced motion. */
export default function HoverMarquee({ items = DEFAULTS, speed = 22, hoverSpeed = 150, className, style }: HoverMarqueeProps) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLUListElement>(null);
  const state = useRef({ hover: false, focus: false, tap: false });
  const { reduced, coarse } = usePrefs();
  const active = useActive(root);
  const [mode, setMode] = useState<'idle' | 'fast' | 'paused'>('idle');
  const sync = () => { const s = state.current; setMode(s.focus ? 'paused' : s.hover || s.tap ? 'fast' : 'idle'); };

  useEffect(() => {
    const t = track.current, g = group.current;
    if (reduced || !active || !t || !g) { if (t) t.style.transform = ''; return; }
    let x = 0, v = -speed, last = 0, raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      const s = state.current;
      const target = s.focus ? 0 : s.hover || s.tap ? hoverSpeed : -speed;
      v += (target - v) * Math.min(1, dt * 4);
      const w = g.offsetWidth || 1;
      x += v * dt;
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      t.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced, active, speed, hoverSpeed]);

  const list = (hidden: boolean) => (
    <ul ref={hidden ? undefined : group} className="ui-hover-marquee-group" aria-hidden={hidden || undefined} role={hidden ? 'presentation' : undefined}>
      {items.map((it, i) => (
        <li key={i} className="ui-hover-marquee-item"><span>{it}</span><i aria-hidden="true">✦</i></li>
      ))}
    </ul>
  );

  return (
    <div
      ref={root}
      className={`ui-hover-marquee${reduced ? ' is-static' : ''}${className ? ' ' + className : ''}`}
      style={style}
      role="region"
      aria-label="Highlights"
      tabIndex={0}
      data-mode={mode}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') { state.current.hover = true; sync(); } }}
      onPointerLeave={() => { state.current.hover = false; sync(); }}
      onFocus={() => { state.current.focus = true; sync(); }}
      onBlur={() => { state.current.focus = false; sync(); }}
      onClick={() => { if (coarse) { state.current.tap = !state.current.tap; sync(); } }}
    >
      <div ref={track} className="ui-hover-marquee-track">
        {list(false)}
        {!reduced && list(true)}
      </div>
      <span className="ui-hover-marquee-state" aria-live="polite">{mode === 'paused' ? 'Paused' : ''}</span>
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', gap: 10, width: '100%' }}>
      <HoverMarquee />
      <HoverMarquee items={['Hover to reverse', 'Focus to pause', 'Tap on touch']} speed={14} hoverSpeed={110} />
    </div>
  );
}
