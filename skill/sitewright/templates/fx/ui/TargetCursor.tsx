'use client';
import { useEffect, useRef } from 'react';
import { boxIn, createField, ease, useCoarsePointer, useReducedMotion, watchFocus, type CursorFxProps } from './_cursor-kit';
import { Stage } from './_cursor-stage';

export interface TargetCursorProps extends CursorFxProps {
  /** CSS selector for the elements the reticle locks onto. */
  selector?: string;
  /** Edge length of the free-floating reticle, in px. */
  size?: number;
  /** Space between a locked element and the brackets, in px. */
  padding?: number;
}

const CORNERS: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

/** Four corner brackets spin around the pointer and snap onto links, buttons and anything matching `selector` when you hover them; keyboard focus locks them too. On touch they cycle through the targets by themselves and lock onto the one you tap. The real cursor stays visible. Scoped to its box unless `global`. */
export default function TargetCursor({ children, className, style, global = false, idle = 'touch', selector = 'a, button, [role="button"], [data-target]', size = 34, padding = 7 }: TargetCursorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();

  useEffect(() => {
    const host = hostRef.current, layer = layerRef.current;
    if (!host || !layer) return;
    const grp = layer.querySelector<HTMLElement>('.ui-target-cursor-group');
    const dot = layer.querySelector<HTMLElement>('.ui-target-cursor-dot');
    const cs = Array.from(layer.querySelectorAll<HTMLElement>('.ui-target-cursor-corner'));
    if (!grp || !dot || cs.length !== 4) return;
    const R = { cx: 0, cy: 0, w: size, h: size }; // current rect (centre + size)
    let ang = 0, tang = 0, init = false, presence = 0, hoverEl: Element | null = null, kbEl: HTMLElement | null = null, lockedTo: Element | null = null, lastTap = -9;
    const match = (el: Element | null) => { const m = el && el.closest ? el.closest(selector) : null; return m && (global || host.contains(m)) ? m : null; };
    const offFocus = watchFocus(global ? document : host, (el) => !!match(el), (el) => { kbEl = el; fx.wake(); });
    const onOver = (e: Event) => { hoverEl = match(e.target as Element | null); fx.wake(); };
    const evt: EventTarget = global ? window : host;
    evt.addEventListener('pointerover', onOver, { passive: true } as AddEventListenerOptions);
    const fx = createField(host, layer, { global, idle, reduced, coarse }, {
      move: () => { kbEl = null; },
      down: (f) => { lastTap = f.t; if (!reduced) grp.animate([{ scale: '1' }, { scale: '1.28' }, { scale: '1' }], { duration: 360, easing: 'ease-out' }); },
      frame: (f) => {
        const here = f.seen && (f.inside || f.auto);
        let target: Element | null = null;
        if (f.auto) {
          const list = Array.from((global ? document : host).querySelectorAll(selector)).filter((n) => n.getClientRects().length);
          if (list.length) target = list[Math.floor(f.t / 2.4) % list.length]!;
        } else if (f.inside) target = hoverEl && hoverEl.isConnected ? hoverEl : null;
        else if (kbEl && kbEl.isConnected) target = kbEl;
        if (reduced && !f.seen && !kbEl) target = null;
        if (target !== lockedTo) { lockedTo = target; tang = target ? Math.round(ang / 360) * 360 : tang; }
        presence = reduced ? 1 : ease(presence, here || kbEl ? 1 : 0, 9, f.dt);
        let gx = f.x, gy = f.y, gw = size, gh = size;
        if (lockedTo) { const b = boxIn(layer, lockedTo); gx = b.cx; gy = b.cy; gw = b.w + padding * 2; gh = b.h + padding * 2; }
        if (!init) { R.cx = gx; R.cy = gy; init = true; }
        const free = !lockedTo && !reduced && here;
        if (free) { ang += f.dt * 70; tang = ang; } else if (!lockedTo && reduced) { tang = 0; }
        const k = reduced ? 1000 : 16;
        R.cx = ease(R.cx, gx, k, f.dt); R.cy = ease(R.cy, gy, k, f.dt); R.w = ease(R.w, gw, k, f.dt); R.h = ease(R.h, gh, k, f.dt);
        if (!free) ang = reduced ? tang : ease(ang, tang, 14, f.dt);
        const arm = Math.max(7, Math.min(11, Math.min(R.w, R.h) * 0.32));
        grp.style.transform = `translate(${R.cx.toFixed(1)}px, ${R.cy.toFixed(1)}px) rotate(${ang.toFixed(1)}deg)`;
        cs.forEach((c, i) => {
          const [sx, sy] = CORNERS[i]!;
          c.style.width = c.style.height = arm.toFixed(1) + 'px';
          c.style.transform = `translate(${(sx * R.w / 2 - (sx > 0 ? arm : 0)).toFixed(1)}px, ${(sy * R.h / 2 - (sy > 0 ? arm : 0)).toFixed(1)}px)`;
        });
        dot.style.transform = `translate(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px) translate(-50%,-50%)`;
        dot.style.opacity = lockedTo || f.auto || !f.seen ? '0' : '1';
        layer.style.opacity = presence.toFixed(3);
        const settled = Math.abs(R.cx - gx) + Math.abs(R.cy - gy) + Math.abs(R.w - gw) + Math.abs(R.h - gh) + Math.abs(ang - tang) < 0.4;
        return !reduced && (free || !settled || (presence > 0.01 && presence < 0.99) || (!here && !kbEl && presence > 0.01) || f.t - lastTap < 0.5);
      },
    });
    return () => { offFocus(); evt.removeEventListener('pointerover', onOver); fx.dispose(); };
  }, [global, idle, reduced, coarse, selector, size, padding]);

  return (
    <div ref={hostRef} className={`ui-target-cursor-root ${className ?? ''}`} style={style}>
      {children}
      <div ref={layerRef} className={`ui-target-cursor-layer${global ? ' ui-target-cursor-global' : ''}`} aria-hidden="true" style={{ opacity: 0 }}>
        <div className="ui-target-cursor-group">
          {CORNERS.map((_, i) => <span key={i} className={`ui-target-cursor-corner ui-target-cursor-c${i}`} />)}
        </div>
        <span className="ui-target-cursor-dot" />
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <TargetCursor idle="always">
      <Stage eyebrow="Target cursor" title="Lock on" text="Brackets snap onto whatever you can press.">
        <span className="ui-target-cursor-demo-row">
          <a className="ui-target-cursor-demo-btn" href="#a" onClick={(e) => e.preventDefault()}>Deploy</a>
          <button type="button" className="ui-target-cursor-demo-btn">Preview</button>
          <a className="ui-target-cursor-demo-btn" href="#b" onClick={(e) => e.preventDefault()}>Docs</a>
        </span>
      </Stage>
    </TargetCursor>
  );
}
