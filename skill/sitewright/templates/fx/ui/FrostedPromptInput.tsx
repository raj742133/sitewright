'use client';
import type { ComponentProps } from 'react';
import GlassPromptInput from './GlassPromptInput';
import { GlassStage } from './_tg-stage';

export type FrostedPromptInputProps = Omit<ComponentProps<typeof GlassPromptInput>, 'variant' | 'optics'>;

/** An AI prompt box on frosted glass with agent and mode chips and a send button; a real labelled textarea. Same props as GlassPromptInput (without optics); see that file for details. */
export default function FrostedPromptInput(props: FrostedPromptInputProps) {
  return <GlassPromptInput {...(props as ComponentProps<typeof GlassPromptInput>)} variant="frosted" />;
}

export function Demo() {
  return (
    <GlassStage>
      <FrostedPromptInput defaultValue="Summarise this week's feedback" />
    </GlassStage>
  );
}
