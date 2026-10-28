'use client';
import type { ComponentProps } from 'react';
import GlassAudioPlayer from './GlassAudioPlayer';
import { GlassStage } from './_tg-stage';

export type FrostedAudioPlayerProps = Omit<ComponentProps<typeof GlassAudioPlayer>, 'variant' | 'optics'>;

/** A dark frosted music deck with a synthesised demo track: play, next, volume and a progress slider; never autoplays. Same props as GlassAudioPlayer (without optics); see that file for details. */
export default function FrostedAudioPlayer(props: FrostedAudioPlayerProps) {
  return <GlassAudioPlayer {...(props as ComponentProps<typeof GlassAudioPlayer>)} variant="frosted" />;
}

export function Demo() {
  return (
    <GlassStage>
      <FrostedAudioPlayer style={{ width: 'min(100%, 340px)' }} />
    </GlassStage>
  );
}
