'use client';
import type { CSSProperties } from 'react';
import { useCanvas2D } from './_bg-c-canvas';
import { TuDemo } from './_tu-bg-demo';
import { makeConstellation, type ConstellationVariant } from './_tu-bg-constellation';

export type { ConstellationVariant };
export interface ConstellationFieldProps {
  /** `network` drifting linked nodes, `stars` parallax sky with a fixed constellation, `lattice` springy node mesh, `orbits` hubs with satellite rings (default `network`). */
  variant?: ConstellationVariant;
  /** Node count multiplier, 0.4 to 2 (default 1). */
  density?: number;
  className?: string;
  style?: CSSProperties;
}

function Field({ variant, density, className, style }: Required<Pick<ConstellationFieldProps, 'variant' | 'density'>> & Pick<ConstellationFieldProps, 'className' | 'style'>) {
  const { wrapRef, canvasRef } = useCanvas2D((f) => makeConstellation(variant, f, density), { fps: 60 });
  return (
    <div ref={wrapRef} className={'ui-constellation-field' + (className ? ' ' + className : '')} style={style} data-variant={variant} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-constellation-field-canvas" />
    </div>
  );
}

/**
 * Full-bleed particle-network background in four distinct styles. Fills its positioned parent, is
 * aria-hidden and never takes pointer events; the pointer is read from the parent (nodes are drawn
 * towards, or pushed away from, it). Colours come from --primary, --signal and --ink so it works in
 * light and dark. Reduced motion: a still, pre-settled frame. Pauses off-screen and in hidden tabs.
 */
export default function ConstellationField({ variant = 'network', density = 1, className, style }: ConstellationFieldProps) {
  return <Field key={variant + density} variant={variant} density={Math.max(0.4, Math.min(2, density))} className={className} style={style} />;
}

const VARIANTS = ['network', 'stars', 'lattice', 'orbits'] as const;
const NAMES: Record<ConstellationVariant, string> = { network: 'Network', stars: 'Stars', lattice: 'Lattice', orbits: 'Orbits' };
export function Demo() {
  return (
    <TuDemo title="Constellation field" sub="Move the pointer over it." variants={VARIANTS} labels={NAMES}>
      {(v) => <ConstellationField variant={v} />}
    </TuDemo>
  );
}
