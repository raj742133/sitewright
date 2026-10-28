'use client';
import type { ComponentProps } from 'react';
import GlassButton from './GlassButton';
import { GlassStage } from './_tg-stage';

export type FrostedButtonProps = Omit<ComponentProps<typeof GlassButton>, 'variant' | 'optics'>;

/** A pill button of thick frosted glass: heavy backdrop blur, fine grain, a lit edge and a soft sheen that follows the pointer. Pure CSS, no WebGL. Same props as GlassButton (without optics); see that file for details. */
export default function FrostedButton(props: FrostedButtonProps) {
  return <GlassButton {...(props as ComponentProps<typeof GlassButton>)} variant="frosted" />;
}

const Arrow = () => <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export function Demo() {
  return (
    <GlassStage>
      <FrostedButton >Explore components <Arrow /></FrostedButton>
    </GlassStage>
  );
}
