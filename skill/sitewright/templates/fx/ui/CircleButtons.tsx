'use client';
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties } from 'react';

export type CircleIcon = 'play' | 'plus' | 'mail';
export type CircleVariant = 'glass' | 'dotted' | 'tactile';
export interface CircleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** The glyph. `play` doubles as a play/pause toggle (see `pressed`); `mail` plays a short send animation on click. */
  icon?: CircleIcon;
  /** Surface treatment. */
  variant?: CircleVariant;
  /** Accent colour taken from the host tokens. */
  tone?: 'primary' | 'signal';
  /** Diameter in px (default 56 via CSS). On touch screens it never goes below 44. */
  size?: number;
  /** Required accessible name, e.g. "Play video". */
  'aria-label': string;
  /** Play only: controlled state (true shows pause). Leave undefined for uncontrolled. */
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

function Glyph({ icon, on }: { icon: CircleIcon; on: boolean }) {
  if (icon === 'plus') return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="ui-circle-buttons-g ui-circle-buttons-plus"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>;
  if (icon === 'mail') return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="ui-circle-buttons-g ui-circle-buttons-mail">
      <rect x="3.5" y="6" width="17" height="12" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M4.5 7.5l7.5 6 7.5-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="ui-circle-buttons-g ui-circle-buttons-play">
      <path className="ui-circle-buttons-tri" style={{ opacity: on ? 0 : 1 }} d="M8.5 5.6v12.8a.8.8 0 0 0 1.2.7l10-6.4a.8.8 0 0 0 0-1.4l-10-6.4a.8.8 0 0 0-1.2.7z" fill="currentColor" />
      <g className="ui-circle-buttons-bars" style={{ opacity: on ? 1 : 0 }} fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" /></g>
    </svg>
  );
}

/** A circular icon button in three treatments (glass, dotted ring, tactile dome) with play, plus and mail glyphs. Real <button>: keyboard, focus ring, press and disabled states, reduced-motion safe. */
export default function CircleButton({ icon = 'play', variant = 'glass', tone = 'primary', size, pressed, defaultPressed = false, onPressedChange, onClick, className, style, type = 'button', ...rest }: CircleButtonProps) {
  const [inner, setInner] = useState(defaultPressed);
  const [sent, setSent] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const isToggle = icon === 'play' && (pressed !== undefined || onPressedChange !== undefined || defaultPressed);
  const on = icon === 'play' ? (pressed ?? inner) : false;
  return (
    <button
      {...rest}
      type={type}
      aria-pressed={isToggle ? on : undefined}
      className={`ui-circle-buttons-b ui-circle-buttons-${variant} ui-circle-buttons-tone-${tone} ${sent ? 'ui-circle-buttons-sent' : ''} ${className ?? ''}`}
      style={size === undefined ? style : ({ ['--circle-buttons-size' as string]: `${size}px`, ...style } as CSSProperties)}
      onClick={(e) => {
        if (icon === 'play') { const next = !on; if (pressed === undefined) setInner(next); onPressedChange?.(next); }
        if (icon === 'mail') { setSent(true); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setSent(false), 900); }
        onClick?.(e);
      }}
    >
      <span className="ui-circle-buttons-ring" aria-hidden="true" />
      <Glyph icon={icon} on={on} />
    </button>
  );
}

export function Demo() {
  const items: { icon: CircleIcon; label: string }[] = [{ icon: 'play', label: 'Play' }, { icon: 'plus', label: 'Add item' }, { icon: 'mail', label: 'Send message' }];
  const variants: CircleVariant[] = ['glass', 'dotted', 'tactile'];
  return (
    <div className="ui-circle-buttons-demo">
      <span className="ui-circle-buttons-blob" aria-hidden="true" />
      <div className="ui-circle-buttons-rows">
        {variants.map((v, vi) => (
          <div key={v} className="ui-circle-buttons-row">
            {items.map((it) => <CircleButton key={it.icon} icon={it.icon} variant={v} tone={vi === 1 ? 'signal' : 'primary'} aria-label={`${it.label} (${v})`} defaultPressed={false} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
