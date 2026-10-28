'use client';
import { useRef, useState, type CSSProperties } from 'react';
import { useLive } from './_micro-b';

export interface PulseHeartProps {
  /** Controlled liked state. */
  liked?: boolean;
  defaultLiked?: boolean;
  /** Count shown next to the heart (adjusted by one when toggled and uncontrolled). Omit to hide. */
  count?: number;
  onChange?: (liked: boolean) => void;
  /** Accessible name of the button (state is announced through aria-pressed). */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const HEART = 'M12 20.6c-.3 0-.6-.1-.8-.3C6.4 16.4 3 13.4 3 9.6 3 7 5 5 7.5 5c1.7 0 3.4.9 4.5 2.4C13.1 5.900 14.800 5 16.500 5 19 5 21 7 21 9.600c0 3.800-3.400 6.800-8.200 10.700-.2.200-.5.300-.8.300z';
const BITS = [0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; return { x: Math.round(Math.cos(a) * 26), y: Math.round(Math.sin(a) * 26), r: i % 2 ? 'a' : 'b' }; });

/** A like button: pressing it fills the heart, sends a ripple and a ring of sparks outwards, then keeps a slow heartbeat while liked. */
export default function PulseHeart({ liked, defaultLiked = false, count, onChange, label = 'Like', className = '', style }: PulseHeartProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const live = useLive(ref);
  const [inner, setInner] = useState(defaultLiked);
  const [burst, setBurst] = useState(0);
  const on = liked ?? inner;
  const toggle = () => {
    const next = !on;
    if (liked === undefined) setInner(next);
    if (next) setBurst((b) => b + 1);
    onChange?.(next);
  };
  const shown = count === undefined ? undefined : liked !== undefined || on === defaultLiked ? count : count + (on ? 1 : -1);
  return (
    <button ref={ref} type="button" className={`ui-pulse-heart ${className}`.trim()} style={style} aria-pressed={on} data-on={on || undefined} data-live={live || undefined} onClick={toggle}>
      <span className="ui-pulse-heart-icon" key={`i${burst}`} data-burst={burst > 0 || undefined}>
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><path d={HEART} /></svg>
      </span>
      {burst > 0 && on && (
        <span className="ui-pulse-heart-fx" key={`f${burst}`} aria-hidden="true">
          <span className="ui-pulse-heart-ripple" />
          {BITS.map((b, i) => <span key={i} className="ui-pulse-heart-bit" data-k={b.r} style={{ ['--x' as string]: `${b.x}px`, ['--y' as string]: `${b.y}px` }} />)}
        </span>
      )}
      <span className="ui-pulse-heart-text">{label}</span>
      {shown !== undefined && <span className="ui-pulse-heart-count" aria-hidden="true">{shown}</span>}
    </button>
  );
}

export function Demo() {
  return (
    <div className="ui-pulse-heart-stage">
      <PulseHeart count={128} label="Like this post" />
    </div>
  );
}
