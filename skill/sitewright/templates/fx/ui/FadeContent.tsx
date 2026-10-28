'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { watchLive, useReducedMotion } from './_t2';
import { Art, clamp01, cx, scrollParent, useInView, type ArtVariant } from './_motion-a';

export type FadeMode = 'once' | 'toggle' | 'scrub';

export interface FadeContentProps {
  children?: ReactNode;
  /** 'once': fade in the first time. 'toggle': fade in and out as it enters and leaves. 'scrub': opacity follows scroll position. */
  mode?: FadeMode;
  /** Opacity it fades from (and back to). */
  from?: number;
  /** Fade duration in ms (once and toggle). */
  duration?: number;
  /** Delay in ms (once and toggle). */
  delay?: number;
  /** Optional blur in px while faded. */
  blur?: number;
  /** Fraction of the block that must be visible (once and toggle). */
  threshold?: number;
  /** Scrub only: size of the fade zone at each edge of the scroll area, as a fraction of its height. */
  edge?: number;
  /** Controlled visibility for once and toggle. */
  visible?: boolean;
  className?: string;
  style?: CSSProperties;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Fades its content with opacity only (plus optional blur): once, in and out, or scrubbed by scroll position so it dissolves at the edges of the scroll area. */
export default function FadeContent({ children, mode = 'once', from = 0, duration = 600, delay = 0, blur = 0, threshold = 0.15, edge = 0.3, visible, className, style }: FadeContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { threshold, once: mode === 'once' });
  const scrub = mode === 'scrub';
  const shown = reduced || (visible ?? inView);

  useEffect(() => {
    const el = ref.current;
    if (!el || !scrub) return;
    if (reduced) { el.style.opacity = '1'; el.style.filter = ''; return; }
    const root = scrollParent(el);
    const target: HTMLElement | Window = root ?? window;
    let raf = 0;
    let live = true;
    const apply = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const rr = root ? root.getBoundingClientRect() : { top: 0, bottom: window.innerHeight, height: window.innerHeight };
      const zone = Math.max(1, rr.height * edge);
      const tin = clamp01((rr.bottom - r.top) / zone);
      const tout = clamp01((r.bottom - rr.top) / zone);
      const k = smooth(Math.min(tin, tout));
      el.style.opacity = String(from + (1 - from) * k);
      if (blur > 0) el.style.filter = `blur(${((1 - k) * blur).toFixed(2)}px)`;
    };
    const queue = () => { if (live && !raf) raf = requestAnimationFrame(apply); };
    target.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    const off = watchLive(el, (v) => { live = v; if (v) queue(); });
    apply();
    return () => {
      target.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      off();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrub, reduced, from, blur, edge]);

  const vars = { '--ui-fc-from': from, '--ui-fc-b': blur + 'px', '--ui-fc-d': duration + 'ms', transitionDelay: delay + 'ms', ...style } as CSSProperties;
  return (
    <div ref={ref} className={cx('ui-fade-content', blur > 0 && 'has-blur', className)} style={vars}
      data-mode={mode} data-shown={scrub ? undefined : shown ? 'true' : 'false'} data-instant={reduced ? 'true' : undefined}>
      {children}
    </div>
  );
}

const MODES: { id: FadeMode; label: string }[] = [{ id: 'scrub', label: 'Scrub' }, { id: 'toggle', label: 'Toggle' }, { id: 'once', label: 'Once' }];
const CARDS: { v: ArtVariant; t: string; d: string }[] = [
  { v: 'dunes', t: 'Golden hour', d: 'Long shadows over the dunes.' },
  { v: 'city', t: 'After work', d: 'Lights come on across town.' },
  { v: 'orbit', t: 'Far orbit', d: 'A quiet ring around a quiet world.' },
  { v: 'peaks', t: 'First light', d: 'Snow caps catch the sun early.' },
  { v: 'tide', t: 'Low tide', d: 'Waves fold under a rising sun.' },
  { v: 'bloom', t: 'Overlap', d: 'Three colours, one soft centre.' },
];

export function Demo() {
  const [mode, setMode] = useState<FadeMode>('scrub');
  return (
    <div className="ui-fade-content-demo">
      <div className="ui-fade-content-bar" role="group" aria-label="Fade mode">
        {MODES.map((m) => <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>)}
        <span>scroll the list</span>
      </div>
      <div className="ui-fade-content-scroller" tabIndex={0} role="region" aria-label="Scrollable list of scenes">
        {CARDS.map((c) => (
          <FadeContent key={mode + c.v} mode={mode} duration={650} blur={mode === 'scrub' ? 3 : 0} className="ui-fade-content-card">
            <Art variant={c.v} className="ui-fade-content-art" />
            <div><strong>{c.t}</strong><span>{c.d}</span></div>
          </FadeContent>
        ))}
      </div>
    </div>
  );
}
