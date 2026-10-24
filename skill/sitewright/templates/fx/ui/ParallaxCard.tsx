'use client';
import { useRef } from 'react';
import { LAYER_ARTS, PALETTES, useCoarsePointer, usePointerVars, useReducedMotion, type PaletteName } from './_d5';

export interface ParallaxCardProps {
  title?: string;
  caption?: string;
  palette?: PaletteName;
  className?: string;
}
/** Shift in px per layer: sky, sun, far ridge, meadow, pines, mist. */
const DEPTH = [3, 9, 14, 22, 34, 44];

/** A layered landscape whose layers slide by different amounts as the pointer moves. Arrow keys nudge it; touch screens get a slow drift. */
export default function ParallaxCard({ title = 'Pine Ridge', caption = 'Move across the card', palette = 'dusk', className }: ParallaxCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const coarse = useCoarsePointer();
  const reduced = useReducedMotion();
  usePointerVars(ref, { enabled: !reduced, keys: true });
  const p = PALETTES[palette];
  return (
    <div ref={ref} className={`ui-parallax-card-root ${coarse && !reduced ? 'ui-parallax-card-drift' : ''} ${className ?? ''}`} tabIndex={0} role="group"
      aria-label={`${title}. ${caption}. Layers shift with the pointer or arrow keys.`}>
      {LAYER_ARTS.map((Art, i) => (
        <Art key={i} p={p} className="ui-parallax-card-layer" style={{ ['--d' as string]: DEPTH[i] }} />
      ))}
      <div className="ui-parallax-card-text"><strong>{title}</strong><span>{caption}</span></div>
    </div>
  );
}

export function Demo() {
  return <ParallaxCard />;
}
