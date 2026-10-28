'use client';
import type { ComponentProps } from 'react';
import GlassBackground from './GlassBackground';
import { GlassStage } from './_tg-stage';

export type FrostedBackdropProps = Omit<ComponentProps<typeof GlassBackground>, 'variant' | 'optics'>;

/** A soft drifting colour field under fine grain, made of the brand colours; the stage for frosted panes. Same props as GlassBackground (without optics); see that file for details. */
export default function FrostedBackdrop(props: FrostedBackdropProps) {
  return <GlassBackground {...(props as ComponentProps<typeof GlassBackground>)} variant="frosted" />;
}

export function Demo() {
  return (
    <FrostedBackdrop radius={0} style={{ height: '100%', minHeight: 200 }}>
      <h3 style={{ margin: 0, textAlign: 'center', font: '700 clamp(24px, 7vw, 34px)/1.1 var(--font-body, system-ui)', color: 'var(--ink)' }}>Liquid glass backdrop</h3>
    </FrostedBackdrop>
  );
}
