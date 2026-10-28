'use client';
import { useState, type ComponentProps } from 'react';
import GlassSwitch from './GlassSwitch';
import { GlassStage } from './_tg-stage';

export type FrostedSwitchProps = Omit<ComponentProps<typeof GlassSwitch>, 'variant' | 'optics'>;

/** An on/off switch on a frosted track with a light glass thumb; a real button with role="switch". Same props as GlassSwitch (without optics); see that file for details. */
export default function FrostedSwitch(props: FrostedSwitchProps) {
  return <GlassSwitch {...(props as ComponentProps<typeof GlassSwitch>)} variant="frosted" />;
}

export function Demo() {
  const [a, setA] = useState(true);
  return (
    <GlassStage>
      <FrostedSwitch label="Notifications" checked={a} onChange={setA} />
    </GlassStage>
  );
}
