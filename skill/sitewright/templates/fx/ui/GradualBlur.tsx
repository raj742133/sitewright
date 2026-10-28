'use client';
import { useState, type CSSProperties } from 'react';
import { Art, ART_VARIANTS, cx } from './_motion-a';

export type BlurEdge = 'top' | 'bottom' | 'left' | 'right';

export interface GradualBlurProps {
  /** Which edges of the parent get the blur. */
  edges?: BlurEdge[];
  /** Depth of the blurred band: any CSS length. */
  size?: string | number;
  /** Maximum blur radius in px at the very edge. */
  strength?: number;
  /** Number of stacked blur layers; more is smoother. */
  layers?: number;
  /** How quickly the blur builds toward the edge. */
  curve?: 'linear' | 'ease' | 'steep';
  /** Fade to this CSS colour at the edge (default: the surface token, 'none' for no tint). */
  tint?: string;
  /** Tint opacity at the edge, 0 to 1. */
  tintOpacity?: number;
  /** Pin to the viewport instead of the nearest positioned parent. */
  fixed?: boolean;
  className?: string;
  style?: CSSProperties;
}

const POW = { linear: 1, ease: 1.7, steep: 2.6 };
const DIR: Record<BlurEdge, string> = { bottom: 'to bottom', top: 'to top', right: 'to right', left: 'to left' };

function Band({ edge, size, strength, layers, curve, tint, tintOpacity }: Required<Pick<GradualBlurProps, 'size' | 'strength' | 'layers' | 'curve' | 'tint' | 'tintOpacity'>> & { edge: BlurEdge }) {
  const n = Math.max(2, Math.min(12, Math.round(layers)));
  const horizontal = edge === 'left' || edge === 'right';
  const dim = typeof size === 'number' ? size + 'px' : size;
  const box: CSSProperties = horizontal ? { [edge]: 0, top: 0, bottom: 0, width: dim } : { [edge]: 0, left: 0, right: 0, height: dim };
  const dir = DIR[edge];
  return (
    <div className="ui-gradual-blur-band" aria-hidden="true" data-edge={edge} style={box}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * 100, b = ((i + 1) / n) * 100;
        const px = Math.max(0.4, strength * 0.5 * Math.pow((i + 1) / n, POW[curve]));
        const mask = `linear-gradient(${dir}, transparent ${a.toFixed(1)}%, #000 ${b.toFixed(1)}%)`;
        return <span key={i} className="ui-gradual-blur-layer" style={{ backdropFilter: `blur(${px.toFixed(2)}px)`, WebkitBackdropFilter: `blur(${px.toFixed(2)}px)`, maskImage: mask, WebkitMaskImage: mask }} />;
      })}
      {tint !== 'none' && (
        <span className="ui-gradual-blur-tint" style={{ background: `linear-gradient(${dir}, transparent, color-mix(in srgb, ${tint} ${Math.round(tintOpacity * 100)}%, transparent))` }} />
      )}
    </div>
  );
}

/** Progressive edge blur: stacked backdrop-filter layers whose masks overlap so the content behind goes from sharp to soft toward the edge. Place it inside a position:relative parent (it ignores pointer events). */
export default function GradualBlur({ edges = ['bottom'], size = 96, strength = 14, layers = 7, curve = 'ease', tint = 'var(--surface, #fff)', tintOpacity = 0.55, fixed = false, className, style }: GradualBlurProps) {
  return (
    <div className={cx('ui-gradual-blur', fixed && 'is-fixed', className)} style={style} aria-hidden="true">
      {edges.map((e) => <Band key={e} edge={e} size={size} strength={strength} layers={layers} curve={curve} tint={tint} tintOpacity={tintOpacity} />)}
    </div>
  );
}

const SETS: { id: string; label: string; edges: BlurEdge[] }[] = [
  { id: 'bottom', label: 'Bottom', edges: ['bottom'] },
  { id: 'both', label: 'Top + bottom', edges: ['top', 'bottom'] },
  { id: 'right', label: 'Right', edges: ['right'] },
];

export function Demo() {
  const [set, setSet] = useState('bottom');
  const [strength, setStrength] = useState(14);
  const edges = SETS.find((s) => s.id === set)?.edges ?? ['bottom'];
  return (
    <div className="ui-gradual-blur-demo">
      <div className="ui-gradual-blur-bar">
        <div role="group" aria-label="Blurred edges" className="ui-gradual-blur-seg">
          {SETS.map((s) => <button key={s.id} type="button" aria-pressed={set === s.id} onClick={() => setSet(s.id)}>{s.label}</button>)}
        </div>
        <label>Strength <input type="range" min={0} max={28} value={strength} onChange={(e) => setStrength(Number(e.target.value))} aria-label="Blur strength" /></label>
      </div>
      <div className="ui-gradual-blur-stage">
        <div className="ui-gradual-blur-scroll" tabIndex={0} role="region" aria-label="Scrollable article">
          <h3>Field notes</h3>
          <p>Edge blur hints that there is more to scroll without drawing a hard line. The content is crisp in the middle and dissolves toward the edge.</p>
          <div className="ui-gradual-blur-grid">
            {ART_VARIANTS.map((v) => <Art key={v} variant={v} className="ui-gradual-blur-art" />)}
          </div>
          <p>Each band is a stack of backdrop-filter layers. Their masks overlap, so blur grows smoothly instead of in visible steps.</p>
          <p>Raise the strength, switch the edge, and scroll to see content slide into the soft zone.</p>
          <div className="ui-gradual-blur-grid">
            {[...ART_VARIANTS].reverse().map((v) => <Art key={v} variant={v} className="ui-gradual-blur-art" />)}
          </div>
        </div>
        <GradualBlur edges={edges} strength={strength} size={set === "right" ? "20%" : "34%"} />
      </div>
    </div>
  );
}
