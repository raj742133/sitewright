'use client';
// "Under the loupe": a real glass lens (the library's Fluid glass) over a drawing. The lens bends the rim of what is behind it and shows
// the same artwork larger, so the fine stipple only appears when you look closely. Drag it, or focus it and use the arrow keys.
import { useState } from 'react';
import FluidGlass from '../ui/FluidGlass';
import { Plate, type PlateKind } from './_hps-art';

interface Work { id: PlateKind; title: string; medium: string; size: string; look: string }
const WORKS: Work[] = [
  { id: 'moth', title: 'Moth, found on the sill', medium: 'Ink and watercolour, 300 gsm cold press', size: '21 x 27 cm', look: 'The eye spot on the upper wing is stippled one dot at a time.' },
  { id: 'fern', title: 'Fern, north window', medium: 'Dip pen and a single green wash', size: '18 x 24 cm', look: 'Every frond carries a midrib thinner than a hair.' },
  { id: 'wren', title: 'Wren on the fence', medium: 'Fineliner and gouache', size: '15 x 20 cm', look: 'The breast feathers are built from hundreds of tiny dots.' },
];

export function Loupe({ name }: { name: string }) {
  const [idx, setIdx] = useState(0);
  const [on, setOn] = useState(true);
  const [zoom, setZoom] = useState(2.6);
  const work = WORKS[idx]!;
  return (
    <div className="hps-lp">
      <div className="hps-lp-col">
        <div className="hps-lp-stage" data-on={on ? 'true' : undefined}>
          {on ? (
            <FluidGlass key={work.id} lensWidth={170} lensHeight={170} radius={85} magnify={zoom} refraction={18} drift={false} defaultPosition={{ x: 0.5, y: 0.42 }}>
              <div className="hps-lp-paper"><Plate kind={work.id} detail /></div>
            </FluidGlass>
          ) : (
            <div className="hps-lp-paper hps-lp-plain"><Plate kind={work.id} detail label={`${work.title}, ink and watercolour drawing`} /></div>
          )}
        </div>
        <p className="hps-lp-hint">{on ? 'Drag the lens over the drawing, or focus it and use the arrow keys.' : 'The loupe is off. Switch it on to look closer.'}</p>
      </div>
      <div className="hps-lp-side">
        <p className="hps-eyebrow">Under the loupe</p>
        <h2 className="hps-h2">Look a little closer.</h2>
        <p className="hps-lede">The big picture is only half of it. {name} builds texture from thousands of small marks, and they are all here at full resolution.</p>
        <div className="hps-lp-pick" role="radiogroup" aria-label="Choose a drawing">
          {WORKS.map((x, i) => (
            <button key={x.id} type="button" role="radio" aria-checked={i === idx} className="hps-thumb" onClick={() => setIdx(i)}>
              <span aria-hidden="true"><Plate kind={x.id} /></span>
              <b>{x.title}</b>
            </button>
          ))}
        </div>
        <dl className="hps-lp-meta"><div><dt>Medium</dt><dd>{work.medium}</dd></div><div><dt>Size</dt><dd>{work.size}</dd></div><div><dt>Look for</dt><dd>{work.look}</dd></div></dl>
        <div className="hps-lp-ctl">
          <button type="button" role="switch" aria-checked={on} className="hps-switch" onClick={() => setOn((v) => !v)}><i aria-hidden="true" />Loupe {on ? 'on' : 'off'}</button>
          <label className="hps-range"><span>Magnify <b>{zoom.toFixed(1)}x</b></span><input type="range" min={1.6} max={4} step={0.2} value={zoom} disabled={!on} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Magnification" /></label>
        </div>
      </div>
    </div>
  );
}
