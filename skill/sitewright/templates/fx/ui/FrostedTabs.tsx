'use client';
import type { ComponentProps } from 'react';
import GlassTabs from './GlassTabs';
import { GlassStage } from './_tg-stage';

export type FrostedTabsProps = Omit<ComponentProps<typeof GlassTabs>, 'variant' | 'optics'>;

/** A pill tab bar on frosted glass with a sliding highlight; arrow keys, Home and End. Same props as GlassTabs (without optics); see that file for details. */
export default function FrostedTabs(props: FrostedTabsProps) {
  return <GlassTabs {...(props as ComponentProps<typeof GlassTabs>)} variant="frosted" />;
}

export function Demo() {
  return (
    <GlassStage>
      <FrostedTabs aria-label="Product sections" items={['Overview', 'Specs', 'Pricing']} />
    </GlassStage>
  );
}
