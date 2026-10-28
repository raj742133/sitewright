'use client';
import { useState, type HTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { HEADING_DEFAULT_PARAMS } from './_tg-engine';
import { useGlass, type GlassOpticsProps, type GlassVariant } from './_tg-use';
import { GlassStage } from './_tg-stage';

export interface GlassWordProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  children?: ReactNode;
  /** Words to cycle through when the word is clicked (or Enter / Space is pressed). */
  cycleWords?: string[];
  /** 'optical' (default) bends what is behind it with WebGL2; 'frosted' is pure CSS frosted glass: blur, grain and a soft pointer-following sheen. */
  variant?: GlassVariant;
  optics?: GlassOpticsProps;
}

/** A word whose letter shapes are liquid glass: the glyphs catch rim light and flowing caustics, and react to the pointer. The text stays real text; without WebGL it is gradient lettering. */
export default function GlassWord({ children, cycleWords, variant, optics, className = '', style, onClick, onKeyDown, ...props }: GlassWordProps) {
  const [n, setN] = useState(0);
  const cycling = !!cycleWords && cycleWords.length > 1;
  const shown: ReactNode = cycleWords && cycleWords.length > 0 ? cycleWords[n % cycleWords.length] : children;
  const text = typeof shown === 'string' || typeof shown === 'number' ? String(shown) : '';
  const { rootRef, canvasRef, dataGlass } = useGlass<HTMLSpanElement>({
    defaults: HEADING_DEFAULT_PARAMS, optics: { body: 40, ...optics }, variant, radius: 0, deps: [text],
    measure: (el) => [el.offsetWidth + 32, el.offsetHeight + 32],
    setup: (inst, root, resize) => {
      const font = () => {
        const cs = getComputedStyle(root);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        inst.textMask = text;
        inst.textFont = `${cs.fontWeight} ${parseFloat(cs.fontSize) * dpr}px ${cs.fontFamily}`;
        inst.textLetterSpacing = cs.letterSpacing || 'normal';
      };
      font();
      resize();
      // the web font may arrive after the first frame: redraw the mask then
      document.fonts?.ready.then(font).catch(() => {});
      const ro = new ResizeObserver(font);
      ro.observe(root);
      return () => ro.disconnect();
    },
  });
  const act = () => { if (cycling) setN((v) => v + 1); };
  const click = (e: MouseEvent<HTMLSpanElement>) => { act(); onClick?.(e); };
  const key = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (cycling && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); act(); }
    onKeyDown?.(e);
  };
  const interactive = cycling || !!onClick;
  return (
    <span ref={rootRef} data-glass={dataGlass} data-clickable={interactive ? '' : undefined} className={`ui-glass ui-glass-word ${className}`.trim()} style={style}
      {...(interactive ? { role: 'button', tabIndex: 0, 'aria-label': text ? `${text}. Press to change the word.` : undefined } : {})} onClick={click} onKeyDown={key} {...props}>
      <canvas ref={canvasRef} className="ui-glass-canvas" aria-hidden="true" />
      <span className="ui-glass-word-text">{shown}</span>
    </span>
  );
}

export function Demo() {
  return (
    <GlassStage>
      <span style={{ font: '800 clamp(40px, 12vw, 64px)/1 var(--font-body, system-ui)', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
        <GlassWord optics={{ refraction: 40, thickness: 40, bevelWidth: 10, frost: 20, sheen: 40, rim: 40 }} cycleWords={['Glass', 'Liquid', 'Tactile']} />
      </span>
    </GlassStage>
  );
}
