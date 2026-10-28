'use client';
import { useCallback, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { useDamped, useReducedMotion } from './_t2';
import { Artwork, DEMO_ITEMS, clamp, itemKey, wrap, type GalleryItem } from './_galleries-data';
import { ArrowButton } from './_galleries-ui';
import { useIndexState, useIsoLayoutEffect, usePointerDrag, useSize } from './_galleries-hooks';

export interface CircularCarouselProps {
  /** Cards placed evenly around the wheel (6 to 16 look best). */
  items?: GalleryItem[];
  /** Controlled index of the card at the top. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  label?: string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

/** A wheel of cards seen from the front: only the top arc shows, the chosen card sits at the top, larger and brighter. Drag to spin, click a card, use the buttons or arrow/Home/End keys. */
export default function CircularCarousel({ items = DEMO_ITEMS, index, defaultIndex = 0, onIndexChange, label = 'Wheel', height, className, style }: CircularCarouselProps) {
  const n = items.length;
  const step = 360 / Math.max(1, n);
  const reduced = useReducedMotion();
  const view = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const size = useSize(view);
  const pos = useRef(defaultIndex);
  const rotNow = useRef(-defaultIndex * step);
  const base = useRef(0);
  const [idx, setIdx] = useIndexState(index, defaultIndex, onIndexChange);
  const cur = wrap(idx, n);

  const iw = clamp(Math.min(size.w * 0.22, size.h * 0.4), 56, 190) || 90;
  const ih = iw * 1.25;
  const R = Math.max((n * iw * 1.2) / (2 * Math.PI), iw * 1.7);
  const cx = (size.w || 300) / 2;
  const cy = R + ih / 2 + 14;

  const paint = useCallback((rot: number) => {
    rotNow.current = rot;
    for (let i = 0; i < n; i++) {
      const el = els.current[i];
      if (!el) continue;
      const a = ((((i * step + rot) % 360) + 540) % 360) - 180;
      const dist = Math.abs(a) / step;
      if (Math.abs(a) > 100) { el.style.visibility = 'hidden'; continue; }
      const r = (a * Math.PI) / 180;
      const s = 1.16 - Math.min(dist, 3.5) * 0.13;
      el.style.visibility = '';
      el.style.opacity = String(clamp(1 - dist * 0.17, 0.3, 1));
      el.style.zIndex = String(100 - Math.round(dist * 10));
      el.style.transform = `translate3d(${(cx + R * Math.sin(r) - iw / 2).toFixed(1)}px, ${(cy - R * Math.cos(r) - ih / 2).toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
    }
  }, [n, step, cx, cy, R, iw, ih]);

  const drive = useDamped(view, (x) => paint(x), { instant: reduced });
  useIsoLayoutEffect(() => { paint(rotNow.current); view.current?.setAttribute('data-ready', ''); }, [paint]);

  const goTo = (i: number) => {
    const t = wrap(i, n);
    const delta = wrap(t - wrap(pos.current, n) + Math.floor(n / 2), n) - Math.floor(n / 2);
    pos.current += delta;
    drive.set(-pos.current * step, 0);
    setIdx(t);
  };

  usePointerDrag(view, {
    axis: 'x',
    onStart: () => { base.current = -pos.current * step; },
    onMove: (dx) => drive.set(base.current + (dx / R) * 57.3, 0),
    onEnd: (vx, _vy, dx) => {
      const target = base.current + ((dx + vx * 240) / R) * 57.3;
      pos.current = Math.round(-target / step);
      drive.set(-pos.current * step, 0);
      setIdx(wrap(pos.current, n));
    },
  });

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const focusNew = (i: number) => { goTo(i); requestAnimationFrame(() => els.current[wrap(i, n)]?.querySelector('button')?.focus()); };
    const onCard = (e.target as Element).closest('.ui-circular-carousel-hit') !== null;
    const move = (i: number) => (onCard ? focusNew(i) : goTo(i));
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(cur + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(cur - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(n - 1);
    else return;
    e.preventDefault();
  };

  const it = items[cur];
  return (
    <section className={`ui-circular-carousel-root ${className ?? ''}`} style={{ height: height ?? '100%', ...style }} aria-roledescription="carousel" aria-label={label} onKeyDown={onKey}>
      <div ref={view} className="ui-circular-carousel-view" style={{ '--w': `${iw}px`, '--h': `${ih}px` } as CSSProperties}>
        <span className="ui-circular-carousel-rim" aria-hidden="true" style={{ width: R * 2, height: R * 2, left: cx - R, top: cy - R }} />
        {items.map((x, i) => (
          <div key={itemKey(x, i)} ref={(el) => { els.current[i] = el; }} className="ui-circular-carousel-item" data-active={i === cur ? '' : undefined} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${n}`}>
            <Artwork item={x} index={i} />
            <button type="button" className="ui-circular-carousel-hit" aria-label={`${x.title}${x.subtitle ? ', ' + x.subtitle : ''}`} aria-current={i === cur ? 'true' : undefined} tabIndex={i === cur ? 0 : -1} data-i={i} onClick={() => { if (i === cur && x.href) window.location.assign(x.href); else goTo(i); }} />
          </div>
        ))}
      </div>
      <div className="ui-circular-carousel-bar">
        <ArrowButton dir="prev" label="Previous card" className="ui-circular-carousel-btn" onClick={() => goTo(cur - 1)} />
        <div className="ui-circular-carousel-cap" aria-live="polite" key={cur}><strong>{it?.title}</strong>{it?.subtitle ? <span>{it.subtitle}</span> : null}</div>
        <ArrowButton dir="next" label="Next card" className="ui-circular-carousel-btn" onClick={() => goTo(cur + 1)} />
      </div>
    </section>
  );
}

export function Demo() {
  return <CircularCarousel label="Featured places" />;
}
