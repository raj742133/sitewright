'use client';
import { useState } from 'react';
import { LAYER_ARTS, PALETTES, type PaletteName } from './_d5';

export interface LayerExplorerProps {
  palette?: PaletteName;
  /** Labels bottom to top: sky, sun, far hills, near hills, pines, mist. */
  labels?: string[];
  className?: string;
}
const DEFAULT_LABELS = ['Sky', 'Sun', 'Far ridge', 'Meadow', 'Pines', 'Mist'];

/** An illustration built from stacked layers that separate in 3D (exploded view) on hover, focus or tap, with a legend that highlights each layer. */
export default function LayerExplorer({ palette = 'day', labels = DEFAULT_LABELS, className }: LayerExplorerProps) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const open = hover || focus || pinned;
  const p = PALETTES[palette];
  return (
    <div className={`ui-layer-explorer-root ${className ?? ''}`} data-open={open ? '1' : '0'}
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') setHover(true); }} onPointerLeave={() => setHover(false)}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}>
      <button type="button" className="ui-layer-explorer-stage" aria-pressed={pinned} onClick={() => setPinned((v) => !v)}
        aria-label={`Exploded view of ${LAYER_ARTS.length} illustration layers`}>
        <span className="ui-layer-explorer-stack">
          {LAYER_ARTS.map((Art, i) => (
            <span key={i} className="ui-layer-explorer-layer" data-dim={active !== null && active !== i ? '1' : '0'} data-on={active === i ? '1' : '0'} style={{ ['--i' as string]: i }}>
              <Art p={p} />
            </span>
          ))}
        </span>
      </button>
      <ul className="ui-layer-explorer-legend" aria-label="Layers, top to bottom">
        {LAYER_ARTS.map((_, n) => {
          const i = LAYER_ARTS.length - 1 - n;
          return (
            <li key={i}>
              <button type="button" aria-pressed={active === i} onClick={() => setActive(active === i ? null : i)}
                onPointerEnter={(e) => { if (e.pointerType !== 'touch') setActive(i); }} onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)} onBlur={() => setActive(null)}>
                <span className="ui-layer-explorer-dot" style={{ background: [p.top, p.sun, p.far, p.near, p.pine, p.mist][i] }} />
                {labels[i] ?? `Layer ${i + 1}`}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Demo() {
  return <LayerExplorer />;
}
