'use client';
import { createElement, useRef, type CSSProperties, type PointerEvent } from 'react';
import { useInView } from './_text-a-kit';

export interface MaskedHeadingProps {
  /** The heading. Use a line break (\n) to choose the lines, each one rises through its own mask. */
  text?: string;
  /** Heading element to render. */
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div';
  /** Delay between lines in ms. */
  stagger?: number;
  /** Reveal immediately instead of waiting to scroll into view. */
  immediate?: boolean;
  /** Controlled reveal: true shows the lines, false hides them. Overrides scroll detection. */
  revealed?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** A heading whose lines rise out of a clipping mask when scrolled into view, filled with a slowly drifting brand gradient and a highlight that follows the pointer. Shown at once, with a still fill, under reduced motion. */
export default function MaskedHeading({ text = 'Make it\nmemorable', as = 'h2', stagger = 130, immediate = false, revealed, className, style }: MaskedHeadingProps) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, true, 0.35);
  const shown = revealed ?? (immediate || seen);
  const lines = text.split('\n').filter((l) => l.trim().length);
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
  };
  const onLeave = () => { ref.current?.style.removeProperty('--mx'); ref.current?.style.removeProperty('--my'); };
  return createElement(
    as,
    {
      ref, className: `ui-masked-heading-root ${className ?? ''}`, 'data-in': shown || undefined,
      style: { ['--mh-n' as string]: lines.length, ...style }, onPointerMove: onMove, onPointerLeave: onLeave,
    },
    lines.map((l, i) =>
      createElement('span', { key: i, className: 'ui-masked-heading-mask' },
        createElement('span', { className: 'ui-masked-heading-line', style: { ['--li' as string]: i, ['--delay' as string]: i * stagger + 'ms' } }, l.trim()),
        i < lines.length - 1 ? ' ' : null),
    ),
  );
}

export function Demo() {
  return (
    <div className="ui-masked-heading-stage">
      <MaskedHeading text={'Make it\nmemorable'} immediate />
    </div>
  );
}
