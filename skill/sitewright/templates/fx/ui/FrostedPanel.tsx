'use client';
import type { ComponentProps } from 'react';
import GlassFx from './GlassFx';
import { GlassStage } from './_tg-stage';

export type FrostedPanelProps = Omit<ComponentProps<typeof GlassFx>, 'variant' | 'optics'>;

/** Wrap any content in a frosted glass panel: blur, grain, lit edge and a sheen that follows the pointer. Same props as GlassFx (without optics); see that file for details. */
export default function FrostedPanel(props: FrostedPanelProps) {
  return <GlassFx {...(props as ComponentProps<typeof GlassFx>)} variant="frosted" />;
}

export function Demo() {
  return (
    <GlassStage>
      <FrostedPanel style={{ padding: '26px 34px', font: '600 20px/1.2 var(--font-body, system-ui)' }}>Any element, glass</FrostedPanel>
    </GlassStage>
  );
}
