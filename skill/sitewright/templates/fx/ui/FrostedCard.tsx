'use client';
import type { ComponentProps } from 'react';
import GlassCard from './GlassCard';
import { GlassStage } from './_tg-stage';

export type FrostedCardProps = Omit<ComponentProps<typeof GlassCard>, 'variant' | 'optics'>;

/** A dark frosted payment card that tilts toward the pointer under a moving sheen; pure CSS, so it is light on the GPU. Same props as GlassCard (without optics); see that file for details. */
export default function FrostedCard(props: FrostedCardProps) {
  return <GlassCard {...(props as ComponentProps<typeof GlassCard>)} variant="frosted" />;
}

export function Demo() {
  return (
    <GlassStage>
      <FrostedCard tier="Platinum" style={{ width: 'min(100%, 340px)' }} />
    </GlassStage>
  );
}
