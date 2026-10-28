'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import { watchLive } from './_t2';
import { BgcDemo } from './_bg-c-demo';

export interface GrainientProps {
  /** Drift speed multiplier (default 1). */
  speed?: number;
  /** Grain strength, 0 to 1 (default 0.5). */
  grain?: number;
  /** Grain tile size in px (default 140); larger tiles read as coarser grain. */
  grainSize?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * A slow, soft gradient made of four drifting colour fields (--primary, --signal and tints of --surface/--ink)
 * with film grain over the top. Pure CSS: no canvas, no script cost beyond a visibility toggle. Fills its parent
 * (`position:absolute; inset:0`), so put it first inside a `position:relative` section. Decorative (aria-hidden);
 * drift and grain shimmer stop under reduced motion and when scrolled off-screen.
 */
export default function Grainient({ speed = 1, grain = 0.5, grainSize = 140, className, style }: GrainientProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return watchLive(el, (live) => { el.dataset.live = live ? 'on' : 'off'; });
  }, []);
  const vars = {
    '--gc-speed': Math.max(0.05, speed),
    '--gc-grain': Math.min(1, Math.max(0, grain)),
    '--gc-grain-size': `${Math.max(40, grainSize)}px`,
    ...style,
  } as CSSProperties;
  return (
    <div ref={ref} className={'ui-grainient' + (className ? ' ' + className : '')} style={vars} data-live="on" aria-hidden="true">
      <i className="ui-grainient-blob ui-grainient-a" />
      <i className="ui-grainient-blob ui-grainient-b" />
      <i className="ui-grainient-blob ui-grainient-c" />
      <i className="ui-grainient-blob ui-grainient-d" />
      <span className="ui-grainient-grain" />
    </div>
  );
}

export function Demo() {
  return (
    <BgcDemo title="Quietly textured" sub="A grainy gradient that drifts behind your content.">
      <Grainient />
    </BgcDemo>
  );
}
