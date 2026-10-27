'use client';
import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { useCoarsePointer, useDamped, useReducedMotion } from './_t2';

export interface Phone3dProps {
  /** Screen content. Defaults to a small drawn app UI. */
  children?: ReactNode;
  label?: string;
  className?: string;
}
const SLICES = 7;
const BASE = { x: -16, y: 8 };

function DefaultScreen() {
  return (
    <div className="ui-phone-3d-ui" aria-hidden="true">
      <div className="ui-phone-3d-status"><b>9:41</b><i /></div>
      <div className="ui-phone-3d-hello"><small>Good morning</small><strong>Today</strong></div>
      <div className="ui-phone-3d-card">
        <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" className="t" /><circle cx="18" cy="18" r="14" className="v" /></svg>
        <div><strong>72%</strong><small>of goal</small></div>
      </div>
      <div className="ui-phone-3d-tiles"><i /><i /><i /><i /></div>
      <div className="ui-phone-3d-tabs"><i /><i /><i /></div>
    </div>
  );
}

/** A CSS 3D phone mock-up that follows the pointer or can be dragged. Arrow keys rotate, Home resets. Fills its parent (size follows the parent's height). */
export default function Phone3d({ children, label = '3D phone mock-up', className }: Phone3dProps) {
  const ref = useRef<HTMLDivElement>(null);
  const coarse = useCoarsePointer();
  const reduced = useReducedMotion();
  const drag = useRef({ on: false, x: 0, y: 0, ox: 0, oy: 0 });
  const drive = useDamped(ref, (x, y) => {
    const st = ref.current?.style;
    if (!st) return;
    st.setProperty('--ry', (x + BASE.x).toFixed(2) + 'deg');
    st.setProperty('--rx', (y + BASE.y).toFixed(2) + 'deg');
    st.setProperty('--gl', (50 + (x + BASE.x) * 1.6).toFixed(1));
  }, { instant: reduced });
  const clampY = (v: number) => Math.max(-55, Math.min(55, v));

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = drive.get();
    Object.assign(drag.current, { on: true, x: e.clientX, y: e.clientY, ox: t.x, oy: t.y });
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d.on) { drive.set(Math.max(-200, Math.min(200, d.ox + (e.clientX - d.x) * 0.6)), clampY(d.oy - (e.clientY - d.y) * 0.4)); return; }
    if (coarse || e.pointerType === 'touch' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    drive.set((((e.clientX - r.left) / r.width) * 2 - 1) * 34, -(((e.clientY - r.top) / r.height) * 2 - 1) * 16);
  };
  const up = () => { drag.current.on = false; };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const { x, y } = drive.get();
    if (e.key === 'ArrowLeft') drive.set(x - 15, y);
    else if (e.key === 'ArrowRight') drive.set(x + 15, y);
    else if (e.key === 'ArrowUp') drive.set(x, clampY(y + 10));
    else if (e.key === 'ArrowDown') drive.set(x, clampY(y - 10));
    else if (e.key === 'Home') drive.set(0, 0);
    else return;
    e.preventDefault();
  };
  return (
    <div ref={ref} className={`ui-phone-3d-root ${className ?? ''}`} tabIndex={0} role="group"
      aria-label={`${label}. Drag or use the arrow keys to rotate, Home to reset.`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={() => { if (!drag.current.on) drive.set(0, 0); }} onKeyDown={key}>
      <div className="ui-phone-3d-floor" />
      <div className="ui-phone-3d-phone">
        {Array.from({ length: SLICES }, (_, k) => (
          <div key={k} className="ui-phone-3d-slice" style={{ transform: `translateZ(${((k / (SLICES - 1)) - 0.5) * 0.9}em)` }} />
        ))}
        <div className="ui-phone-3d-btn ui-phone-3d-btn-r" style={{ top: '5.2em', height: '2.6em' }} />
        <div className="ui-phone-3d-btn ui-phone-3d-btn-l" style={{ top: '4em', height: '1.4em' }} />
        <div className="ui-phone-3d-btn ui-phone-3d-btn-l" style={{ top: '6em', height: '1.4em' }} />
        <div className="ui-phone-3d-back"><span /><i /><i /></div>
        <div className="ui-phone-3d-front">
          <div className="ui-phone-3d-screen">
            {children ?? <DefaultScreen />}
            <div className="ui-phone-3d-island" />
            <div className="ui-phone-3d-glass" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Demo() {
  return <Phone3d />;
}
