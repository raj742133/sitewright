'use client';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion } from './_t2';
import { Art, clamp01, cx } from './_motion-a';

export interface ScrollExpandProps {
  /** The media that grows. Defaults to a drawn scene. Fills its frame. */
  media?: ReactNode;
  /** Headline over the media; it splits and drifts apart while the media grows. */
  title?: string;
  /** Small line above the title. */
  eyebrow?: string;
  /** Content that follows once the media is full size. */
  children?: ReactNode;
  /** Scroll distance of the expansion, in stage heights. */
  length?: number;
  /** Starting width of the media as a fraction of the stage (0.1 to 1). */
  startWidth?: number;
  /** Starting height as a fraction of the stage. */
  startHeight?: number;
  /** Starting corner radius in px. */
  startRadius?: number;
  /** true: the component is its own scroll area (give it a height). false: it scrolls with the page. */
  contained?: boolean;
  /** Height of the scroll area when contained. */
  height?: number | string;
  /** Fires with 0 to 1 as it expands. */
  onProgress?: (p: number) => void;
  className?: string;
  style?: CSSProperties;
}

/** Scroll-linked expansion: a framed picture grows to full bleed while the headline splits apart, then the page content continues. Works as its own scroller or with page scroll; full size under reduced motion. */
export default function ScrollExpand({
  media, title = 'Open the horizon', eyebrow = 'Scroll to expand', children, length = 1.4, startWidth = 0.36, startHeight = 0.42,
  startRadius = 24, contained = true, height = '100%', onProgress, className, style,
}: ScrollExpandProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const cb = useRef(onProgress);
  useEffect(() => { cb.current = onProgress; });

  useEffect(() => {
    const root = rootRef.current, track = trackRef.current;
    if (!root || !track) return;
    const scroller: HTMLElement | Window = contained ? root : window;
    let raf = 0;
    const setStage = () => {
      const sh = contained ? root.clientHeight : window.innerHeight;
      root.style.setProperty('--ui-se-stage', sh + 'px');
      root.style.setProperty('--ui-se-track', sh * (1 + length) + 'px');
    };
    const apply = () => {
      raf = 0;
      let p: number;
      if (reduced) p = 1;
      else {
        const sh = contained ? root.clientHeight : window.innerHeight;
        const top = track.getBoundingClientRect().top - (contained ? root.getBoundingClientRect().top : 0);
        p = clamp01(-top / Math.max(1, sh * length));
      }
      root.style.setProperty('--ui-se-p', p.toFixed(4));
      cb.current?.(p);
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(apply); };
    setStage(); apply();
    scroller.addEventListener('scroll', queue, { passive: true });
    const onResize = () => { setStage(); queue(); };
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(root);
    return () => { scroller.removeEventListener('scroll', queue); window.removeEventListener('resize', onResize); ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [contained, length, reduced]);

  const words = title.split(' ');
  const mid = Math.ceil(words.length / 2);
  const vars = {
    '--ui-se-w0': `${Math.round(startWidth * 100)}%`, '--ui-se-h0': `${Math.round(startHeight * 100)}%`, '--ui-se-r0': startRadius + 'px',
    height: contained ? height : undefined, ...style,
  } as CSSProperties;
  return (
    <div ref={rootRef} className={cx('ui-scroll-expand-root', contained && 'is-contained', className)} style={vars}
      tabIndex={contained ? 0 : undefined} role={contained ? 'region' : undefined} aria-label={contained ? `${title}. Scroll to expand the picture.` : undefined}>
      <div ref={trackRef} className="ui-scroll-expand-track">
        <div className="ui-scroll-expand-stage">
          <div className="ui-scroll-expand-media">{media ?? <Art variant="peaks" />}</div>
          <div className="ui-scroll-expand-scrim" aria-hidden="true" />
          <div className="ui-scroll-expand-copy">
            <span className="ui-scroll-expand-eyebrow">{eyebrow}</span>
            <h3 className="ui-scroll-expand-title">
              <span className="ui-scroll-expand-l">{words.slice(0, mid).join(' ')}</span>{' '}
              <span className="ui-scroll-expand-r">{words.slice(mid).join(' ')}</span>
            </h3>
          </div>
        </div>
      </div>
      {children && <div className="ui-scroll-expand-after">{children}</div>}
    </div>
  );
}

export function Demo() {
  return (
    <ScrollExpand title="Open the horizon" eyebrow="Scroll to expand">
      <h4>Field notes</h4>
      <p>The picture is full size now and the page carries on. Anything can follow: a story, a gallery, a call to action.</p>
      <ul>
        <li>Progress is scroll-linked and reversible.</li>
        <li>It reads the nearest scroll area, or the page.</li>
        <li>Reduced motion shows it fully open.</li>
      </ul>
    </ScrollExpand>
  );
}
