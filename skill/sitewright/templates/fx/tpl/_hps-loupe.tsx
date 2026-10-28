'use client';
// "Under the loupe": a drawing with a real magnifier. A circular lens follows the pointer (or a finger drag, or the arrow keys)
// and shows the same vector artwork scaled up, so the fine stipple only appears when you look closely.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Plate, type PlateKind } from './_hps-art';

interface Work { id: PlateKind; title: string; medium: string; size: string; look: string }
const WORKS: Work[] = [
  { id: 'moth', title: 'Moth, found on the sill', medium: 'Ink and watercolour, 300 gsm cold press', size: '21 x 27 cm', look: 'Find the eye spot on the upper wing: it is stippled one dot at a time.' },
  { id: 'fern', title: 'Fern, north window', medium: 'Dip pen and a single green wash', size: '18 x 24 cm', look: 'Every frond carries a midrib thinner than a hair.' },
  { id: 'wren', title: 'Wren on the fence', medium: 'Fineliner and gouache', size: '15 x 20 cm', look: 'The breast feathers are built from hundreds of tiny dots.' },
];
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function Loupe({ name }: { name: string }) {
  const [w, setW] = useState(0);
  const [idx, setIdx] = useState(0);
  const [on, setOn] = useState(true);
  const [zoom, setZoom] = useState(2.8);
  const [pos, setPos] = useState({ x: 0.36, y: 0.4 });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const f = () => setW(el.clientWidth);
    f();
    const ro = new ResizeObserver(f);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const work = WORKS[idx]!;
  const h = w * 1.3;
  const D = clamp(w * 0.46, 104, 190);
  const at = (e: PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || !r.width) return;
    setPos({ x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) });
  };
  const key = (e: KeyboardEvent) => {
    const s = e.shiftKey ? 0.12 : 0.04;
    const d: Record<string, [number, number]> = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
    if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom((z) => clamp(z + 0.4, 2, 4)); return; }
    if (e.key === '-') { e.preventDefault(); setZoom((z) => clamp(z - 0.4, 2, 4)); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOn((v) => !v); return; }
    const m = d[e.key];
    if (m && on) { e.preventDefault(); setPos((p) => ({ x: clamp(p.x + m[0], 0, 1), y: clamp(p.y + m[1], 0, 1) })); }
  };
  return (
    <div className="hps-lp">
      <div className="hps-lp-col">
        <div
          ref={ref}
          className="hps-lp-stage"
          tabIndex={0}
          role="group"
          aria-label={`${work.title}. Loupe ${on ? 'on' : 'off'}. Arrow keys move the lens, plus and minus change magnification, Enter toggles it.`}
          onPointerMove={(e) => { if (on && (e.pointerType !== 'touch' || e.buttons)) at(e); }}
          onPointerDown={(e) => { if (on) at(e); }}
          onKeyDown={key}
          data-on={on ? 'true' : undefined}
        >
          <div className="hps-lp-paper"><Plate kind={work.id} detail label={`${work.title}, ink and watercolour drawing`} /></div>
          {on && w > 0 && (
            <div className="hps-lens" aria-hidden="true" style={{ width: D, height: D, left: pos.x * w - D / 2, top: pos.y * h - D / 2 }}>
              <div className="hps-lens-glass">
                <div className="hps-lens-in" style={{ width: w, height: h, transform: `translate(${D / 2 - pos.x * w * zoom}px, ${D / 2 - pos.y * h * zoom}px) scale(${zoom})` }}>
                  <Plate kind={work.id} detail />
                </div>
                <span className="hps-lens-glint" />
              </div>
              <span className="hps-lens-handle" />
            </div>
          )}
        </div>
        <p className="hps-lp-hint">{on ? 'Move over the drawing, drag a finger, or use the arrow keys.' : 'Loupe is off. Turn it on to look closer.'}</p>
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
          <label className="hps-range"><span>Magnify <b>{zoom.toFixed(1)}x</b></span><input type="range" min={2} max={4} step={0.2} value={zoom} disabled={!on} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Magnification" /></label>
        </div>
      </div>
    </div>
  );
}
