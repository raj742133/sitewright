'use client';
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { useReducedMotion } from './_t2';
import { onFontsReady, useLoop } from './_text-a-kit';

export interface CurvedLoopProps {
  /** The phrase that scrolls along the curve (repeated to fill it). */
  text?: string;
  /** Scroll speed in px per second (of a 1000px-wide drawing). */
  speed?: number;
  /** Start direction. */
  direction?: 'left' | 'right';
  /** How strongly the line arches, in drawing px. Negative bends it into a bowl. */
  curve?: number;
  /** Drag (or swipe) to scrub the text and flip its direction. */
  draggable?: boolean;
  /** Font size in drawing px. */
  fontSize?: number;
  className?: string;
  style?: CSSProperties;
}

const W = 1000, H = 240, X0 = -100, X1 = 1100, YE = 170;

/** A marquee that runs along a curved line. Drag to scrub; Left/Right arrows change direction, Space pauses. Stationary under reduced motion (dragging and keys still move it). */
export default function CurvedLoop({ text = 'Launch faster', speed = 70, direction = 'left', curve = 90, draggable = true, fontSize = 62, className, style }: CurvedLoopProps) {
  const id = useId().replace(/:/g, '');
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const pathEl = useRef<SVGPathElement>(null);
  const tp = useRef<SVGTextPathElement>(null);
  const meas = useRef<SVGTextElement>(null);
  const reduced = useReducedMotion();
  const [unit, setUnit] = useState(0);
  const [pathLen, setPathLen] = useState(1250);
  const [paused, setPaused] = useState(false);
  const st = useRef({ pos: 0, dir: direction === 'left' ? -1 : 1, drag: false, lastX: 0, boost: 0, unit: 0 });
  st.current.unit = unit;
  const phrase = text.trim() || ' ';
  const chunk = `${phrase} ✦ `;
  const reps = unit > 0 ? Math.ceil(pathLen / unit) + 2 : 8;
  const cy = YE - 2 * curve;

  const apply = () => {
    const s = st.current;
    if (!tp.current || s.unit <= 0) return;
    const off = ((s.pos % s.unit) + s.unit) % s.unit;
    tp.current.setAttribute('startOffset', String(off - s.unit));
  };

  useEffect(() => {
    const measure = () => {
      if (meas.current) { const u = meas.current.getComputedTextLength(); if (u > 1) setUnit(u); }
      if (pathEl.current) setPathLen(pathEl.current.getTotalLength());
    };
    measure();
    return onFontsReady(measure);
  }, [chunk, fontSize, curve]);
  useEffect(apply, [unit]);

  useLoop(root, (_t, dt) => {
    const s = st.current;
    if (s.drag) return;
    s.boost *= Math.pow(0.04, dt);
    s.pos += (paused ? 0 : s.dir * speed + s.boost) * dt;
    apply();
  }, !reduced);

  const scale = () => (svg.current ? W / svg.current.getBoundingClientRect().width : 1);
  const down = (e: PointerEvent) => {
    if (!draggable) return;
    st.current.drag = true; st.current.lastX = e.clientX;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    const s = st.current;
    if (!s.drag) return;
    const dx = (e.clientX - s.lastX) * scale();
    s.lastX = e.clientX;
    s.pos += dx;
    if (Math.abs(dx) > 0.5) { s.dir = dx > 0 ? 1 : -1; s.boost = dx * 40; }
    apply();
  };
  const up = () => { st.current.drag = false; };
  const key = (e: KeyboardEvent) => {
    const s = st.current;
    if (e.key === 'ArrowLeft') { s.dir = -1; s.pos -= 60; }
    else if (e.key === 'ArrowRight') { s.dir = 1; s.pos += 60; }
    else if (e.key === ' ' || e.key === 'Enter') setPaused((p) => !p);
    else return;
    e.preventDefault();
    apply();
  };

  const body = chunk.repeat(reps);
  return (
    <div ref={root} className={`ui-curved-loop-root ${className ?? ''}`} style={style} data-draggable={draggable || undefined}
      tabIndex={0} role="group" aria-label={`${phrase}, scrolling along a curve. Left and Right arrows set the direction, Space pauses.`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" style={{ ['--ui-cl-size' as string]: fontSize + 'px' }}>
        <defs><path id={`ui-cl-${id}`} ref={pathEl} d={`M${X0} ${YE} Q${(X0 + X1) / 2} ${cy} ${X1} ${YE}`} /></defs>
        <use href={`#ui-cl-${id}`} className="ui-curved-loop-guide" />
        <text ref={meas} className="ui-curved-loop-type ui-curved-loop-measure" style={{ fontSize }}>{chunk}</text>
        <text className="ui-curved-loop-type" style={{ fontSize }}>
          <textPath ref={tp} href={`#ui-cl-${id}`} startOffset={unit > 0 ? -unit : 0}>{body}</textPath>
        </text>
      </svg>
      {paused && <span className="ui-curved-loop-badge" aria-hidden="true">Paused</span>}
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-curved-loop-stage">
      <CurvedLoop text="Launch faster" curve={90} />
    </div>
  );
}
