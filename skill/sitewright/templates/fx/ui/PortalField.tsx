'use client';
import type { CSSProperties } from 'react';
import { useCanvas2D } from './_bg-c-canvas';
import { TuDemo } from './_tu-bg-demo';
import { makePortal, type PortalVariant } from './_tu-bg-portal';

export type { PortalVariant };
export interface PortalFieldProps {
  /** `cloud` rotating noise-shaped point cloud, `bell` standing-wave plate where grains settle on nodal lines, `flow` streams converging on a focal portal (default `cloud`). */
  variant?: PortalVariant;
  className?: string;
  style?: CSSProperties;
}

function Scene({ variant, className, style }: Required<Pick<PortalFieldProps, 'variant'>> & Pick<PortalFieldProps, 'className' | 'style'>) {
  const { wrapRef, canvasRef } = useCanvas2D((f) => makePortal(variant, f), { fps: 60, warm: 120 });
  return (
    <div ref={wrapRef} className={'ui-portal-field' + (className ? ' ' + className : '')} style={style} data-variant={variant} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-portal-field-canvas" />
    </div>
  );
}

/**
 * Ambient particle fields in three moods. Fills its positioned parent, aria-hidden, pointer-events none
 * (the pointer is read from the parent: it tilts the cloud, shakes the plate, or moves the portal).
 * Tokens: --primary, --signal, --ink, light and dark. Reduced motion: a settled still frame.
 */
export default function PortalField({ variant = 'cloud', className, style }: PortalFieldProps) {
  return <Scene key={variant} variant={variant} className={className} style={style} />;
}

const VARIANTS = ['cloud', 'bell', 'flow'] as const;
const NAMES: Record<PortalVariant, string> = { cloud: 'Cloud', bell: 'Bell', flow: 'Flow' };
export function Demo() {
  return (
    <TuDemo title="Portal field" sub="Three ambient moods." variants={VARIANTS} labels={NAMES}>
      {(v) => <PortalField variant={v} />}
    </TuDemo>
  );
}
