'use client';
import { createElement, type CSSProperties } from 'react';

export interface GlitchTextProps {
  /** The text (rendered once as real text; the glitch layers are decorative copies). */
  text?: string;
  /** loop: short glitch bursts on their own. hover: calm until hovered or tapped. */
  mode?: 'loop' | 'hover';
  /** Seconds between the start of two bursts (loop mode). */
  interval?: number;
  /** Colour split distance in px. */
  split?: number;
  /** Element to render, so it can be a real heading. */
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3';
  className?: string;
  style?: CSSProperties;
}

/** Text with a chromatic split and torn horizontal slices that jump in short bursts. Pure CSS: brand-coloured layers slice through the copy. Under reduced motion it holds a still colour split. */
export default function GlitchText({ text = 'Glitch', mode = 'loop', interval = 3.4, split = 3, as = 'span', className, style }: GlitchTextProps) {
  return createElement(
    as,
    { className: `ui-glitch-text-root ${className ?? ''}`, 'data-mode': mode, style: { ['--gt-split' as string]: split + 'px', ['--gt-dur' as string]: interval + 's', ...style } },
    createElement('span', { className: 'ui-glitch-text-main' }, text),
    createElement('span', { className: 'ui-glitch-text-layer ui-glitch-text-a', 'aria-hidden': true }, text),
    createElement('span', { className: 'ui-glitch-text-layer ui-glitch-text-b', 'aria-hidden': true }, text),
    createElement('span', { className: 'ui-glitch-text-scan', 'aria-hidden': true }),
  );
}

export function Demo() {
  return (
    <div className="ui-glitch-text-stage">
      <GlitchText text="Glitch" />
    </div>
  );
}
