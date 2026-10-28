'use client';
import { useId, useRef, useState, type CSSProperties, type ElementType } from 'react';
import { useIsoLayoutEffect, useReducedMotion, watchInView } from './_text-b';

export interface StrokeTextProps {
  /** The text to outline. */
  text?: string;
  /** Element to render (div by default). */
  as?: ElementType;
  /** Outline thickness in SVG units (the type is 100 units tall). */
  strokeWidth?: number;
  /** Seconds the outline takes to draw itself. */
  duration?: number;
  /** 'fill' fades the letters in once drawn; 'outline' keeps them hollow. */
  variant?: 'fill' | 'outline';
  /** Draw as soon as it scrolls into view. */
  playOnView?: boolean;
  className?: string;
  style?: CSSProperties;
}

type Phase = 'done' | 'pre' | 'draw';

/** Big outlined type whose stroke draws itself letter by letter along the glyph contours, then (optionally) fills in. Replays on hover, click, tap or Enter. */
export default function StrokeText({ text = 'Outline', as: Tag = 'div', strokeWidth = 2.4, duration = 2.2, variant = 'fill', playOnView = true, className, style }: StrokeTextProps) {
  const uid = useId().replace(/:/g, '');
  const btn = useRef<HTMLButtonElement>(null);
  const tx = useRef<SVGTextElement>(null);
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('done');
  const [run, setRun] = useState(0);
  const [w, setW] = useState(Math.max(60, text.length * 64));
  const H = 130;

  useIsoLayoutEffect(() => {
    const t = tx.current;
    if (t && typeof t.getComputedTextLength === 'function') {
      const len = t.getComputedTextLength();
      if (len > 0) setW(Math.ceil(len + 24));
    }
  }, [text]);

  useIsoLayoutEffect(() => {
    if (reduced || !playOnView) return;
    setPhase('pre');
    const el = btn.current;
    return el ? watchInView(el, (v) => { if (v) { setPhase('draw'); setRun((r) => r + 1); } }, 0.5) : undefined;
  }, [reduced, playOnView, text]);

  const replay = () => { if (reduced) return; setPhase('draw'); setRun((r) => r + 1); };
  const grad = `ui-stroke-text-g${uid}`;

  return (
    <Tag className={`ui-stroke-text-root${className ? ` ${className}` : ''}`} style={style}>
      <button ref={btn} type="button" className="ui-stroke-text-btn" data-variant={variant} aria-label={`${text}. Replay the drawing.`} onClick={replay} onPointerEnter={(e) => { if (e.pointerType === 'mouse' && phase === 'done') replay(); }}>
        <svg viewBox={`0 0 ${w} ${H}`} className="ui-stroke-text-svg" aria-hidden="true" focusable="false" style={{ aspectRatio: `${w} / ${H}` }}>
          <defs>
            <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w} y2="0">
              <stop offset="0" stopColor="var(--primary, #2563eb)" />
              <stop offset="1" stopColor="var(--signal, #f59e0b)" />
            </linearGradient>
          </defs>
          <text ref={tx} key={run} x={w / 2} y="98" textAnchor="middle" className="ui-stroke-text-t" data-phase={phase}
            style={{ stroke: `url(#${grad})`, strokeWidth, ['--dur' as string]: `${duration}s` }}>{text}</text>
        </svg>
      </button>
    </Tag>
  );
}

export function Demo() {
  return (
    <div className="ui-stroke-text-demo">
      <StrokeText text="Outline" />
      <span className="ui-stroke-text-note" aria-hidden="true">Hover or tap to redraw</span>
    </div>
  );
}
