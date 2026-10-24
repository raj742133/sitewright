'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from './_d5';

export interface OrbitingAccentsProps {
  /** Centre content (default: a "Pro" badge). */
  children?: ReactNode;
  /** Square size in px. */
  size?: number;
  /** Seconds per turn at rest (outer ring; the inner ring is faster). */
  period?: number;
  className?: string;
}

const SHAPES: Array<{ ring: 0 | 1; angle: number; kind: 'dot' | 'diamond' | 'ring' | 'bar'; color: string }> = [
  { ring: 0, angle: 0, kind: 'dot', color: 'var(--primary, #2563eb)' },
  { ring: 0, angle: 120, kind: 'diamond', color: 'var(--signal, #7c3aed)' },
  { ring: 0, angle: 240, kind: 'ring', color: 'var(--ok, #16a34a)' },
  { ring: 1, angle: 60, kind: 'bar', color: 'var(--critical, #dc2626)' },
  { ring: 1, angle: 240, kind: 'dot', color: 'var(--ink, #111)' },
];

/** Small shapes orbit a badge and smoothly speed up on hover, focus or tap. */
export default function OrbitingAccents({ children, size = 150, period = 12, className }: OrbitingAccentsProps) {
  const root = useRef<HTMLDivElement>(null);
  const rings = useRef<Array<HTMLDivElement | null>>([]);
  const target = useRef(1);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pressed, setPressed] = useState(false);
  const fast = hover || focus || pressed;
  const reduced = useReducedMotion();
  const anims = useRef<Animation[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el || reduced) return;
    const list = rings.current.flatMap((r, i) => (r && r.animate
      ? [r.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${i === 0 ? 360 : -360}deg)` }], { duration: period * 1000 * (i === 0 ? 1 : 0.62), iterations: Infinity })]
      : []));
    anims.current = list;
    let rate = 1, raf = 0, visible = true;
    const loop = () => {
      raf = 0;
      rate += (target.current - rate) * 0.1;
      if (Math.abs(target.current - rate) < 0.02) rate = target.current;
      list.forEach((a) => { a.playbackRate = rate; });
      if (rate !== target.current && visible) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && visible) raf = requestAnimationFrame(loop); };
    target.current = 1;
    const wake = () => kick();
    el.addEventListener('ui-orbit-speed', wake);
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      list.forEach((a) => (visible && !document.hidden ? a.play() : a.pause()));
      if (visible) kick();
    });
    io.observe(el);
    const vis = () => list.forEach((a) => (document.hidden || !visible ? a.pause() : a.play()));
    document.addEventListener('visibilitychange', vis);
    return () => {
      cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', vis);
      el.removeEventListener('ui-orbit-speed', wake); list.forEach((a) => a.cancel()); anims.current = [];
    };
  }, [reduced, period]);

  useEffect(() => {
    target.current = fast ? 5 : 1;
    root.current?.dispatchEvent(new Event('ui-orbit-speed'));
  }, [fast]);

  return (
    <div ref={root} className={`ui-orbiting-accents-root ${className ?? ''}`} style={{ width: size, height: size }} tabIndex={0} role="button" aria-pressed={pressed}
      aria-label="Badge with orbiting accents. Press to toggle faster orbit."
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') setHover(true); }} onPointerLeave={() => setHover(false)}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} onClick={() => setPressed((v) => !v)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPressed((v) => !v); } }}>
      {[0, 1].map((ri) => (
        <div key={ri} ref={(n) => { rings.current[ri] = n; }} className="ui-orbiting-accents-ring" data-ring={ri} aria-hidden="true">
          {SHAPES.filter((s) => s.ring === ri).map((s, i) => (
            <span key={i} className="ui-orbiting-accents-arm" style={{ transform: `rotate(${s.angle}deg)` }}>
              <span className={`ui-orbiting-accents-shape ui-orbiting-accents-${s.kind === 'ring' ? 'hoop' : s.kind}`} style={{ ['--c' as string]: s.color }} />
            </span>
          ))}
        </div>
      ))}
      <div className="ui-orbiting-accents-core">{children ?? (
        <><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 2l2.6 6.9 7.4.5-5.7 4.7 1.9 7.2L12 17.4 5.8 21.3l1.9-7.2L2 9.4l7.4-.5z" fill="currentColor" /></svg><strong>Pro</strong></>
      )}</div>
    </div>
  );
}

export function Demo() {
  return <div style={{ display: 'grid', placeItems: 'center', height: 150 }}><OrbitingAccents size={146} /></div>;
}
