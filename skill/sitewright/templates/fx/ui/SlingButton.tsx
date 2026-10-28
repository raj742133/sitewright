'use client';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { clamp } from './_micro-c';

export interface SlingDetail { /** 0..1, how far the button was pulled back (keyboard and plain clicks send 0.6). */ power: number; /** Launch direction in degrees (0 = right, 90 = down). */ angle: number }

export interface SlingButtonProps {
  /** Button text. */
  label?: string;
  /** Called when the button is slung (pull back and release) or activated with a click, Enter or Space. */
  onSling?: (detail: SlingDetail) => void;
  /** Maximum pull distance in px. */
  reach?: number;
  disabled?: boolean;
  className?: string;
}

const MIN_PULL = 0.3;

/** A button you can pull back like a slingshot and release: it stretches, springs back and flings a spark the other way. Clicking, Enter and Space fire a short sling. */
export default function SlingButton({ label = 'Sling it', onSling, reach = 56, disabled, className = '' }: SlingButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const skipClick = useRef(false);
  const [pull, setPull] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [shot, setShot] = useState<{ n: number; fx: number; fy: number; power: number } | null>(null);
  const [count, setCount] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const fire = (dx: number, dy: number, power: number) => {
    const len = Math.hypot(dx, dy) || 1;
    const angle = (Math.atan2(-dy, -dx) * 180) / Math.PI;
    setShot((s) => ({ n: (s?.n ?? 0) + 1, fx: (-dx / len) * (70 + power * 80), fy: (-dy / len) * (70 + power * 80), power }));
    setCount((c) => c + 1);
    onSling?.({ power, angle: (angle + 360) % 360 });
  };

  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled || e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    let dx = e.clientX - d.x;
    let dy = e.clientY - d.y;
    const len = Math.hypot(dx, dy);
    if (len > 4) setDragging(true);
    if (len > reach) { const k = reach + (len - reach) * 0.15; dx = (dx / len) * Math.min(k, reach * 1.25); dy = (dy / len) * Math.min(k, reach * 1.25); }
    setPull({ x: dx, y: dy });
  };
  const end = (e: PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    const power = clamp(Math.hypot(pull.x, pull.y) / reach, 0, 1);
    if (!cancelled && power >= MIN_PULL) { skipClick.current = true; fire(pull.x, pull.y, power); }
    setPull({ x: 0, y: 0 });
  };
  const onClick = () => {
    if (skipClick.current) { skipClick.current = false; return; }
    fire(-1, 0, 0.6);
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape' && drag.current) { drag.current = null; setDragging(false); setPull({ x: 0, y: 0 }); }
  };

  const len = Math.hypot(pull.x, pull.y);
  const stretch = 1 + Math.min(len / reach, 1.25) * 0.28;
  const ang = len > 1 ? (Math.atan2(pull.y, pull.x) * 180) / Math.PI : 0;
  return (
    <span className={`ui-sling-button-wrap ${className}`.trim()}>
      <button ref={ref} type="button" disabled={disabled} className="ui-sling-button" data-dragging={dragging || undefined}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={(e) => end(e, false)} onPointerCancel={(e) => end(e, true)}
        onClick={onClick} onKeyDown={onKey}>
        <span className="ui-sling-button-band" aria-hidden="true" style={{ width: len, transform: `rotate(${ang}deg)`, opacity: len > 2 ? 1 : 0 }} />
        <span className="ui-sling-button-face" style={{ transform: `translate(${pull.x.toFixed(1)}px, ${pull.y.toFixed(1)}px) rotate(${ang.toFixed(1)}deg) scaleX(${stretch.toFixed(3)}) rotate(${(-ang).toFixed(1)}deg)` }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M5 19 19 5M10 5h9v9" />
          </svg>
          <span>{label}</span>
        </span>
        {shot && (
          <span key={shot.n} className="ui-sling-button-spark" aria-hidden="true"
            style={{ ['--fx' as string]: `${shot.fx.toFixed(0)}px`, ['--fy' as string]: `${shot.fy.toFixed(0)}px` }} />
        )}
      </button>
      <span className="ui-sling-button-hint" aria-hidden="true">{count > 0 ? `Slung ${count}x` : 'Pull back, release'}</span>
      <span className="ui-sling-button-sr" role="status" aria-live="polite">{count > 0 ? `Slung ${count} ${count === 1 ? 'time' : 'times'}` : ''}</span>
    </span>
  );
}

export function Demo() {
  return (
    <div className="ui-sling-button-stage">
      <SlingButton />
    </div>
  );
}
