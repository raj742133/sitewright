'use client';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { useReducedMotion, watchLive } from './_t2';
import { Art, ART_LABELS, ART_VARIANTS, cx, type Source } from './_motion-a';

export interface OrbitImagesProps {
  /** Pictures to orbit: URLs or built-in scenes. Defaults to six drawn scenes. */
  images?: Source[];
  /** Orbit radius in px. Default: fits the container. */
  radius?: number;
  /** Squash of the orbit (1 = circle, 0.4 = flat ellipse). */
  tilt?: number;
  /** Degrees per second; negative turns the other way. */
  speed?: number;
  /** Size of each picture in px. Default scales with the container. */
  itemSize?: number;
  /** How much smaller and dimmer pictures get at the back (0 to 1). */
  depth?: number;
  /** Draw the orbit path. */
  ring?: boolean;
  /** Pause while hovered or focused. */
  pauseOnHover?: boolean;
  /** Called with the index of a picture when it is chosen (turns pictures into buttons). */
  onSelect?: (index: number) => void;
  /** Centre content. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const DEFAULTS: Source[] = ART_VARIANTS.map((variant) => ({ variant }));

/** Pictures travelling around an elliptical orbit with depth: farther ones shrink and dim, nearer ones overlap. Space pauses, arrow keys step the ring, hover pauses. Static under reduced motion. */
export default function OrbitImages({ images = DEFAULTS, radius, tilt = 0.42, speed = 18, itemSize: itemSizeProp, depth = 0.45, ring = true, pauseOnHover = true, onSelect, children, className, style }: OrbitImagesProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [box, setBox] = useState({ w: 320, h: 220 });
  const st = useRef({ angle: -90, goal: 0, hold: false, factor: 1 });
  const ctl = useRef<{ place: () => void; kick: () => void } | null>(null);
  const n = images.length;
  const itemSize = itemSizeProp ?? Math.round(Math.max(52, Math.min(120, Math.min(box.w, box.h * 1.4) * 0.22)));
  const rx = radius ?? Math.max(24, (box.w - itemSize) / 2 - 6);
  const ry = Math.max(8, Math.min(rx * tilt, (box.h - itemSize) / 2 - 4));
  const cfg = useRef({ rx, ry, depth, speed, paused, n, reduced, pauseOnHover, itemSize });
  useEffect(() => { cfg.current = { rx, ry, depth, speed, paused, n, reduced, pauseOnHover, itemSize }; });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const s = st.current;
    let raf = 0, last = 0, live = true;
    const place = () => {
      const c = cfg.current;
      for (let i = 0; i < c.n; i++) {
        const it = itemRefs.current[i];
        if (!it) continue;
        const a = ((s.angle + (360 / c.n) * i) * Math.PI) / 180;
        const front = (Math.sin(a) + 1) / 2;
        const k = 1 - c.depth * (1 - front);
        it.style.transform = `translate(-50%, -50%) translate(${(Math.cos(a) * c.rx).toFixed(1)}px, ${(Math.sin(a) * c.ry).toFixed(1)}px) scale(${k.toFixed(3)})`;
        it.style.zIndex = String(Math.round(front * 100));
        it.style.opacity = (1 - c.depth * 0.6 * (1 - front)).toFixed(2);
      }
    };
    const frame = (t: number) => {
      raf = 0;
      const c = cfg.current;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      const stop = c.paused || (c.pauseOnHover && s.hold);
      s.factor += ((stop ? 0 : 1) - s.factor) * Math.min(1, dt * 6);
      s.angle += c.speed * s.factor * dt;
      if (Math.abs(s.goal) > 0.05) { const d = s.goal * Math.min(1, dt * 7); s.angle += d; s.goal -= d; } else s.goal = 0;
      place();
      if (live && !c.reduced) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && live && !cfg.current.reduced) { last = 0; raf = requestAnimationFrame(frame); } };
    ctl.current = { place, kick };
    const off = watchLive(root, (v) => { live = v; if (v) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } });
    return () => { off(); if (raf) cancelAnimationFrame(raf); ctl.current = null; };
  }, []);

  useEffect(() => { ctl.current?.place(); ctl.current?.kick(); }, [rx, ry, depth, reduced, n, itemSize]);

  const step = (dir: number) => {
    const s = st.current;
    const d = (360 / Math.max(1, n)) * dir;
    if (reduced) { s.angle += d; ctl.current?.place(); } else { s.goal += d; ctl.current?.kick(); }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  };

  return (
    <div ref={rootRef} className={cx('ui-orbit-images-root', className)} style={{ '--ui-oi-size': itemSize + 'px', ...style } as CSSProperties}
      role="group" aria-roledescription="orbiting pictures" aria-label={`${n} pictures orbiting. Space pauses, left and right arrows turn the ring.`} tabIndex={0}
      onKeyDown={onKey} onPointerEnter={(e) => { if (e.pointerType !== 'touch') st.current.hold = true; }} onPointerLeave={() => { st.current.hold = false; }}
      onFocus={() => { st.current.hold = true; }} onBlur={() => { st.current.hold = false; }}>
      {ring && <div className="ui-orbit-images-ring" aria-hidden="true" style={{ width: rx * 2, height: ry * 2 }} />}
      <div className="ui-orbit-images-centre">{children}</div>
      <ul className="ui-orbit-images-list">
        {images.map((im, i) => {
          const alt = im.alt ?? (im.src ? '' : ART_LABELS[im.variant ?? 'dunes']);
          const pic = im.src
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={im.src} alt={alt} loading="lazy" draggable={false} />
            : <Art variant={im.variant ?? 'dunes'} />;
          return (
            <li key={i} ref={(el) => { itemRefs.current[i] = el; }} className="ui-orbit-images-item">
              {onSelect
                ? <button type="button" className="ui-orbit-images-pic" onClick={() => onSelect(i)} aria-label={alt || `Picture ${i + 1}`}>{pic}</button>
                : <div className="ui-orbit-images-pic" role="img" aria-label={alt || undefined}>{pic}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-orbit-images-demo">
      <OrbitImages>
        <div className="ui-orbit-images-badge"><strong>Journal</strong><span>6 scenes</span></div>
      </OrbitImages>
    </div>
  );
}
