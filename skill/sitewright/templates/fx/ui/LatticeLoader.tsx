'use client';
import { useRef, type CSSProperties } from 'react';
import { useLive } from './_micro-b';

export interface LatticeLoaderProps {
  /** Nodes per side (2 to 7). */
  grid?: number;
  /** Width and height in px. */
  size?: number;
  /** Accessible label announced to screen readers. */
  label?: string;
  /** Show the label as visible text under the lattice. */
  showLabel?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** A square lattice of nodes and links; a pulse of light sweeps diagonally across it. Static frame under reduced motion. */
export default function LatticeLoader({ grid = 4, size = 72, label = 'Loading', showLabel = false, className = '', style }: LatticeLoaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const live = useLive(ref);
  const n = Math.max(2, Math.min(7, Math.round(grid)));
  const pad = 8;
  const span = 100 - pad * 2;
  const pos = (i: number) => pad + (i / (n - 1)) * span;
  const maxD = (n - 1) * 2;
  const nodes: { x: number; y: number; d: number }[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) nodes.push({ x, y, d: (x + y) / maxD });
  return (
    <div ref={ref} role="status" aria-label={label} className={`ui-lattice-loader ${className}`.trim()} data-live={live || undefined} style={{ ...style, ['--ll-size' as string]: `${size}px` }}>
      <svg viewBox="0 0 100 100" className="ui-lattice-loader-svg" aria-hidden="true" focusable="false">
        {nodes.map(({ x, y, d }, i) => (
          <g key={i} style={{ ['--d' as string]: d }}>
            {x < n - 1 && <line className="ui-lattice-loader-link" x1={pos(x)} y1={pos(y)} x2={pos(x + 1)} y2={pos(y)} style={{ ['--d' as string]: (x + y + 0.5) / maxD }} />}
            {y < n - 1 && <line className="ui-lattice-loader-link" x1={pos(x)} y1={pos(y)} x2={pos(x)} y2={pos(y + 1)} style={{ ['--d' as string]: (x + y + 0.5) / maxD }} />}
          </g>
        ))}
        {nodes.map(({ x, y, d }, i) => (
          <circle key={`n${i}`} className="ui-lattice-loader-node" cx={pos(x)} cy={pos(y)} r={Math.max(2.4, 6 - n * 0.5)} style={{ ['--d' as string]: d }} />
        ))}
      </svg>
      {showLabel && <span className="ui-lattice-loader-label" aria-hidden="true">{label}</span>}
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-lattice-loader-stage">
      <LatticeLoader size={104} grid={5} label="Syncing workspace" showLabel />
    </div>
  );
}
