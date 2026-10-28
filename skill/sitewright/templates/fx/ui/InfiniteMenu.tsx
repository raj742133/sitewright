'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { Icon, Stage, useReducedMotion, useRoving } from './_menus-kit';
import { watchLive } from './_t2';
import { I3, apply3, axisAngle, fibSphere, mul3, orthonormal, rotX, rotY, type M3, type V3 } from './_menus-sphere';

export interface InfiniteItem { title: string; desc?: string; href?: string; icon?: string }
export interface InfiniteMenuProps {
  items?: InfiniteItem[];
  /** Slowly turn the sphere until the visitor first touches it (always off under reduced motion). */
  autoRotate?: boolean;
  onSelect?: (item: InfiniteItem, index: number) => void;
  label?: string;
  className?: string;
  style?: CSSProperties;
}
const NAMES = ['Atlas', 'Beacon', 'Cinder', 'Delta', 'Ember', 'Fjord', 'Grove', 'Harbor', 'Ion', 'Juniper', 'Kite', 'Lumen', 'Meadow', 'Nova', 'Orbit', 'Prism', 'Quartz', 'Ridge'];
const GLYPHS = ['home', 'star', 'bolt', 'camera', 'music', 'folder', 'chat', 'grid', 'mail'];
const ITEMS: InfiniteItem[] = NAMES.map((t, i) => ({ title: t, desc: ['A quiet corner of the collection.', 'Fresh arrivals, hand picked.', 'Small pieces, big ideas.', 'Notes from the workshop.'][i % 4], href: '#' + t.toLowerCase(), icon: GLYPHS[i % GLYPHS.length] }));

/** Menu items orbit on a sphere. Drag (mouse, pen or touch) to spin it with inertia; it settles with the nearest item facing you and describes it below.
 *  Keyboard: arrow keys step through the items (roving tabindex, one tab stop), Enter opens the facing item. Previous / Next buttons give a no-drag path.
 *  Items on the far side are dimmed and not clickable. The sphere is drawn with transformed DOM nodes inside its own box: no canvas, no fixed positioning. */
export default function InfiniteMenu({ items = ITEMS, autoRotate = true, onSelect, label = 'Collection', className = '', style }: InfiniteMenuProps) {
  const n = items.length;
  const reduced = useReducedMotion();
  const pts = useMemo(() => fibSphere(n), [n]);
  const [front, setFront] = useState(0);
  const rov = useRoving(n, 'both');
  const stage = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLLIElement | null)[]>([]);
  const sim = useRef({ R: I3() as M3, wx: 0, wy: 0, mode: 'drift' as 'drift' | 'drag' | 'inertia' | 'snap' | 'idle', target: -1, engaged: false, raf: 0, live: true, front: 0, down: false, moved: 0, lx: 0, ly: 0, k: 0.006 });
  const opts = useRef({ pts, reduced, autoRotate, n });
  useEffect(() => { opts.current = { pts, reduced, autoRotate, n }; });

  const paint = useCallback(() => {
    const s = sim.current, o = opts.current;
    let best = 0, bz = -2;
    o.pts.forEach((p, i) => {
      const v = apply3(s.R, p);
      if (v[2] > bz) { bz = v[2]; best = i; }
      const el = nodes.current[i];
      if (!el) return;
      const t = (v[2] + 1) / 2;
      el.style.transform = nodeT(v);
      el.style.opacity = (0.18 + 0.82 * Math.pow(t, 1.6)).toFixed(3);
      el.style.zIndex = String(Math.round(t * 100));
      el.style.pointerEvents = v[2] < -0.05 ? 'none' : 'auto';
    });
    if (best !== s.front) { s.front = best; setFront(best); }
  }, []);

  const loop = useCallback((t: number) => {
    const s = sim.current, o = opts.current;
    s.raf = 0;
    if (s.mode === 'drift') {
      if (o.reduced || !o.autoRotate || s.engaged) s.mode = s.engaged ? 'snap' : 'idle';
      else s.R = mul3(rotY(0.0035), s.R);
    }
    if (s.mode === 'inertia') {
      s.R = mul3(mul3(rotY(s.wx), rotX(s.wy)), s.R);
      s.wx *= 0.94; s.wy *= 0.94;
      if (Math.hypot(s.wx, s.wy) < 0.0006) { s.mode = 'snap'; s.target = -1; }
    }
    if (s.mode === 'snap') {
      const idx = s.target >= 0 ? s.target : s.front;
      const v = apply3(s.R, o.pts[idx] ?? [0, 0, 1]);
      const ang = Math.acos(Math.max(-1, Math.min(1, v[2])));
      if (ang < 0.002 || o.reduced) {
        if (o.reduced || ang >= 0.002) { s.R = alignInstant(s.R, v); }
        s.mode = 'idle';
      } else {
        const ax: V3 = [v[1], -v[0], 0];
        const l = Math.hypot(ax[0], ax[1]);
        const axis: V3 = l < 1e-6 ? [0, 1, 0] : [ax[0] / l, ax[1] / l, 0];
        s.R = mul3(axisAngle(axis, Math.max(0.003, ang * 0.13)), s.R);
      }
    }
    s.R = orthonormal(s.R);
    paint();
    void t;
    if (s.mode !== 'idle' && s.mode !== 'drag' && s.live) s.raf = requestAnimationFrame(loop);
  }, [paint]);
  const kick = useCallback(() => { const s = sim.current; if (!s.raf && s.live && s.mode !== 'idle') s.raf = requestAnimationFrame(loop); }, [loop]);

  useEffect(() => {
    const s = sim.current;
    paint();
    const el = stage.current;
    const off = el ? watchLive(el, (v) => { s.live = v; if (v) kick(); }) : undefined;
    kick();
    return () => { off?.(); if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0; };
  }, [paint, kick]);
  useEffect(() => { if (reduced) { const s = sim.current; s.mode = 'snap'; s.target = -1; kick(); } }, [reduced, kick]);

  const snapTo = (i: number) => { const s = sim.current; s.engaged = true; s.target = i; s.mode = 'snap'; kick(); };
  const stepBy = (d: number) => { const i = (sim.current.front + d + n) % n; rov.focusAt(i); snapTo(i); };

  const down = (e: PointerEvent) => {
    const s = sim.current, el = stage.current;
    if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const r = el.getBoundingClientRect();
    s.k = 1 / (Math.min(r.width, r.height) * 0.34);
    s.down = true; s.moved = 0; s.lx = e.clientX; s.ly = e.clientY; s.wx = 0; s.wy = 0; s.engaged = true; s.mode = 'drag';
    el.setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    const s = sim.current;
    if (!s.down) return;
    const dx = e.clientX - s.lx, dy = e.clientY - s.ly;
    s.lx = e.clientX; s.ly = e.clientY; s.moved += Math.abs(dx) + Math.abs(dy);
    s.wx = dx * s.k; s.wy = dy * s.k;
    s.R = orthonormal(mul3(mul3(rotY(s.wx), rotX(s.wy)), s.R));
    paint();
  };
  const up = () => {
    const s = sim.current;
    if (!s.down) return;
    s.down = false;
    s.mode = s.moved > 6 && !opts.current.reduced ? 'inertia' : 'snap';
    s.target = -1; kick();
  };
  const choose = (i: number) => {
    if (sim.current.moved > 6) return;
    if (i === sim.current.front) { const it = items[i]; if (it) onSelect?.(it, i); } else { rov.setIndex(i); snapTo(i); }
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') stepBy(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') stepBy(-1);
    else if (e.key === 'Home') { rov.focusAt(0); snapTo(0); } else if (e.key === 'End') { rov.focusAt(n - 1); snapTo(n - 1); }
    else return;
    e.preventDefault();
  };
  const cur = items[front];
  return (
    <div className={`ui-infinite-menu-root ${className}`} style={style}>
      <div ref={stage} className="ui-infinite-menu-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="ui-infinite-menu-halo" aria-hidden="true" />
        <ul className="ui-infinite-menu-list" aria-label={label} onKeyDown={key}>
          {items.map((it, i) => (
            <li key={it.title} ref={(el) => { nodes.current[i] = el; }} className="ui-infinite-menu-node" style={{ transform: nodeT(apply3(I3(), pts[i] ?? [0, 0, 1])), ['--h' as string]: Math.round((i / n) * 100) + '%' }}>
              <button type="button" className={`ui-infinite-menu-tile${i === front ? ' is-front' : ''}`} {...rov.item(i)} aria-label={it.title} aria-current={i === front ? 'true' : undefined}
                onFocus={(e) => { rov.item(i).onFocus(); if (e.currentTarget.matches(':focus-visible') && i !== sim.current.front) snapTo(i); }}
                onClick={() => choose(i)}>
                <Icon name={it.icon ?? 'star'} size={22} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="ui-infinite-menu-cap">
        <button type="button" className="ui-infinite-menu-step" aria-label="Previous item" onClick={() => stepBy(-1)}><Icon name="arrow" size={18} className="flip" /></button>
        <div className="ui-infinite-menu-info" aria-live="polite">
          <strong>{cur?.title}</strong>
          <span>{cur?.desc}</span>
        </div>
        <a className="ui-infinite-menu-open" href={cur?.href ?? '#'} onClick={(e) => { if (!cur?.href || cur.href === '#') e.preventDefault(); if (cur) onSelect?.(cur, front); }} aria-label={`Open ${cur?.title ?? ''}`}>Open</a>
        <button type="button" className="ui-infinite-menu-step" aria-label="Next item" onClick={() => stepBy(1)}><Icon name="arrow" size={18} /></button>
      </div>
    </div>
  );
}

function nodeT(v: V3): string {
  const t = (v[2] + 1) / 2, sc = 0.45 + 0.7 * t;
  return `translate(calc(var(--rad) * ${v[0].toFixed(4)}), calc(var(--rad) * ${(-v[1]).toFixed(4)})) scale(${sc.toFixed(3)})`;
}
function alignInstant(R: M3, v: V3): M3 {
  const ang = Math.acos(Math.max(-1, Math.min(1, v[2])));
  const l = Math.hypot(v[0], v[1]);
  return l < 1e-6 ? R : mul3(axisAngle([v[1] / l, -v[0] / l, 0], ang), R);
}

export function Demo() {
  return <Stage align="stretch"><InfiniteMenu /></Stage>;
}
