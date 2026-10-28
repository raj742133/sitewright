'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from './_t2';
import { useInView, useLoop, useSize } from './_text-a-kit';
import { makeBodies, paint, Pile, stepBodies, type Body } from './_text-a-fall';

export interface FallingTextProps {
  /** The sentence. Each word falls on its own. */
  text?: string;
  /** Words (case-insensitive) drawn as highlighted chips. */
  highlight?: string[];
  /** What makes the words fall. A Drop / Reset button is always available for keyboard users unless controls is false. */
  trigger?: 'click' | 'hover' | 'view' | 'manual';
  /** Controlled state: true = fallen. */
  fallen?: boolean;
  /** Called when the state changes. */
  onFallenChange?: (fallen: boolean) => void;
  /** Show the Drop / Reset button. */
  controls?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** A sentence whose words drop under gravity, bounce and pile up on the bottom edge. Trigger by click, hover or scroll into view, or with the button; Reset lifts them back. Under reduced motion the words jump straight to their resting pile. */
export default function FallingText({ text = 'Words are heavy when you let them go', highlight = [], trigger = 'click', fallen: fallenProp, onFallenChange, controls = true, className, style }: FallingTextProps) {
  const root = useRef<HTMLDivElement>(null);
  const para = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const [inner, setInner] = useState(false);
  const fallen = fallenProp ?? inner;
  const sim = useRef({ bodies: [] as Body[], pile: null as Pile | null, t: 0, run: false });
  const { w } = useSize(root);
  const seen = useInView(root, true, 0.6);
  const hl = useMemo(() => new Set(highlight.map((s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''))), [highlight]);
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  const setFallen = useCallback((v: boolean) => {
    if (fallenProp === undefined) setInner(v);
    onFallenChange?.(v);
  }, [fallenProp, onFallenChange]);

  const clear = useCallback(() => {
    const s = sim.current;
    s.run = false;
    s.bodies.forEach((b) => { b.el.style.transform = ''; b.el.style.transition = ''; });
    s.bodies = [];
  }, []);

  // Start or reset the simulation whenever `fallen` changes.
  useEffect(() => {
    const el = root.current, p = para.current;
    const s = sim.current;
    if (!el || !p) return;
    if (!fallen) {
      s.bodies.forEach((b) => { b.el.style.transition = reduced ? 'none' : 'transform 0.55s cubic-bezier(0.3, 0.7, 0.2, 1)'; b.el.style.transform = ''; });
      s.run = false;
      const id = window.setTimeout(clear, 600);
      return () => window.clearTimeout(id);
    }
    const rect = el.getBoundingClientRect();
    const els = Array.from(p.querySelectorAll<HTMLElement>('[data-w]'));
    s.bodies = makeBodies(els, rect);
    els.forEach((e) => { e.style.transition = ''; });
    s.pile = new Pile(rect.width, rect.height - 10);
    s.t = 0;
    if (reduced) {
      let guard = 0;
      while (stepBodies(s.bodies, s.pile, 1 / 60, s.t) && guard++ < 1500) s.t += 1 / 60;
      paint(s.bodies);
      s.run = false;
    } else s.run = true;
    return undefined;
  }, [fallen, reduced, clear]);

  // Width changes invalidate positions: put the words back.
  const lastW = useRef(0);
  useEffect(() => {
    if (lastW.current && Math.abs(lastW.current - w) > 2 && fallen) { clear(); setFallen(false); }
    lastW.current = w;
  }, [w, fallen, clear, setFallen]);

  useEffect(() => { if (trigger === 'view' && seen && !fallen) setFallen(true); }, [trigger, seen, fallen, setFallen]);
  useEffect(() => clear, [clear]);

  useLoop(root, (_t, dt) => {
    const s = sim.current;
    if (!s.run || !s.pile) return;
    s.t += dt;
    const moving = stepBodies(s.bodies, s.pile, dt, s.t);
    paint(s.bodies);
    if (!moving) s.run = false;
  }, fallen && !reduced);

  return (
    <div ref={root} className={`ui-falling-text-root ${className ?? ''}`} style={style} data-fallen={fallen || undefined}
      onPointerEnter={(e) => { if (trigger === 'hover' && e.pointerType !== 'touch' && !fallen) setFallen(true); }}
      onClick={(e) => { if (trigger === 'click' && !fallen && !(e.target as HTMLElement).closest('button')) setFallen(true); }}>
      <p ref={para} className="ui-falling-text-para">
        {words.map((wd, i) => (
          <span key={i}>
            <span data-w className={hl.has(wd.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')) ? 'ui-falling-text-word ui-falling-text-hl' : 'ui-falling-text-word'}>{wd}</span>{' '}
          </span>
        ))}
      </p>
      {controls && (
        <button type="button" className="ui-falling-text-btn" aria-pressed={fallen} onClick={() => setFallen(!fallen)}>
          {fallen ? 'Reset' : 'Drop'}
        </button>
      )}
      <span className="ui-falling-text-sr" role="status">{fallen ? 'The words have fallen.' : ''}</span>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-falling-text-stage">
      <FallingText text="Words are heavy when you let them go" highlight={['heavy', 'go']} />
    </div>
  );
}
