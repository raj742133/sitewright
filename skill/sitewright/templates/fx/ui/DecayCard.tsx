'use client';
import { useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Scene } from './_cards-art';
import { useDamped, useReducedMotion } from './_t2';

export interface DecayCardProps {
  title?: string;
  text?: string;
  /** Replaces the drawn scene; this is the layer that crumbles. */
  children?: ReactNode;
  /** How far the card erodes on hover / focus, 0 to 1. */
  teaser?: number;
  /** Decayed state (controlled). */
  decayed?: boolean;
  onDecayChange?: (decayed: boolean) => void;
  /** Label of the toggle button. */
  actionLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/** A card whose picture frays away like old paper: hover or focus eats ragged holes into it, and the button lets it crumble fully (and restores it). Text stays crisp. */
export default function DecayCard({ title = 'Field notes', text = 'Some things are kept best by letting them wear.', children, teaser = 0.5, decayed, onDecayChange, actionLabel = 'Let it decay', className, style }: DecayCardProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const root = useRef<HTMLDivElement>(null);
  const disp = useRef<SVGFEDisplacementMapElement>(null);
  const cut = useRef<SVGFEFuncAElement>(null);
  const turb = useRef<SVGFETurbulenceElement>(null);
  const reduced = useReducedMotion();
  const [inner, setInner] = useState(false);
  const isOn = decayed ?? inner;
  const hot = useRef(false);
  const amt = (h: boolean, on: boolean) => (on ? 1 : h ? teaser : 0);
  const drive = useDamped(root, (a, px) => {
    // a: 0..100 erosion, px: 0..100 pointer x (shifts the noise so holes drift)
    const k = a / 100;
    disp.current?.setAttribute('scale', (k * 46).toFixed(1));
    const slope = 14;
    cut.current?.setAttribute('intercept', (-slope * (-0.1 + 0.72 * k)).toFixed(2));
    turb.current?.setAttribute('baseFrequency', (0.018 + px / 100 * 0.012).toFixed(4) + ' ' + (0.026 + px / 100 * 0.01).toFixed(4));
  }, { instant: reduced });
  const [px, setPx] = useState(50);
  const push = (h: boolean, on: boolean, x = px) => drive.set(amt(h, on) * 100, x);
  const toggle = () => { const v = !isOn; if (decayed === undefined) setInner(v); onDecayChange?.(v); push(hot.current, v); };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = root.current?.getBoundingClientRect();
    if (!r || e.pointerType === 'touch') return;
    const x = ((e.clientX - r.left) / r.width) * 100;
    setPx(x); hot.current = true; push(true, isOn, x);
  };
  return (
    <div ref={root} className={`ui-decay-card-root ${className ?? ''}`} style={style} data-decayed={isOn ? 'true' : 'false'} role="group" aria-label={title}
      onPointerMove={onMove} onPointerLeave={() => { hot.current = false; push(false, isOn); }} onFocus={() => { hot.current = true; push(true, isOn); }} onBlur={() => { hot.current = false; push(false, isOn); }}>
      <svg className="ui-decay-card-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <filter id={`dc${uid}`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feTurbulence ref={turb} type="fractalNoise" baseFrequency="0.02 0.028" numOctaves="3" seed="7" result="n" />
          <feDisplacementMap ref={disp} in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0" result="m" />
          <feComponentTransfer in="m" result="mask"><feFuncA ref={cut} type="linear" slope="14" intercept="-0.5" /></feComponentTransfer>
          <feComposite in="d" in2="mask" operator="in" />
        </filter>
      </svg>
      <div className="ui-decay-card-art" style={{ filter: `url(#dc${uid})` }}>{children ?? <Scene index={0} />}</div>
      <div className="ui-decay-card-copy">
        <strong>{title}</strong>
        <p>{text}</p>
        <button type="button" className="ui-decay-card-btn" aria-pressed={isOn} onClick={toggle}>{isOn ? 'Restore' : actionLabel}</button>
      </div>
    </div>
  );
}

export function Demo() {
  return <div className="ui-decay-card-demo"><DecayCard /></div>;
}
