'use client';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useCoarsePointer, useReducedMotion, watchLive } from './_t2';

export interface GlareHoverProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Strength of the glare, 0 to 1. */
  intensity?: number;
  /** Sweep duration in ms. */
  duration?: number;
  /** Fixed sweep angle in degrees (0 = left to right). Leave unset to sweep away from the edge the pointer entered by. */
  angle?: number;
  /** Colour of the glare. Use a dark colour on light surfaces. */
  color?: string;
  /** Replay the sweep on a timer when there is no pointer (touch screens). Seconds between sweeps; 0 turns it off. */
  idleEvery?: number;
}

/** A glossy band sweeps across whatever it wraps, away from the edge the pointer came in by. Keyboard focus inside and taps replay it, and on touch screens it plays on a timer. With reduced motion it becomes a static soft highlight. Wraps content; never touches the page cursor. */
export default function GlareHover({ children, className, style, intensity = 0.5, duration = 850, angle, color = '#ffffff', idleEvery = 5 }: GlareHoverProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();

  useEffect(() => {
    const root = rootRef.current, band = bandRef.current;
    if (!root || !band) return;
    let anim: Animation | null = null, timer = 0, live = true;
    const sweep = (dx: number, dy: number) => {
      if (reduced) return;
      const r = root.getBoundingClientRect();
      const diag = Math.hypot(r.width, r.height);
      const len = Math.hypot(dx, dy) || 1;
      const ux = angle === undefined ? dx / len : Math.cos((angle * Math.PI) / 180);
      const uy = angle === undefined ? dy / len : Math.sin((angle * Math.PI) / 180);
      const deg = (Math.atan2(uy, ux) * 180) / Math.PI;
      band.style.width = (diag * 0.55).toFixed(0) + 'px'; band.style.height = (diag * 2).toFixed(0) + 'px';
      anim?.cancel();
      const d = diag * 0.75 + diag * 0.275;
      anim = band.animate([
        { transform: `translate(${(ux * d).toFixed(1)}px, ${(uy * d).toFixed(1)}px) rotate(${deg.toFixed(1)}deg)`, opacity: 0 },
        { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 },
        { transform: `translate(${(-ux * d).toFixed(1)}px, ${(-uy * d).toFixed(1)}px) rotate(${deg.toFixed(1)}deg)`, opacity: 0 },
      ], { duration, easing: 'cubic-bezier(.3,.1,.2,1)' });
    };
    const fromPointer = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      sweep(((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2);
    };
    const onEnter = (e: PointerEvent) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') fromPointer(e); };
    const onDown = (e: PointerEvent) => { if (e.pointerType === 'touch') fromPointer(e); };
    const onFocus = () => sweep(-1, -0.6);
    root.addEventListener('pointerenter', onEnter); root.addEventListener('pointerdown', onDown); root.addEventListener('focusin', onFocus);
    const off = watchLive(root, (v) => { live = v; });
    if (coarse && idleEvery > 0 && !reduced) {
      timer = window.setInterval(() => { if (live) sweep(-1, -0.6); }, idleEvery * 1000);
      const first = window.setTimeout(() => { if (live) sweep(-1, -0.6); }, 700);
      return () => { clearInterval(timer); clearTimeout(first); anim?.cancel(); off(); root.removeEventListener('pointerenter', onEnter); root.removeEventListener('pointerdown', onDown); root.removeEventListener('focusin', onFocus); };
    }
    return () => { anim?.cancel(); off(); root.removeEventListener('pointerenter', onEnter); root.removeEventListener('pointerdown', onDown); root.removeEventListener('focusin', onFocus); };
  }, [reduced, coarse, duration, angle, idleEvery]);

  const vars = { '--ui-glare-a': String(Math.max(0, Math.min(1, intensity))), '--ui-glare-c': color, ...style } as CSSProperties;
  return (
    <div ref={rootRef} className={`ui-glare-hover-root${reduced ? ' ui-glare-hover-still' : ''} ${className ?? ''}`} style={vars}>
      {children}
      <span className="ui-glare-hover-clip" aria-hidden="true"><span ref={bandRef} className="ui-glare-hover-band" /><span className="ui-glare-hover-still-glow" /></span>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-glare-hover-demo">
      <GlareHover className="ui-glare-hover-demo-card" idleEvery={4}>
        <div className="ui-glare-hover-demo-body" tabIndex={0} role="group" aria-label="Aurora plan card">
          <span className="ui-glare-hover-demo-badge">Pro</span>
          <svg viewBox="0 0 120 60" aria-hidden="true" focusable="false" className="ui-glare-hover-demo-art">
            <circle cx="88" cy="22" r="14" className="ui-glare-hover-demo-sun" />
            <path d="M0 60 L0 44 L26 24 L46 40 L72 16 L102 48 L120 36 L120 60Z" className="ui-glare-hover-demo-hill" />
          </svg>
          <strong>Aurora plan</strong>
          <span>Glints sweep in from the side you enter.</span>
        </div>
      </GlareHover>
    </div>
  );
}
