'use client';
import { useEffect, useRef, useState, type CSSProperties, type ElementType } from 'react';
import { useReducedMotion, watchLive } from './_text-b';

export interface TechTextProps {
  /** The readout text (shown uppercase, monospaced). */
  text?: string;
  /** Small caption above the text, e.g. a channel or status label. */
  label?: string;
  /** Element to render (div by default). */
  as?: ElementType;
  /** Milliseconds between decode + glitch passes; 0 decodes once. */
  loop?: number;
  className?: string;
  style?: CSSProperties;
}

const NOISE = '01<>/\\|#%&$=+*';

/** A HUD-style readout: corner brackets, a status lamp, a scanning bar and a ruler around monospaced text that decodes out of noise left to right, then jitters with a brief colour-split glitch on every pass. */
export default function TechText({ text = 'System online', label = 'SYS//04', as: Tag = 'div', loop = 6500, className, style }: TechTextProps) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const upper = text.toUpperCase();
  const [shown, setShown] = useState(upper);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    setShown(upper);
    const el = root.current;
    if (!el || reduced) return;
    let live = true, raf = 0, timer = 0, g = 0;
    const decode = () => {
      const t0 = performance.now();
      const dur = 160 + upper.length * 55;
      const tick = (now: number) => {
        const k = (now - t0) / dur;
        const settled = Math.floor(k * upper.length * 1.15);
        let out = '';
        for (let i = 0; i < upper.length; i++) {
          const ch = upper.charAt(i);
          out += ch === ' ' || i < settled ? ch : NOISE.charAt(Math.floor(Math.random() * NOISE.length));
        }
        setShown(k >= 1 ? upper : out);
        if (k < 1) raf = requestAnimationFrame(tick);
        else { setGlitch(true); g = window.setTimeout(() => setGlitch(false), 420); }
      };
      raf = requestAnimationFrame(tick);
    };
    const schedule = () => { if (loop > 0) timer = window.setTimeout(() => { if (live) decode(); schedule(); }, loop); };
    const off = watchLive(el, (v) => { live = v; });
    const first = window.setTimeout(decode, 200);
    schedule();
    return () => { off(); window.clearTimeout(first); window.clearTimeout(timer); window.clearTimeout(g); cancelAnimationFrame(raf); };
  }, [upper, loop, reduced]);

  return (
    <Tag ref={root} className={`ui-tech-text-root${className ? ` ${className}` : ''}`} data-glitch={glitch} style={style}>
      <span className="ui-tech-text-sr">{text}</span>
      <span className="ui-tech-text-frame" aria-hidden="true">
        <i className="ui-tech-text-c ui-tech-text-tl" /><i className="ui-tech-text-c ui-tech-text-tr" /><i className="ui-tech-text-c ui-tech-text-bl" /><i className="ui-tech-text-c ui-tech-text-br" />
        <span className="ui-tech-text-label"><b className="ui-tech-text-lamp" />{label}</span>
        <span className="ui-tech-text-line" data-text={shown}>{shown}</span>
        <span className="ui-tech-text-scan" />
        <span className="ui-tech-text-ruler" />
      </span>
    </Tag>
  );
}

export function Demo() {
  return (
    <div className="ui-tech-text-demo">
      <TechText text="System online" label="SYS//04" />
    </div>
  );
}
