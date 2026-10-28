'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { FISH, FishArt } from './_tu-css-koi';
import { useReducedMotion } from './_t2';

export interface KoiStudiesProps {
  /** Controlled index of the front card (0-2). */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Maximum pointer tilt of the front card in degrees. */
  maxTilt?: number;
  className?: string;
  style?: CSSProperties;
}

const N = FISH.length;
const wrap = (i: number) => ((i % N) + N) % N;

/** A tactile stack of three illustrated fish cards with CSS 3D depth and pointer tilt. Drag or tap the front card, press arrow keys / Enter, or use the buttons to bring the next card forward. */
export default function KoiStudies({ index, defaultIndex = 0, onIndexChange, maxTilt = 9, className, style }: KoiStudiesProps) {
  const reduced = useReducedMotion();
  const [own, setOwn] = useState(wrap(defaultIndex));
  const cur = wrap(index ?? own);
  const [flyer, setFlyer] = useState<{ id: number; dir: number } | null>(null);
  const stack = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x0: number; y0: number; moved: boolean } | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const go = useCallback((to: number, dir = 1) => {
    const next = wrap(to);
    if (next === cur) return;
    if (!reduced) {
      setFlyer({ id: cur, dir });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFlyer(null), 650);
    }
    if (index === undefined) setOwn(next);
    onIndexChange?.(next);
  }, [cur, index, onIndexChange, reduced]);

  const setVars = (dx: number, dy: number, rx: number, ry: number) => {
    const st = stack.current?.style;
    if (!st) return;
    st.setProperty('--ui-koi-studies-dx', dx.toFixed(1) + 'px');
    st.setProperty('--ui-koi-studies-dy', dy.toFixed(1) + 'px');
    st.setProperty('--ui-koi-studies-rx', rx.toFixed(2) + 'deg');
    st.setProperty('--ui-koi-studies-ry', ry.toFixed(2) + 'deg');
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = stack.current;
    if (!el) return;
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      const dx = e.clientX - d.x0;
      if (Math.abs(dx) > 6 || Math.abs(e.clientY - d.y0) > 6) d.moved = true;
      if (d.moved) setVars(dx, (e.clientY - d.y0) * 0.3, 0, Math.max(-24, Math.min(24, dx / 8)));
      return;
    }
    if (reduced || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    setVars(0, 0, -ny * maxTilt, nx * maxTilt);
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false };
    stack.current?.classList.add('is-drag');
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    stack.current?.classList.remove('is-drag');
    const dx = e.clientX - d.x0;
    setVars(0, 0, 0, 0);
    if (!d.moved) go(cur + 1, 1);
    else if (Math.abs(dx) > 48) go(dx < 0 ? cur + 1 : cur - 1, dx < 0 ? -1 : 1);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') go(cur + 1, 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(cur - 1, -1);
    else if (e.key === 'Home') go(0, -1);
    else if (e.key === 'End') go(N - 1, 1);
    else return;
    e.preventDefault();
  };

  const f = FISH[cur]!;
  return (
    <div className={`ui-koi-studies-root ${className ?? ''}`} style={style} role="group" aria-roledescription="card stack" aria-label="Fish studies">
      <div ref={stack} className="ui-koi-studies-stack" tabIndex={0} onKeyDown={onKey} onPointerMove={onMove} onPointerDown={onDown} onPointerUp={onUp}
        onPointerCancel={onUp} onPointerLeave={(e) => { if (!drag.current && e.pointerType !== 'touch') setVars(0, 0, 0, 0); }}
        aria-label={`${f.name}, card ${cur + 1} of ${N}. Enter or arrow keys change the front card.`}>
        {FISH.map((spec, i) => {
          const o = wrap(i - cur);
          const flying = flyer?.id === i;
          return (
            <figure key={spec.name} className={`ui-koi-studies-card is-k${i}${o === 0 ? ' is-front' : o === N - 1 ? ' is-back' : ''}${flying ? ' is-flying' : ''}`}
              style={{ '--ui-koi-studies-o': o, '--ui-koi-studies-fd': flyer?.dir ?? 1 } as CSSProperties} aria-hidden={o !== 0}>
              <div className="ui-koi-studies-face">
                <FishArt spec={spec} swim={o === 0 && !reduced} />
                <div className="ui-koi-studies-sheen" />
                <figcaption><b>{spec.name}</b><span>{spec.note}</span><i>{String(i + 1).padStart(2, '0')}/{String(N).padStart(2, '0')}</i></figcaption>
              </div>
            </figure>
          );
        })}
      </div>
      <div className="ui-koi-studies-nav">
        <button type="button" className="ui-koi-studies-btn" aria-label="Previous card" onClick={() => go(cur - 1, -1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg></button>
        <div className="ui-koi-studies-dots">
          {FISH.map((s, i) => <button key={s.name} type="button" className="ui-koi-studies-dot" aria-label={`Show ${s.name}, card ${i + 1} of ${N}`} aria-current={i === cur ? 'true' : undefined} onClick={() => go(i, i > cur ? 1 : -1)}><span /></button>)}
        </div>
        <button type="button" className="ui-koi-studies-btn" aria-label="Next card" onClick={() => go(cur + 1, 1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg></button>
      </div>
      <p className="ui-koi-studies-live" role="status" aria-live="polite">{f.name}, card {cur + 1} of {N}</p>
    </div>
  );
}

export function Demo() {
  return <div className="ui-koi-studies-demo"><KoiStudies /></div>;
}
