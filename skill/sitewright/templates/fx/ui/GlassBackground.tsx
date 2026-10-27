'use client';
import type { HTMLAttributes, ReactNode } from 'react';
import { BACKGROUND_DEFAULT_PARAMS } from './_tg-engine';
import { useGlass, type GlassOpticsProps } from './_tg-use';

export interface GlassBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  /** Corner radius in px (default: the element's own, 16). */
  radius?: number;
  optics?: GlassOpticsProps;
}

/** A full-section backdrop of liquid light: caustics flow under a tinted glass panel, the pointer bends them and a click sends a ripple through. Other glass components placed inside refract it. */
export default function GlassBackground({ children, radius, optics, className = '', style, ...props }: GlassBackgroundProps) {
  const { rootRef, canvasRef, dataGlass } = useGlass<HTMLDivElement>({ defaults: BACKGROUND_DEFAULT_PARAMS, optics, radius: radius ?? 'css' });
  return (
    <div ref={rootRef} data-glass={dataGlass} className={`ui-glass ui-glass-bg ${className}`.trim()} style={{ borderRadius: radius !== undefined ? radius : undefined, ...style }} {...props}>
      <canvas ref={canvasRef} className="ui-glass-canvas" aria-hidden="true" />
      <div className="ui-glass-bg-in">{children}</div>
    </div>
  );
}

export function Demo() {
  return (
    <GlassBackground radius={0} optics={{ fluidBrightness: 220, fluidCenter: 70, fluidAuraWidth: 96, fluidScale: 60 }} style={{ height: '100%', minHeight: 200 }}>
      <h3 style={{ margin: 0, textAlign: 'center', font: '700 clamp(24px, 7vw, 34px)/1.1 var(--font-body, system-ui)', color: 'var(--ink)' }}>Liquid glass backdrop</h3>
    </GlassBackground>
  );
}
