'use client';
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { BgcDemo } from './_bg-c-demo';
import { watchLive } from './_t2';

export interface GridMotionProps {
  /** Number of rows (default 6). */
  rows?: number;
  /** Tile size in px (default 88). */
  tile?: number;
  /** Tilt of the whole grid in degrees (default -9). */
  tilt?: number;
  /** Marquee speed multiplier (default 1). */
  speed?: number;
  /** Horizontal pointer parallax in px at the edges of the parent (default 140). */
  reach?: number;
  className?: string;
  style?: CSSProperties;
}

const PER_ROW = 18;
const GLYPHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

/**
 * A tilted wall of tiles whose rows slide in alternating directions. A slow marquee runs by itself (so touch and
 * idle states stay alive), and the pointer, tracked on the parent, shoves the rows sideways in opposite
 * directions. Pure DOM + CSS; the marquee stops under reduced motion and when scrolled off-screen. Fills its
 * parent (`position:absolute; inset:0`); decorative (aria-hidden).
 */
export default function GridMotion({ rows = 6, tile = 88, tilt = -9, speed = 1, reach = 140, className, style }: GridMotionProps) {
  const root = useRef<HTMLDivElement>(null);
  const rowEls = useRef<(HTMLDivElement | null)[]>([]);
  const count = Math.max(2, Math.min(12, Math.round(rows)));

  const tiles = useMemo(() => {
    return Array.from({ length: count }, (_, r) =>
      Array.from({ length: PER_ROW }, (_, c) => ({ k: (r * 5 + c * 3 + (r % 2)) % 6, n: GLYPHS[(r * 7 + c) % GLYPHS.length]! })),
    );
  }, [count]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const host = el.parentElement ?? el;
    const mqR = window.matchMedia('(prefers-reduced-motion: reduce)');
    let target = 0, cur = 0, raf = 0, dead = false, live = true;
    const apply = () => {
      rowEls.current.forEach((n, i) => { if (n) n.style.transform = `translate3d(${(i % 2 ? -1 : 1) * cur * (0.7 + (i % 3) * 0.25)}px,0,0)`; });
    };
    const step = () => {
      raf = 0;
      cur += (target - cur) * 0.08;
      if (Math.abs(target - cur) < 0.1) cur = target;
      apply();
      if (cur !== target && live && !dead) raf = requestAnimationFrame(step);
    };
    const kick = () => { if (!raf && live && !dead) raf = requestAnimationFrame(step); };
    const onMove = (e: PointerEvent) => {
      if (mqR.matches || e.pointerType === 'touch') return;
      const r = host.getBoundingClientRect();
      target = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2 * reach;
      kick();
    };
    const onLeave = () => { target = 0; kick(); };
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    const off = watchLive(el, (v) => { live = v; el.dataset.live = v ? 'on' : 'off'; if (v) kick(); });
    const onMq = () => { if (mqR.matches) { target = 0; kick(); } };
    mqR.addEventListener('change', onMq);
    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      mqR.removeEventListener('change', onMq);
      off();
    };
  }, [reach]);

  const vars = { '--gm-tile': `${tile}px`, '--gm-gap': `${Math.round(tile / 8)}px`, '--gm-tilt': `${tilt}deg`, '--gm-speed': Math.max(0.05, speed), ...style } as CSSProperties;
  return (
    <div ref={root} className={'ui-grid-motion' + (className ? ' ' + className : '')} style={vars} data-live="on" aria-hidden="true">
      <div className="ui-grid-motion-stage">
        {tiles.map((row, r) => (
          <div key={r} className="ui-grid-motion-row" ref={(n) => { rowEls.current[r] = n; }}>
            <div className="ui-grid-motion-track" style={{ '--gm-dur': `${64 + (r % 3) * 14}s`, animationDirection: r % 2 ? 'reverse' : 'normal' } as CSSProperties}>
              {[0, 1].map((rep) => row.map((t, c) => (
                <span key={rep * PER_ROW + c} className="ui-grid-motion-tile" data-k={t.k}>
                  <b>{t.n}</b>
                </span>
              )))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <BgcDemo title="A wall in motion" sub="Rows drift on their own and lean toward the pointer.">
      <GridMotion />
    </BgcDemo>
  );
}
