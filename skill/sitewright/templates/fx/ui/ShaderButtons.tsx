'use client';
import { useCallback, useState, type ButtonHTMLAttributes, type FocusEvent, type PointerEvent } from 'react';
import { CanvasFace, GlFace, type ShaderVariant } from './_tu-shader-faces';

export type { ShaderVariant };
export interface ShaderButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** The treatment: plasma and holographic are WebGL fragment shaders (CSS gradient fallback), ignition, particles and tactile are Canvas 2D. */
  variant?: ShaderVariant;
  /** Button label. */
  children?: React.ReactNode;
  /** Height step: md is 48px, lg is 60px. */
  size?: 'md' | 'lg';
}

/** A real <button> whose face is drawn live: five different shader / canvas treatments chosen with `variant`. Hover, keyboard focus and press all drive the animation; reduced motion freezes it on one frame. */
export default function ShaderButton({ variant = 'plasma', size = 'md', children = 'Continue', className, type = 'button', onPointerEnter, onPointerLeave, onPointerDown, onPointerUp, onPointerCancel, onFocus, onBlur, disabled, ...rest }: ShaderButtonProps) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [press, setPress] = useState(false);
  const [glOk, setGlOk] = useState(true);
  const onStatus = useCallback((ok: boolean) => setGlOk(ok), []);
  const state = { hover: (hover || focus) && !disabled, press: press && !disabled };
  const isGl = variant === 'plasma' || variant === 'holographic';
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      className={`ui-shader-buttons-btn ui-shader-buttons-${variant} ui-shader-buttons-${size} ${isGl && !glOk ? 'ui-shader-buttons-nogl' : ''} ${className ?? ''}`}
      onPointerEnter={(e: PointerEvent<HTMLButtonElement>) => { if (e.pointerType !== 'touch') setHover(true); onPointerEnter?.(e); }}
      onPointerLeave={(e: PointerEvent<HTMLButtonElement>) => { setHover(false); setPress(false); onPointerLeave?.(e); }}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => { setPress(true); onPointerDown?.(e); }}
      onPointerUp={(e: PointerEvent<HTMLButtonElement>) => { setPress(false); onPointerUp?.(e); }}
      onPointerCancel={(e: PointerEvent<HTMLButtonElement>) => { setPress(false); onPointerCancel?.(e); }}
      onFocus={(e: FocusEvent<HTMLButtonElement>) => { if (e.currentTarget.matches(':focus-visible')) setFocus(true); onFocus?.(e); }}
      onBlur={(e: FocusEvent<HTMLButtonElement>) => { setFocus(false); onBlur?.(e); }}
    >
      <span className="ui-shader-buttons-face" aria-hidden="true">
        {isGl ? <GlFace kind={variant as 'plasma' | 'holographic'} state={state} onStatus={onStatus} /> : <CanvasFace kind={variant as 'ignition' | 'particles' | 'tactile'} state={state} />}
      </span>
      <span className="ui-shader-buttons-label">{children}</span>
    </button>
  );
}

const SET: { v: ShaderVariant; label: string }[] = [
  { v: 'plasma', label: 'Generate' },
  { v: 'holographic', label: 'Claim reward' },
  { v: 'ignition', label: 'Launch' },
  { v: 'particles', label: 'Explore' },
  { v: 'tactile', label: 'Press me' },
];

export function Demo() {
  return (
    <div className="ui-shader-buttons-demo">
      {SET.map((s) => <ShaderButton key={s.v} variant={s.v}>{s.label}</ShaderButton>)}
    </div>
  );
}
