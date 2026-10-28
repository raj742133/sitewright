'use client';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { BUTTON_DEFAULT_PARAMS } from './_tg-engine';
import { useGlass, type GlassOpticsProps, type GlassVariant } from './_tg-use';
import { GlassStage } from './_tg-stage';

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  /** 'pill' (default) or a round icon button. Give a round button an aria-label. */
  shape?: 'pill' | 'circle';
  /** 'lg' is 56px tall (default), 'md' is 44px. */
  size?: 'md' | 'lg';
  /** 'accent' tints the glass with the brand colour. */
  tone?: 'neutral' | 'accent';
  /** Fine-tune the glass: refraction, frost, sheen, fluidBrightness, ... (see GlassOptics). */
  /** 'optical' (default) bends what is behind it with WebGL2; 'frosted' is pure CSS frosted glass: blur, grain and a soft pointer-following sheen. */
  variant?: GlassVariant;
  optics?: GlassOpticsProps;
}

/** A pill button made of liquid glass: the rim catches light, caustics flow through it and a click sends a ripple. Falls back to frosted CSS glass without WebGL. */
export default function GlassButton({ children, shape = 'pill', size = 'lg', tone = 'neutral', variant, optics, className = '', type = 'button', ...props }: GlassButtonProps) {
  const { rootRef, canvasRef, dataGlass } = useGlass<HTMLButtonElement>({ defaults: BUTTON_DEFAULT_PARAMS, optics, variant, radius: 'pill' });
  return (
    <button ref={rootRef} type={type} data-glass={dataGlass} data-shape={shape} data-size={size} data-tone={tone} className={`ui-glass ui-glass-pane ui-glass-btn ${className}`.trim()} {...props}>
      <canvas ref={canvasRef} className="ui-glass-canvas" aria-hidden="true" />
      <span className="ui-glass-btn-label">{children}</span>
    </button>
  );
}

const Arrow = () => <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export function Demo() {
  return (
    <GlassStage>
      <GlassButton optics={{ refraction: 45, thickness: 45, bevelWidth: 12, frost: 24, sheen: 45, rim: 45, fluidBrightness: 140 }}>Explore components <Arrow /></GlassButton>
    </GlassStage>
  );
}
