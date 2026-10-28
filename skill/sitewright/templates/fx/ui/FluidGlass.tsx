'use client';
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { useReducedMotion, watchLive } from './_t2';
import { lensMap } from './_inputs-lensmap';
import { clampN } from './_inputs-ui';

export interface FluidGlassProps {
  /** The scene the lens sits over. It is drawn twice (once plain, once refracted inside the lens), so keep it static markup. */
  children?: ReactNode;
  lensWidth?: number;
  lensHeight?: number;
  /** Corner radius of the lens in px (large = pill/round). */
  radius?: number;
  /** Magnification inside the lens (1 = none). */
  magnify?: number;
  /** Edge refraction strength in px. */
  refraction?: number;
  /** Starting centre as fractions of the container. */
  defaultPosition?: { x: number; y: number };
  /** Lets the lens wander slowly by itself until it is moved. */
  drift?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A glass lens you can drag over any scene. The scene is re-rendered inside the lens, magnified, with an SVG displacement map that bends the
 * rim (with a small red/blue split) so what is behind the glass really appears refracted. Arrow keys move it.
 */
export default function FluidGlass({ children, lensWidth = 150, lensHeight = 110, radius = 55, magnify = 1.18, refraction = 22, defaultPosition = { x: 0.5, y: 0.5 }, drift = true, className, style }: FluidGlassProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null); // lens centre in px
  const [map, setMap] = useState('');
  const [dragging, setDragging] = useState(false);
  const moved = useRef(false);
  const live = useRef(true);
  const posRef = useRef(pos);
  posRef.current = pos;
  const lw = Math.min(lensWidth, size.w || lensWidth), lh = Math.min(lensHeight, size.h || lensHeight);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    const off = watchLive(el, (l) => { live.current = l; });
    return () => { ro.disconnect(); off(); };
  }, []);
  useEffect(() => { if (size.w && !posRef.current) setPos({ x: size.w * defaultPosition.x, y: size.h * defaultPosition.y }); }, [size, defaultPosition.x, defaultPosition.y]);
  useEffect(() => { setMap(lensMap(lw, lh, radius, Math.min(lw, lh) * 0.42)); }, [lw, lh, radius]);

  // gentle wander until the user takes over
  useEffect(() => {
    if (!drift || reduced || moved.current || !size.w) return;
    let raf = 0; const t0 = performance.now();
    const base = { x: size.w * defaultPosition.x, y: size.h * defaultPosition.y };
    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      if (!live.current || moved.current) return;
      const s = (t - t0) / 1000;
      setPos({ x: base.x + Math.sin(s * 0.7) * size.w * 0.22, y: base.y + Math.sin(s * 1.1 + 1) * size.h * 0.14 });
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [drift, reduced, size, defaultPosition.x, defaultPosition.y]);

  const clampPos = (x: number, y: number) => ({ x: clampN(x, lw / 2, Math.max(lw / 2, size.w - lw / 2)), y: clampN(y, lh / 2, Math.max(lh / 2, size.h - lh / 2)) });
  const toLocal = (e: PointerEvent) => { const r = root.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const off = useRef({ x: 0, y: 0 });
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toLocal(e);
    off.current = { x: pos.x - p.x, y: pos.y - p.y };
    moved.current = true; setDragging(true);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => { if (!dragging) return; const p = toLocal(e); setPos(clampPos(p.x + off.current.x, p.y + off.current.y)); };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!pos) return;
    const s = e.shiftKey ? 48 : 16;
    const d: Record<string, [number, number]> = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
    if (e.key === 'Home') { moved.current = true; setPos(clampPos(size.w * defaultPosition.x, size.h * defaultPosition.y)); e.preventDefault(); return; }
    const v = d[e.key];
    if (!v) return;
    e.preventDefault(); moved.current = true;
    setPos(clampPos(pos.x + v[0], pos.y + v[1]));
  };

  const x = pos ? pos.x - lw / 2 : 0, y = pos ? pos.y - lh / 2 : 0;
  const ox = pos ? pos.x : 0, oy = pos ? pos.y : 0;
  const fid = `ui-fg-${uid}`;
  const ready = !!pos && size.w > 0;
  return (
    <div ref={root} className={`ui-fluid-glass-root ${className ?? ''}`} style={style}>
      <div className="ui-fluid-glass-scene">{children}</div>
      {ready && (
        <>
          <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
            <filter id={fid} x="0" y="0" width={lw} height={lh} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              {map && <feImage href={map} x="0" y="0" width={lw} height={lh} result="m" preserveAspectRatio="none" />}
              <feDisplacementMap in="SourceGraphic" in2="m" scale={refraction * 0.85} xChannelSelector="R" yChannelSelector="G" result="dr" />
              <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
              <feDisplacementMap in="SourceGraphic" in2="m" scale={refraction} xChannelSelector="R" yChannelSelector="G" result="dg" />
              <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
              <feDisplacementMap in="SourceGraphic" in2="m" scale={refraction * 1.15} xChannelSelector="R" yChannelSelector="G" result="db" />
              <feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
              <feComposite in="r" in2="g" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg" />
              <feComposite in="rg" in2="b" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
            </filter>
          </svg>
          <div className={dragging ? 'ui-fluid-glass-lens is-drag' : 'ui-fluid-glass-lens'} role="application" aria-roledescription="draggable glass lens" aria-label="Glass lens. Drag it, or use the arrow keys to move it; Shift moves faster, Home recentres."
            tabIndex={0} style={{ width: lw, height: lh, borderRadius: radius, transform: `translate(${x}px, ${y}px)` }}
            onPointerDown={down} onPointerMove={move} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)} onKeyDown={key}>
            <div className="ui-fluid-glass-fx" style={{ filter: `url(#${fid})` }} aria-hidden="true">
              <div className="ui-fluid-glass-inner" style={{ width: size.w, height: size.h, transformOrigin: `${ox}px ${oy}px`, transform: `translate(${-x}px, ${-y}px) scale(${magnify})` }}>{children}</div>
            </div>
            <span className="ui-fluid-glass-sheen" aria-hidden="true" />
          </div>
        </>
      )}
    </div>
  );
}

function Scene() {
  return (
    <div className="ui-fluid-glass-art">
      <div className="ui-fluid-glass-blob a" /><div className="ui-fluid-glass-blob b" />
      <p className="ui-fluid-glass-big">Look closer</p>
      <p className="ui-fluid-glass-small">REFRACTION - LENS - LIGHT</p>
      <div className="ui-fluid-glass-bars"><i /><i /><i /><i /><i /><i /><i /><i /></div>
    </div>
  );
}

export function Demo() {
  return <FluidGlass><Scene /></FluidGlass>;
}
