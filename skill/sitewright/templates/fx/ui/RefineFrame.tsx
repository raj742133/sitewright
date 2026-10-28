'use client';
import { useId, useState, type CSSProperties, type ReactNode } from 'react';

export interface RefineFrameProps {
  /** Controlled refined state. */
  refined?: boolean;
  defaultRefined?: boolean;
  onChange?: (refined: boolean) => void;
  /** Caption under the frame. */
  caption?: string;
  /** Replaces the default landscape artwork. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

function Art() {
  return (
    <svg viewBox="0 0 240 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" className="ui-refine-frame-art">
      <rect width="240" height="150" className="ui-refine-frame-sky" />
      <circle cx="170" cy="46" r="20" className="ui-refine-frame-sun" />
      <path d="M0 150V96l38-34 30 26 44-52 52 58 28-24 48 38v42z" className="ui-refine-frame-far" />
      <path d="M0 150v-30l46-24 40 20 52-32 60 40 42-20v46z" className="ui-refine-frame-near" />
      <g className="ui-refine-frame-fine">{[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M${20 + i * 34} 150v-${18 + (i % 3) * 8}`} />)}</g>
    </svg>
  );
}

/** A frame holding a soft, loose draft that snaps into focus. The corner marks tighten and a focus pulse sweeps once. Hover or focus previews it; press to commit. */
export default function RefineFrame({ refined, defaultRefined = false, onChange, caption = 'Cover shot', children, className = '', style }: RefineFrameProps) {
  const id = useId();
  const [inner, setInner] = useState(defaultRefined);
  const on = refined ?? inner;
  const toggle = () => { const n = !on; if (refined === undefined) setInner(n); onChange?.(n); };
  return (
    <button type="button" className={`ui-refine-frame ${className}`.trim()} style={style} aria-pressed={on} data-on={on || undefined} onClick={toggle} aria-describedby={id}>
      <span className="ui-refine-frame-window">
        <span className="ui-refine-frame-pic">{children ?? <Art />}</span>
        <span className="ui-refine-frame-grain" aria-hidden="true" />
        <span className="ui-refine-frame-sweep" key={on ? 's1' : 's0'} aria-hidden="true" />
        <span className="ui-refine-frame-corner" data-c="tl" aria-hidden="true" />
        <span className="ui-refine-frame-corner" data-c="tr" aria-hidden="true" />
        <span className="ui-refine-frame-corner" data-c="bl" aria-hidden="true" />
        <span className="ui-refine-frame-corner" data-c="br" aria-hidden="true" />
        <span className="ui-refine-frame-chip" aria-hidden="true">{on ? 'Refined' : 'Draft'}</span>
      </span>
      <span className="ui-refine-frame-cap"><strong>{caption}</strong><span id={id}>{on ? 'Sharp. Press to revert to the draft.' : 'Soft draft. Press to refine.'}</span></span>
    </button>
  );
}

export function Demo() {
  return (
    <div className="ui-refine-frame-stage">
      <RefineFrame />
    </div>
  );
}
