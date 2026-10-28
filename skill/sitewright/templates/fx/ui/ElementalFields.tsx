'use client';
import type { CSSProperties } from 'react';
import { useCanvas2D, type Frame, type Painter } from './_bg-c-canvas';
import { TuDemo } from './_tu-bg-demo';
import { lightning, water } from './_tu-bg-elements';
import { condensation, fire } from './_tu-bg-elements2';

export type ElementVariant = 'water' | 'lightning' | 'fire' | 'condensation';
export interface ElementalFieldsProps {
  /** `water` rippling surface, `lightning` branching bolts, `fire` rising flames and embers, `condensation` fogged glass with beading drops (default `water`). */
  variant?: ElementVariant;
  className?: string;
  style?: CSSProperties;
}

function make(v: ElementVariant, f: Frame): Painter {
  return v === 'lightning' ? lightning(f) : v === 'fire' ? fire(f) : v === 'condensation' ? condensation(f) : water(f);
}
function Scene({ variant, className, style }: Required<Pick<ElementalFieldsProps, 'variant'>> & Pick<ElementalFieldsProps, 'className' | 'style'>) {
  const { wrapRef, canvasRef } = useCanvas2D((f) => make(variant, f), { fps: variant === 'fire' ? 30 : 60, warm: variant === 'fire' ? 160 : 100 });
  return (
    <div ref={wrapRef} className={'ui-elemental-fields' + (className ? ' ' + className : '')} style={style} data-variant={variant} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-elemental-fields-canvas" />
    </div>
  );
}

/**
 * Generative elemental backgrounds on Canvas 2D (no logos or marks): water, lightning, fire, condensation.
 * Fills its positioned parent, aria-hidden, pointer-events none; the pointer (read from the parent) stirs
 * the water, strikes the lightning, feeds the fire and wipes the glass. Token colours, light and dark.
 * Reduced motion: one settled frame.
 */
export default function ElementalFields({ variant = 'water', className, style }: ElementalFieldsProps) {
  return <Scene key={variant} variant={variant} className={className} style={style} />;
}

const VARIANTS = ['water', 'lightning', 'fire', 'condensation'] as const;
const NAMES: Record<ElementVariant, string> = { water: 'Water', lightning: 'Lightning', fire: 'Fire', condensation: 'Condensation' };
export function Demo() {
  return (
    <TuDemo title="Elemental fields" sub="Move or click to disturb it." variants={VARIANTS} labels={NAMES}>
      {(v) => <ElementalFields variant={v} />}
    </TuDemo>
  );
}
