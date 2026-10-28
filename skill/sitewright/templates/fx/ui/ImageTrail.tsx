'use client';
import { useEffect, useRef } from 'react';
import { createField, rng, useCoarsePointer, useReducedMotion, type CursorFxProps } from './_cursor-kit';
import { Stage } from './_cursor-stage';
import { TrailArt, ART_COUNT } from './_image-trail-art';

export interface ImageTrailProps extends CursorFxProps {
  /** Image URLs to drop along the path. Omit for built-in abstract art drawn in the theme colours. */
  images?: string[];
  /** Width of each image in px (height is 1.25x). */
  size?: number;
  /** Distance the pointer travels between two images, in px. */
  gap?: number;
  /** How long an image stays before it is gone, in ms. */
  life?: number;
  /** How many images can be on screen at once. */
  pool?: number;
}

/** Images drop along the pointer's path at regular distances, each tilted a little, pop in, drift on and fade away. Taps drop a small burst; with no pointer a ghost pointer lays a trail. Images are decorative (empty alt). Scoped to its box unless `global`. */
export default function ImageTrail({ children, className, style, global = false, idle = 'touch', images, size = 92, gap, life = 1200, pool = 12 }: ImageTrailProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const step = gap ?? Math.round(size * 0.85);

  useEffect(() => {
    const host = hostRef.current, layer = layerRef.current;
    if (!host || !layer) return;
    const items = Array.from(layer.querySelectorAll<HTMLElement>('.ui-image-trail-item'));
    if (!items.length) return;
    const rand = rng(23);
    const anims: (Animation | null)[] = items.map(() => null);
    const timers: number[] = [];
    let next = 0, acc = 0;
    const spawn = (x: number, y: number, dx: number, dy: number) => {
      const i = next; next = (next + 1) % items.length;
      const el = items[i]!;
      const rot = (rand() - 0.5) * 22;
      const len = Math.hypot(dx, dy) || 1;
      const mx = (dx / len) * 26, my = (dy / len) * 26 + 10;
      el.style.left = x.toFixed(1) + 'px'; el.style.top = y.toFixed(1) + 'px';
      anims[i]?.cancel();
      if (reduced) {
        el.style.opacity = '1'; el.style.transform = `translate(-50%,-50%) rotate(${rot.toFixed(1)}deg)`;
        timers.push(window.setTimeout(() => { el.style.opacity = '0'; }, Math.min(life, 600)));
        return;
      }
      el.style.opacity = '';
      anims[i] = el.animate([
        { opacity: 0, transform: `translate(-50%,-50%) rotate(${(rot - 6).toFixed(1)}deg) scale(0.55)` },
        { opacity: 1, transform: `translate(-50%,-50%) rotate(${rot.toFixed(1)}deg) scale(1)`, offset: 0.14, easing: 'ease-out' },
        { opacity: 1, offset: 0.6 },
        { opacity: 0, transform: `translate(calc(-50% + ${mx.toFixed(1)}px), calc(-50% + ${my.toFixed(1)}px)) rotate(${(rot + 4).toFixed(1)}deg) scale(0.86)` },
      ], { duration: life, easing: 'linear' });
    };
    const fx = createField(host, layer, { global, idle, reduced, coarse }, {
      down: (f, x, y) => { for (let k = 0; k < 3; k++) spawn(x + (k - 1) * size * 0.45, y + (k === 1 ? -size * 0.2 : size * 0.15), (k - 1), 0.4); void f; },
      frame: (f) => {
        if (!f.seen || !(f.inside || f.auto)) return;
        const dx = f.x - f.lx, dy = f.y - f.ly, d = Math.hypot(dx, dy);
        if (d === 0) return;
        if (d > 320) { acc = 0; return; }
        let from = 0;
        let rest = acc + d;
        while (rest >= step) { from += step - acc; acc = 0; rest -= step; const t = from / d; spawn(f.lx + dx * t, f.ly + dy * t, dx, dy); }
        acc = rest;
      },
    });
    return () => { fx.dispose(); anims.forEach((a) => a?.cancel()); timers.forEach(clearTimeout); };
  }, [global, idle, reduced, coarse, step, life, size]);

  const n = Math.max(2, pool);
  const w = size, h = Math.round(size * 1.25);
  return (
    <div ref={hostRef} className={`ui-image-trail-root ${className ?? ''}`} style={style}>
      {children}
      <div ref={layerRef} className={`ui-image-trail-layer${global ? ' ui-image-trail-global' : ''}`} aria-hidden="true">
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className="ui-image-trail-item" style={{ width: w, height: h, opacity: 0 }}>
            {images && images.length ? <img src={images[i % images.length]} alt="" draggable={false} decoding="async" /> : <TrailArt index={i % ART_COUNT} />}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <ImageTrail idle="always" size={78}>
      <Stage eyebrow="Image trail" title="Leave a trail of cards" text="Move around and pictures drop along your path." />
    </ImageTrail>
  );
}
