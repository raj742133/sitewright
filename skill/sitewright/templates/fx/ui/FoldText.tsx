'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from './_t2';
import { clamp, useLoop, useSize } from './_text-a-kit';

export interface FoldTextProps {
  /** The text that folds. */
  text?: string;
  /** Number of vertical panels the text is cut into. */
  panels?: number;
  /** Fold angle of each panel in degrees at full fold. */
  angle?: number;
  /** Idle breathing: the text slowly folds and unfolds on its own until the pointer arrives. */
  auto?: boolean;
  /** Controlled pinned state (true = held folded). */
  folded?: boolean;
  /** Initial pinned state when uncontrolled. */
  defaultFolded?: boolean;
  /** Called when the user toggles the pinned state. */
  onFoldedChange?: (folded: boolean) => void;
  className?: string;
  style?: CSSProperties;
}

/** Text cut into panels that fold like an accordion in 3D. It previews a fold on hover or focus, and a click, tap, Enter or Space pins it folded or flat (aria-pressed). Idle breathing stops under reduced motion. */
export default function FoldText({ text = 'Fold', panels = 8, angle = 64, auto = true, folded: foldedProp, defaultFolded = false, onFoldedChange, className, style }: FoldTextProps) {
  const btn = useRef<HTMLButtonElement>(null);
  const sizer = useRef<HTMLSpanElement>(null);
  const scene = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const { w: tw, h: th } = useSize(sizer);
  const [inner, setInner] = useState(defaultFolded);
  const pinned = foldedProp ?? inner;
  const [hot, setHot] = useState(false);
  const st = useRef({ a: -1 });
  const n = Math.max(2, Math.min(16, Math.round(panels)));
  const ready = tw > 4 && th > 4;
  const pw = ready ? tw / n : 0;

  useEffect(() => { st.current.a = -1; }, [tw, th, n, angle]);

  const render = (a: number) => {
    const sc = scene.current;
    if (!sc || !ready) return;
    const th0 = (a * clamp(angle, 0, 80) * Math.PI) / 180;
    const c = Math.cos(th0), s = Math.sin(th0);
    sc.style.transform = `translateX(${((tw - n * pw * c) / 2).toFixed(2)}px)`;
    const kids = sc.children;
    for (let i = 0; i < kids.length; i++) {
      const el = kids[i] as HTMLElement;
      const even = i % 2 === 0;
      el.style.transform = `translate3d(${(i * pw * c).toFixed(2)}px,0,${even ? 0 : (-pw * s).toFixed(2)}px) rotateY(${((even ? 1 : -1) * th0 * 180) / Math.PI}deg)`;
      const shade = el.lastElementChild as HTMLElement | null;
      if (shade) shade.style.opacity = String((even ? 0.0 : 0.42) * Math.min(1, a * 1.4) + (even ? 0.12 * a : 0));
    }
  };

  useLoop(btn, (t, dt) => {
    const k = st.current;
    const idle = auto && !reduced ? (Math.sin(t * 0.85) * 0.5 + 0.5) * 0.8 : 0;
    const target = pinned ? 1 : hot ? 0.78 : idle;
    const next = k.a < 0 ? target : reduced ? target : k.a + (target - k.a) * Math.min(1, dt * 7);
    if (Math.abs(next - k.a) > 0.0005 || k.a < 0) { k.a = next; render(next); }
  }, ready);

  const toggle = () => { const v = !pinned; if (foldedProp === undefined) setInner(v); onFoldedChange?.(v); };

  return (
    <button ref={btn} type="button" className={`ui-fold-text-root ${className ?? ''}`} style={style} data-ready={ready || undefined}
      aria-pressed={pinned} aria-label={`${text}. Fold toggle`}
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') setHot(true); }} onPointerLeave={() => setHot(false)}
      onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) setHot(true); }} onBlur={() => setHot(false)}
      onClick={toggle}>
      <span className="ui-fold-text-stage3d">
        <span ref={sizer} className="ui-fold-text-sizer" aria-hidden="true">{text}</span>
        {ready && (
          <span ref={scene} className="ui-fold-text-scene" aria-hidden="true" style={{ width: tw, height: th }}>
            {Array.from({ length: n }, (_, i) => (
              <span key={i} className="ui-fold-text-panel" style={{ width: pw + 0.75, height: th }}>
                <span className="ui-fold-text-ink" style={{ left: -i * pw }}>{text}</span>
                <span className="ui-fold-text-shade" data-odd={i % 2 || undefined} />
              </span>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}

export function Demo() {
  return (
    <div className="ui-fold-text-stage">
      <FoldText text="Fold" />
    </div>
  );
}
