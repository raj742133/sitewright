'use client';
import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { useCoarsePointer, useDamped, useReducedMotion } from './_t2';

export interface TiltCard3dProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  /** Maximum tilt in degrees. */
  maxTilt?: number;
  /** CSS height of the scene (default fills the parent, min 140px). */
  height?: number | string;
  /** Replaces the default illustration layer. */
  children?: ReactNode;
  className?: string;
}

function Art() {
  return (
    <svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <circle cx="140" cy="38" r="26" className="ui-tilt-card-3d-sun" />
      <ellipse cx="140" cy="38" rx="42" ry="8" className="ui-tilt-card-3d-ring" transform="rotate(-18 140 38)" />
      <path d="M0 100 L0 74 L36 46 L62 68 L96 34 L140 76 L170 58 L200 80 L200 100Z" className="ui-tilt-card-3d-hill" />
    </svg>
  );
}

/** A card that tilts toward the pointer with depth layers, a moving glare and a shifting shadow. Arrow keys tilt it, Home resets. Touch screens get an idle sway. */
export default function TiltCard3d({ title = 'Aurora Pass', subtitle = 'Move across the card', badge = 'New', maxTilt = 14, height, children, className }: TiltCard3dProps) {
  const ref = useRef<HTMLDivElement>(null);
  const coarse = useCoarsePointer();
  const reduced = useReducedMotion();
  const drive = useDamped(ref, (x, y) => {
    const el = ref.current;
    if (!el) return;
    const st = el.style;
    st.setProperty('--ry', x.toFixed(2) + 'deg');
    st.setProperty('--rx', y.toFixed(2) + 'deg');
    st.setProperty('--gx', (50 + (x / maxTilt) * 50).toFixed(1) + '%');
    st.setProperty('--gy', (50 - (y / maxTilt) * 50).toFixed(1) + '%');
    st.setProperty('--sx', (-x * 1.1).toFixed(1) + 'px');
    st.setProperty('--sy', (y * 1.1).toFixed(1) + 'px');
  }, { sway: coarse && !reduced, instant: reduced });

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (coarse || e.pointerType === 'touch' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    drive.set(nx * maxTilt, -ny * maxTilt);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const { x, y } = drive.get();
    const step = maxTilt / 2;
    const c = (v: number) => Math.max(-maxTilt, Math.min(maxTilt, v));
    if (e.key === 'ArrowLeft') drive.set(c(x - step), y);
    else if (e.key === 'ArrowRight') drive.set(c(x + step), y);
    else if (e.key === 'ArrowUp') drive.set(x, c(y + step));
    else if (e.key === 'ArrowDown') drive.set(x, c(y - step));
    else if (e.key === 'Home' || e.key === 'Escape') drive.set(0, 0);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={ref} className={`ui-tilt-card-3d-root ${className ?? ''}`} style={{ height: height ?? '100%' }} tabIndex={0} role="group"
      aria-label={`${title}, ${subtitle}. A card that tilts toward the pointer; arrow keys tilt it and Home resets.`}
      onPointerMove={onMove} onPointerLeave={() => drive.set(0, 0)} onKeyDown={onKey}>
      <div className="ui-tilt-card-3d-shadow" />
      <div className="ui-tilt-card-3d-card">
        <div className="ui-tilt-card-3d-face"><div className="ui-tilt-card-3d-glare" /></div>
        <div className="ui-tilt-card-3d-art">{children ?? <Art />}</div>
        <div className="ui-tilt-card-3d-title"><strong>{title}</strong><span>{subtitle}</span></div>
        <span className="ui-tilt-card-3d-badge">{badge}</span>
      </div>
    </div>
  );
}

export function Demo() {
  return <TiltCard3d />;
}
