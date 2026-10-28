'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useReducedMotion } from './_t2';
import { Artwork, DEMO_ITEMS, clamp, itemKey, type GalleryItem } from './_galleries-data';
import { ArrowButton, Dots, PlayPauseButton } from './_galleries-ui';
import { useIndexState, useIsoLayoutEffect, useLive, usePointerDrag, useSize } from './_galleries-hooks';

export interface CarouselProps {
  /** Slides: title, optional subtitle and picture (URL or node). */
  items?: GalleryItem[];
  /** Slides visible at once on a wide container (narrower containers show fewer). Default 1. */
  perView?: 1 | 2 | 3 | 4;
  /** Space between slides in px. Default 16. */
  gap?: number;
  /** Go back to the first slide after the last (and the reverse). Default false. */
  loop?: boolean;
  /** Milliseconds per slide; 0 (default) turns autoplay off. Pauses on hover and focus, and never runs under reduced motion. */
  autoplay?: number;
  /** Controlled index of the first visible slide. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Accessible name of the carousel. */
  label?: string;
  /** CSS aspect-ratio for each slide (e.g. "16 / 9"). Without it the slides fill the height of the carousel. */
  aspect?: string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

/** A plain, accessible carousel: previous/next buttons, pagination, arrow/Home/End keys, swipe or drag, optional autoplay with a pause button. */
export default function Carousel({ items = DEMO_ITEMS, perView = 1, gap = 16, loop = false, autoplay = 0, index, defaultIndex = 0, onIndexChange, label = 'Carousel', aspect, height, className, style }: CarouselProps) {
  const root = useRef<HTMLElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const live = useLive(root);
  const { w } = useSize(view);
  const pv = Math.max(1, w > 0 ? (w < 460 ? 1 : w < 720 ? Math.min(perView, 2) : perView) : perView);
  const n = items.length;
  const max = Math.max(0, n - pv);
  const [raw, setIdx] = useIndexState(index, defaultIndex, onIndexChange);
  const cur = clamp(raw, 0, max);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focusIn, setFocusIn] = useState(false);
  const run = autoplay > 0 && !reduced;
  const playing = run && !paused && !hover && !focusIn && live;
  const stepPx = () => ((view.current?.clientWidth ?? 1) + gap) / pv;

  const go = useCallback((i: number) => {
    const t = loop ? (i > max ? 0 : i < 0 ? max : i) : clamp(i, 0, max);
    if (t !== cur) setIdx(t);
  }, [loop, max, cur, setIdx]);

  useEffect(() => {
    if (!playing || n <= pv) return;
    const t = setTimeout(() => setIdx(cur >= max ? 0 : cur + 1), autoplay);
    return () => clearTimeout(t);
  }, [playing, cur, max, n, pv, autoplay, setIdx]);

  useIsoLayoutEffect(() => { if (raw !== cur) setIdx(cur); }, [raw, cur, setIdx]);

  usePointerDrag(view, {
    axis: 'x',
    onStart: () => { track.current?.setAttribute('data-drag', ''); },
    onMove: (dx) => {
      const edge = !loop && ((cur === 0 && dx > 0) || (cur === max && dx < 0));
      track.current?.style.setProperty('--drag', `${edge ? dx * 0.3 : dx}px`);
    },
    onEnd: (vx, _vy, dx) => {
      const t = track.current;
      t?.removeAttribute('data-drag');
      t?.style.setProperty('--drag', '0px');
      const proj = dx + vx * 220;
      const s = stepPx();
      let d = -Math.round(proj / s);
      if (d === 0 && Math.abs(dx) > 40) d = dx < 0 ? 1 : -1;
      if (d !== 0) go(cur + d);
    },
  });

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    if (k === 'ArrowRight') go(cur + 1);
    else if (k === 'ArrowLeft') go(cur - 1);
    else if (k === 'Home') go(0);
    else if (k === 'End') go(max);
    else return;
    e.preventDefault();
  };

  const css = { '--i': cur, '--pv': pv, '--gap': `${gap}px`, height: height ?? (aspect ? undefined : '100%'), ...style } as CSSProperties;
  const slideStyle = aspect ? ({ aspectRatio: aspect } as CSSProperties) : undefined;

  return (
    <section ref={root} className={`ui-carousel-root ${className ?? ''}`} style={css} aria-roledescription="carousel" aria-label={label}
      onKeyDown={onKey} onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(true); }} onPointerLeave={() => setHover(false)}
      onFocus={() => setFocusIn(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocusIn(false); }}>
      <div ref={view} className="ui-carousel-view">
        <div ref={track} className="ui-carousel-track" aria-live={playing ? 'off' : 'polite'}>
          {items.map((it, i) => {
            const visible = i >= cur && i < cur + pv;
            const body = (
              <>
                <Artwork item={it} index={i} />
                <figcaption className="ui-carousel-cap"><strong>{it.title}</strong>{it.subtitle ? <span>{it.subtitle}</span> : null}</figcaption>
              </>
            );
            return (
              <figure key={itemKey(it, i)} className="ui-carousel-slide" style={slideStyle} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${n}: ${it.title}`} aria-hidden={visible ? undefined : true} data-active={visible ? '' : undefined}>
                {it.href ? <a href={it.href} className="ui-carousel-link" tabIndex={visible ? undefined : -1} draggable={false}>{body}</a> : body}
              </figure>
            );
          })}
        </div>
      </div>
      <div className="ui-carousel-bar">
        <ArrowButton dir="prev" label="Previous slide" className="ui-carousel-btn" onClick={() => go(cur - 1)} disabled={!loop && cur <= 0} />
        {n <= 8 ? <Dots count={max + 1} index={cur} onSelect={go} className="ui-carousel-dots" dotClass="ui-carousel-dot" label="Go to slide" /> : null}
        <span className="ui-carousel-count" aria-hidden="true">{cur + 1}{pv > 1 ? `–${Math.min(n, cur + pv)}` : ''} / {n}</span>
        <ArrowButton dir="next" label="Next slide" className="ui-carousel-btn" onClick={() => go(cur + 1)} disabled={!loop && cur >= max} />
        {run ? <PlayPauseButton playing={!paused} onToggle={() => setPaused((p) => !p)} className="ui-carousel-btn" /> : null}
      </div>
    </section>
  );
}

export function Demo() {
  return <Carousel label="Featured places" perView={3} autoplay={5000} loop />;
}
