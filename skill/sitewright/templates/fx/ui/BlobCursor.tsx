'use client';
import { useEffect, useId, useRef } from 'react';
import { boxIn, createField, ease, useCoarsePointer, useReducedMotion, watchFocus, type CursorFxProps } from './_cursor-kit';
import { Stage } from './_cursor-stage';

export interface BlobCursorProps extends CursorFxProps {
  /** Radius of the leading blob in px. */
  size?: number;
  /** CSS selector for elements the blob swells over. */
  grow?: string;
}

const LAG = [26, 15, 10, 7, 5, 3.6];
const SCALE = [1, 0.84, 0.68, 0.54, 0.42, 0.3];

/** A gooey blob chases the pointer, with smaller droplets stretching behind it and merging into it. It swells over links and buttons, squashes on press, and follows keyboard focus; on touch it floats on its own and jumps to taps. The real cursor stays visible. Scoped to its box unless `global`. */
export default function BlobCursor({ children, className, style, global = false, idle = 'touch', size = 22, grow = 'a, button, [role="button"], input, select, textarea, summary, [data-blob-grow]' }: BlobCursorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const gooId = 'ui-blob-cursor-' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();

  useEffect(() => {
    const host = hostRef.current, layer = layerRef.current;
    if (!host || !layer) return;
    const dots = Array.from(layer.querySelectorAll<SVGCircleElement>('circle'));
    const group = layer.querySelector<SVGGElement>('g');
    if (!group || !dots.length) return;
    const pos = dots.map(() => ({ x: 0, y: 0 }));
    let init = false, presence = 0, swell = 1, press = 1, hoverEl: Element | null = null, kbEl: HTMLElement | null = null;
    const offFocus = watchFocus(global ? document : host, () => true, (el) => { kbEl = el; fx.wake(); });
    const onOver = (e: Event) => { const t = e.target as Element | null; hoverEl = t && t.closest ? t.closest(grow) : null; fx.wake(); };
    const evt: EventTarget = global ? window : host;
    evt.addEventListener('pointerover', onOver, { passive: true } as AddEventListenerOptions);
    const fx = createField(host, layer, { global, idle, reduced, coarse }, {
      down: () => { press = 0.72; },
      move: () => { kbEl = null; },
      frame: (f) => {
        const here = f.seen && (f.inside || f.auto);
        let tx = f.x, ty = f.y, tr = 1;
        if (kbEl && !f.inside) { const b = boxIn(layer, kbEl); tx = b.cx; ty = b.cy; tr = Math.max(1.4, Math.min(3.2, Math.max(b.w, b.h) / (size * 2.2))); }
        else if (f.inside && hoverEl) tr = 2.1;
        const live = here || !!kbEl;
        presence = reduced ? 1 : ease(presence, live ? 1 : 0, 7, f.dt);
        if (!init) { pos.forEach((p) => { p.x = tx; p.y = ty; }); init = true; }
        swell = reduced ? tr : ease(swell, tr, 12, f.dt);
        press = reduced ? 1 : ease(press, 1, 9, f.dt);
        let moving = false;
        dots.forEach((c, i) => {
          const p = pos[i]!;
          if (reduced) { p.x = tx; p.y = ty; } else { p.x = ease(p.x, tx, LAG[i]!, f.dt); p.y = ease(p.y, ty, LAG[i]!, f.dt); }
          if (Math.abs(p.x - tx) + Math.abs(p.y - ty) > 0.3) moving = true;
          c.setAttribute('cx', p.x.toFixed(1)); c.setAttribute('cy', p.y.toFixed(1));
          c.setAttribute('r', (size * SCALE[i]! * (i === 0 ? swell * press : 1 + (swell - 1) * 0.35)).toFixed(1));
        });
        group.style.opacity = (presence * (hoverEl && f.inside ? 0.42 : 0.82)).toFixed(3);
        return moving || presence > 0.01 && presence < 0.99 || Math.abs(swell - tr) > 0.01 || press < 0.99;
      },
    });
    return () => { offFocus(); evt.removeEventListener('pointerover', onOver); fx.dispose(); };
  }, [global, idle, reduced, coarse, size, grow]);

  return (
    <div ref={hostRef} className={`ui-blob-cursor-root ${className ?? ''}`} style={style}>
      {children}
      <div ref={layerRef} className={`ui-blob-cursor-layer${global ? ' ui-blob-cursor-global' : ''}`} aria-hidden="true">
        <svg className="ui-blob-cursor-svg" width="100%" height="100%" focusable="false">
          <defs>
            <filter id={gooId} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
              <feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
            </filter>
          </defs>
          <g filter={`url(#${gooId})`} className="ui-blob-cursor-goo" style={{ opacity: 0 }}>
            {LAG.map((_, i) => <circle key={i} cx={-100} cy={-100} r={0} />)}
          </g>
        </svg>
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <BlobCursor idle="always">
      <Stage eyebrow="Blob cursor" title="Gooey follower" text="Droplets stretch behind the lead blob and merge back.">
        <a className="ui-blob-cursor-demo-link" href="#blob" onClick={(e) => e.preventDefault()}>Hover me</a>
      </Stage>
    </BlobCursor>
  );
}
