'use client';
import { useEffect, useRef } from 'react';
import { boxIn, createField, ease, useCoarsePointer, useReducedMotion, watchFocus, type CursorFxProps } from './_cursor-kit';
import { Stage } from './_cursor-stage';

export interface CrosshairProps extends CursorFxProps {
  /** Empty space around the centre, in px. */
  gap?: number;
  /** Snap the crosshair to a grid of this many px (0 = free). */
  snap?: number;
  /** Show the x / y readout chip. */
  readout?: boolean;
  /** Draw ticked rulers along the top and left edges. */
  rulers?: boolean;
}

/** Full-length guide lines cross at the pointer with a small reticle, edge rulers and a live x / y readout. A press pulses the reticle, keyboard focus moves it onto the focused element, and on touch it scans by itself and jumps to taps. The real cursor stays visible. Scoped to its box unless `global`. */
export default function Crosshair({ children, className, style, global = false, idle = 'touch', gap = 12, snap = 0, readout = true, rulers = true }: CrosshairProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();

  useEffect(() => {
    const host = hostRef.current, layer = layerRef.current;
    if (!host || !layer) return;
    const q = (c: string) => layer.querySelector<HTMLElement>('.ui-crosshair-' + c);
    const up = q('up'), down = q('down'), left = q('left'), right = q('right'), ring = q('ring'), chip = q('chip');
    const tx = q('tick-x'), ty = q('tick-y'), root = layer.firstElementChild as HTMLElement | null;
    if (!up || !down || !left || !right || !ring || !chip || !tx || !ty || !root) return;
    let cx = 0, cy = 0, init = false, presence = 0, kbEl: HTMLElement | null = null, label = '';
    const offFocus = watchFocus(global ? document : host, () => true, (el) => { kbEl = el; fx.wake(); });
    const fx = createField(host, layer, { global, idle, reduced, coarse }, {
      move: () => { kbEl = null; },
      down: () => { if (!reduced) ring.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(2.1)', opacity: 0.2 }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 420, easing: 'ease-out' }); },
      frame: (f) => {
        const here = f.seen && (f.inside || f.auto);
        let px = f.x, py = f.y;
        if (kbEl && !f.inside) { const b = boxIn(layer, kbEl); px = b.cx; py = b.cy; }
        if (snap > 0) { px = Math.round(px / snap) * snap; py = Math.round(py / snap) * snap; }
        presence = reduced ? 1 : ease(presence, here || kbEl ? 1 : 0, 8, f.dt);
        if (!init) { cx = px; cy = py; init = true; }
        if (reduced) { cx = px; cy = py; } else { cx = ease(cx, px, 26, f.dt); cy = ease(cy, py, 26, f.dt); }
        const W = f.w, H = f.h;
        const lx = Math.max(0, cx - gap), rx = Math.max(0, W - cx - gap), uy = Math.max(0, cy - gap), dy = Math.max(0, H - cy - gap);
        up.style.transform = `translateX(${cx.toFixed(1)}px) scaleY(${(uy / H).toFixed(4)})`;
        down.style.transform = `translateX(${cx.toFixed(1)}px) scaleY(${(dy / H).toFixed(4)})`;
        left.style.transform = `translateY(${cy.toFixed(1)}px) scaleX(${(lx / W).toFixed(4)})`;
        right.style.transform = `translateY(${cy.toFixed(1)}px) scaleX(${(rx / W).toFixed(4)})`;
        ring.style.left = cx.toFixed(1) + 'px'; ring.style.top = cy.toFixed(1) + 'px';
        tx.style.transform = `translateX(${cx.toFixed(1)}px)`; ty.style.transform = `translateY(${cy.toFixed(1)}px)`;
        const text = `${Math.round(cx)}, ${Math.round(cy)}`;
        if (text !== label) { label = text; chip.textContent = text; }
        const flipX = cx > W - 96, flipY = cy > H - 40;
        chip.style.transform = `translate(${(cx + (flipX ? -14 : 14)).toFixed(1)}px, ${(cy + (flipY ? -14 : 14)).toFixed(1)}px) translate(${flipX ? '-100%' : '0'}, ${flipY ? '-100%' : '0'})`;
        root.style.opacity = presence.toFixed(3);
        return reduced ? false : Math.abs(cx - px) + Math.abs(cy - py) > 0.2 || (presence > 0.01 && presence < 0.99) || (!here && !kbEl && presence > 0.01);
      },
    });
    return () => { offFocus(); fx.dispose(); };
  }, [global, idle, reduced, coarse, gap, snap]);

  return (
    <div ref={hostRef} className={`ui-crosshair-root ${className ?? ''}`} style={style}>
      {children}
      <div ref={layerRef} className={`ui-crosshair-layer${global ? ' ui-crosshair-global' : ''}`} aria-hidden="true">
        <div className="ui-crosshair-scene" style={{ opacity: 0 }}>
          <span className="ui-crosshair-line ui-crosshair-up" />
          <span className="ui-crosshair-line ui-crosshair-down" />
          <span className="ui-crosshair-line ui-crosshair-left" />
          <span className="ui-crosshair-line ui-crosshair-right" />
          {rulers && <span className="ui-crosshair-ruler ui-crosshair-ruler-x"><i className="ui-crosshair-tick-x" /></span>}
          {rulers && <span className="ui-crosshair-ruler ui-crosshair-ruler-y"><i className="ui-crosshair-tick-y" /></span>}
          <span className="ui-crosshair-ring"><b /></span>
          {readout && <span className="ui-crosshair-chip" />}
        </div>
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <Crosshair idle="always">
      <Stage eyebrow="Crosshair" title="Read the coordinates" text="Guide lines, rulers and a live readout track the pointer." />
    </Crosshair>
  );
}
