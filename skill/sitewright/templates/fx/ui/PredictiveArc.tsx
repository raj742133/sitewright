'use client';
import type { CSSProperties } from 'react';
import { useCanvas2D } from './_bg-c-canvas';
import { TuDemo } from './_tu-bg-demo';
import { makeArc, type ArcVariant } from './_tu-bg-arc';

export type { ArcVariant };
export interface PredictiveArcProps {
  /** `arc` pixel-grid horizon arch, `signals` pulses along a node network, `ribbon` flowing ribbons, `dots` halftone dot matrix, `flow` flow-field trails (default `arc`). */
  variant?: ArcVariant;
  className?: string;
  style?: CSSProperties;
}

function Scene({ variant, className, style }: Required<Pick<PredictiveArcProps, 'variant'>> & Pick<PredictiveArcProps, 'className' | 'style'>) {
  const { wrapRef, canvasRef } = useCanvas2D((f) => makeArc(variant, f), { fps: 60 });
  return (
    <div ref={wrapRef} className={'ui-predictive-arc' + (className ? ' ' + className : '')} style={style} data-variant={variant} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-predictive-arc-canvas" />
    </div>
  );
}

/**
 * Full-bleed generative scenes drawn on Canvas 2D in five styles. Fills its positioned parent, is
 * aria-hidden and ignores pointer events (the pointer is read from the parent and bends some scenes).
 * Colours follow --primary, --signal and --ink in light and dark. Reduced motion: one settled frame.
 * Pauses when off-screen or in a hidden tab.
 */
export default function PredictiveArc({ variant = 'arc', className, style }: PredictiveArcProps) {
  return <Scene key={variant} variant={variant} className={className} style={style} />;
}

const VARIANTS = ['arc', 'signals', 'ribbon', 'dots', 'flow'] as const;
const NAMES: Record<ArcVariant, string> = { arc: 'Arch', signals: 'Signals', ribbon: 'Ribbon', dots: 'Dots', flow: 'Flow' };
export function Demo() {
  return (
    <TuDemo title="Predictive arc" sub="Five generative scenes." variants={VARIANTS} labels={NAMES}>
      {(v) => <PredictiveArc variant={v} />}
    </TuDemo>
  );
}
