'use client';
import { useEffect, useId, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { useReducedMotion, watchLive } from './_t2';
import { clampN, snapTo, useControlled } from './_inputs-ui';

export interface ElasticSliderProps {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  /** Formats the value for the readout and aria-valuetext. */
  format?: (v: number) => string;
  className?: string;
  style?: CSSProperties;
}

const W = 300;
const H = 64;
const MID = H / 2;

/** A slider whose track is a string: dragging pulls it toward the pointer, and it springs back with a wobble on release. */
export default function ElasticSlider({ value, defaultValue = 40, onChange, min = 0, max = 100, step = 1, label = 'Volume', format, className, style }: ElasticSliderProps) {
  const [v, setV] = useControlled(value, clampN(defaultValue, min, max), onChange);
  const reduced = useReducedMotion();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const pathA = useRef<SVGPathElement>(null);
  const pathB = useRef<SVGPathElement>(null);
  const clip = useRef<SVGRectElement>(null);
  const st = useRef({ pull: 0, vel: 0, target: 0, raf: 0, live: true, x: 0, dragging: false });
  const vRef = useRef(v);
  vRef.current = v;
  const frac = max > min ? (v - min) / (max - min) : 0;
  const fracRef = useRef(frac);
  fracRef.current = frac;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const draw = () => {
    const s = st.current;
    const x = fracRef.current * W;
    const cx = clampN(x, 0, W);
    // Two quadratics meeting at the thumb, which the pull displaces vertically.
    const d = `M0 ${MID} Q${(cx / 2).toFixed(1)} ${MID} ${cx.toFixed(1)} ${(MID + s.pull).toFixed(1)} Q${((cx + W) / 2).toFixed(1)} ${MID} ${W} ${MID}`;
    pathA.current?.setAttribute('d', d);
    pathB.current?.setAttribute('d', d);
    clip.current?.setAttribute('width', cx.toFixed(1));
    root.current?.style.setProperty('--ui-es-pull', s.pull.toFixed(1) + 'px');
  };
  const loop = () => {
    const s = st.current;
    s.raf = 0;
    if (reducedRef.current) { s.pull = 0; s.vel = 0; draw(); return; }
    const goal = s.dragging ? s.target : 0;
    s.vel += (goal - s.pull) * 0.22;
    s.vel *= s.dragging ? 0.6 : 0.82;
    s.pull += s.vel;
    draw();
    const rest = !s.dragging && Math.abs(s.pull) < 0.05 && Math.abs(s.vel) < 0.05;
    if (rest) { s.pull = 0; draw(); return; }
    if (s.live) s.raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!st.current.raf && st.current.live) st.current.raf = requestAnimationFrame(loop); };
  useEffect(() => { draw(); });
  useEffect(() => {
    const el = root.current;
    const off = el ? watchLive(el, (l) => { st.current.live = l; if (l) kick(); }) : undefined;
    return () => { off?.(); cancelAnimationFrame(st.current.raf); st.current.raf = 0; };
  }, []);

  const fromPointer = (e: PointerEvent) => {
    const r = track.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    const f = clampN((e.clientX - r.left) / r.width, 0, 1);
    setV(clampN(snapTo(min + f * (max - min), min, step), min, max));
    const dy = e.clientY - (r.top + r.height / 2);
    st.current.target = clampN(dy * 0.6, -24, 24);
    kick();
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    const big = (max - min) / 10;
    let n = v;
    if (k === 'ArrowRight' || k === 'ArrowUp') n = v + step;
    else if (k === 'ArrowLeft' || k === 'ArrowDown') n = v - step;
    else if (k === 'PageUp') n = v + big;
    else if (k === 'PageDown') n = v - big;
    else if (k === 'Home') n = min;
    else if (k === 'End') n = max;
    else return;
    e.preventDefault();
    setV(clampN(snapTo(n, min, step), min, max));
    st.current.vel += (k === 'ArrowLeft' || k === 'ArrowDown' || k === 'PageDown') ? -3 : 3;
    kick();
  };
  const text = format ? format(v) : String(v);
  return (
    <div ref={root} className={`ui-elastic-slider-root ${className ?? ''}`} style={style}>
      <div className="ui-elastic-slider-head"><span id={id}>{label}</span><output className="ui-elastic-slider-out">{text}</output></div>
      <div ref={track} className="ui-elastic-slider-track" role="slider" tabIndex={0} aria-labelledby={id} aria-valuemin={min} aria-valuemax={max} aria-valuenow={v} aria-valuetext={text}
        onKeyDown={onKey}
        onPointerDown={(e) => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); st.current.dragging = true; fromPointer(e); }}
        onPointerMove={(e) => { if (st.current.dragging) fromPointer(e); }}
        onPointerUp={() => { st.current.dragging = false; kick(); }} onPointerCancel={() => { st.current.dragging = false; kick(); }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs><clipPath id={id + 'c'}><rect ref={clip} x="0" y="0" width={frac * W} height={H} /></clipPath></defs>
          <path ref={pathA} className="ui-elastic-slider-line" d={`M0 ${MID} H${W}`} vectorEffect="non-scaling-stroke" />
          <path ref={pathB} className="ui-elastic-slider-fill" d={`M0 ${MID} H${W}`} vectorEffect="non-scaling-stroke" clipPath={`url(#${id}c)`} />
        </svg>
        <span className="ui-elastic-slider-thumb" style={{ left: `${frac * 100}%` }} />
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-elastic-slider-demo">
      <ElasticSlider defaultValue={62} label="Volume" format={(n) => `${n}%`} />
    </div>
  );
}
