'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { CAST, Portrait, type Character } from './_tu-characters';
import { useReducedMotion, watchLive } from './_t2';

export type { Character };
export interface CharacterCarouselProps {
  /** `filmstrip` is a flat contact strip; `wave` fans the cards on a perspective curve that gently ripples. */
  variant?: 'filmstrip' | 'wave';
  /** Profiles to show (default: a cast of seven invented characters). Needs at least 2. */
  items?: Character[];
  /** Controlled selected index. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Accessible name of the carousel region. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;
const wrapOff = (o: number, n: number) => { const r = mod(o + n / 2, n) - n / 2; return r; };

/** An editorial profile-card carousel. Drag, wheel sideways, press the arrows or use ← → Home End; it loops. Reduced motion jumps between cards instead of gliding. */
export default function CharacterCarousel({ variant = 'filmstrip', items = CAST, index, defaultIndex = 0, onIndexChange, label = 'Profiles', className, style }: CharacterCarouselProps) {
  const n = items.length;
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const [inner, setInner] = useState(defaultIndex);
  const cur = mod(index ?? inner, Math.max(1, n));
  const st = useRef({ pos: cur, target: cur, raf: 0, live: true, drag: false, moved: 0, lastX: 0, vel: 0, pitch: 160, wheel: 0, wt: 0 });
  const mode = useRef({ variant, reduced, n });
  mode.current = { variant, reduced, n };

  const apply = useCallback((t: number) => {
    const { variant: v, n: cnt } = mode.current;
    const pos = st.current.pos;
    const wave = v === 'wave' && !mode.current.reduced ? t : 0;
    for (let i = 0; i < cnt; i++) {
      const el = cards.current[i];
      if (!el) continue;
      const o = wrapOff(i - pos, cnt), a = Math.abs(o);
      let s: Record<string, string>;
      if (v === 'filmstrip') {
        s = { o: o.toFixed(3), sc: (1 - Math.min(a, 2) * 0.09).toFixed(3), ry: '0', y: '0', z: '0', op: Math.max(0, 1 - Math.max(0, a - 1.2) * 0.45).toFixed(2), gr: Math.min(1, a * 0.9).toFixed(2) };
      } else {
        const c = Math.max(-2.6, Math.min(2.6, o));
        s = { o: (Math.sign(o) * Math.pow(a, 0.92) * 0.9).toFixed(3), sc: (1 - Math.min(a, 2.5) * 0.06).toFixed(3), ry: (-c * 26).toFixed(1), y: (Math.sin(o * 0.95 + wave * 1.5) * 9 + a * a * 2).toFixed(1), z: (-Math.min(a, 3) * 90).toFixed(0), op: Math.max(0, 1 - Math.max(0, a - 2) * 0.6).toFixed(2), gr: Math.min(1, a * 0.35).toFixed(2) };
      }
      const k = el.style;
      k.setProperty('--character-carousel-o', s.o!); k.setProperty('--character-carousel-sc', s.sc!); k.setProperty('--character-carousel-ry', s.ry!);
      k.setProperty('--character-carousel-y', s.y!); k.setProperty('--character-carousel-z', s.z!); k.setProperty('--character-carousel-op', s.op!); k.setProperty('--character-carousel-gr', s.gr!);
      k.zIndex = String(100 - Math.round(a * 10));
      el.dataset.active = a < 0.5 ? 'true' : 'false';
    }
  }, []);

  const tick = useRef<(t: number) => void>(() => {});
  tick.current = (now: number) => {
    const s = st.current;
    s.raf = 0;
    if (!s.drag) {
      const m = mode.current;
      if (m.reduced) s.pos = s.target;
      else { s.pos += (s.target - s.pos) * 0.16; if (Math.abs(s.target - s.pos) < 0.0015) s.pos = s.target; }
    }
    apply(now / 1000);
    const waving = mode.current.variant === 'wave' && !mode.current.reduced;
    if (s.live && (s.drag || waving || Math.abs(s.target - s.pos) > 0.0015)) s.raf = requestAnimationFrame((x) => tick.current(x));
  };
  const kick = useCallback(() => { const s = st.current; if (!s.raf) s.raf = requestAnimationFrame((x) => tick.current(x)); }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const meas = () => { const c = cards.current[0]; if (c) st.current.pitch = c.offsetWidth * (mode.current.variant === 'wave' ? 0.9 : 1.05) || 160; kick(); };
    const ro = new ResizeObserver(meas);
    ro.observe(el);
    meas();
    const off = watchLive(el, (l) => { st.current.live = l; if (l) kick(); });
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const s = st.current;
      const now = performance.now();
      if (now - s.wt < 260) return;
      s.wheel += e.deltaX;
      if (Math.abs(s.wheel) > 30) { go(Math.round(s.target) + (s.wheel > 0 ? 1 : -1)); s.wheel = 0; s.wt = now; }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    const s = st.current;
    return () => { ro.disconnect(); off(); el.removeEventListener('wheel', onWheel); if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kick, variant]);
  useEffect(() => { kick(); }, [variant, reduced, n, kick]);

  /* follow a controlled index */
  useEffect(() => {
    const s = st.current;
    const d = wrapOff(cur - mod(s.target, n), n);
    if (d !== 0) { s.target += d; kick(); }
  }, [cur, n, kick]);

  const go = (t: number) => {
    const s = st.current;
    s.target = t;
    const next = mod(t, n);
    if (index === undefined) setInner(next);
    onIndexChange?.(next);
    kick();
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = Math.round(st.current.target);
    if (e.key === 'ArrowRight') go(t + 1);
    else if (e.key === 'ArrowLeft') go(t - 1);
    else if (e.key === 'Home') go(t - mod(t, n));
    else if (e.key === 'End') go(t - mod(t, n) + n - 1);
    else return;
    e.preventDefault();
  };
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const s = st.current;
    s.drag = true; s.moved = 0; s.lastX = e.clientX; s.vel = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s.drag) return;
    const dx = e.clientX - s.lastX;
    s.lastX = e.clientX; s.moved += Math.abs(dx);
    const dp = -dx / s.pitch;
    s.pos += dp; s.vel = dp;
    s.target = s.pos;
    kick();
  };
  const up = () => {
    const s = st.current;
    if (!s.drag) return;
    s.drag = false;
    go(Math.round(s.pos + s.vel * 4));
  };
  const select = (i: number) => {
    if (st.current.moved > 6) return;
    const o = wrapOff(i - st.current.target, n);
    if (Math.abs(o) > 0.01) go(Math.round(st.current.target + o));
  };

  const base = useMemo(() => items.map((c, i) => ({ c, i })), [items]);
  const active = items[cur];
  return (
    <div ref={rootRef} className={`ui-character-carousel-root ui-character-carousel-${variant} ${className ?? ''}`} style={style} role="region" aria-roledescription="carousel" aria-label={label} tabIndex={0} onKeyDown={onKey}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div className="ui-character-carousel-strip" aria-hidden="true" />
      <div className="ui-character-carousel-stage">
        {base.map(({ c, i }) => (
          <div key={c.id} ref={(el) => { cards.current[i] = el; }} className="ui-character-carousel-card" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${n}: ${c.name}`} aria-current={i === cur ? 'true' : undefined} onClick={() => select(i)}>
            <div className="ui-character-carousel-portrait"><Portrait c={c} /><span className="ui-character-carousel-no" aria-hidden="true">No. {String(i + 1).padStart(2, '0')}</span></div>
            <div className="ui-character-carousel-meta"><strong>{c.name}</strong><span>{c.role}</span><p>{c.line}</p></div>
          </div>
        ))}
      </div>
      <button type="button" className="ui-character-carousel-nav ui-character-carousel-prev" aria-label="Previous profile" onClick={() => go(Math.round(st.current.target) - 1)}><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      <button type="button" className="ui-character-carousel-nav ui-character-carousel-next" aria-label="Next profile" onClick={() => go(Math.round(st.current.target) + 1)}><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      <p className="ui-character-carousel-sr" aria-live="polite">{active ? `${active.name}, ${active.role}. ${cur + 1} of ${n}.` : ''}</p>
    </div>
  );
}

export function Demo() {
  return <CharacterCarousel variant="wave" />;
}
export function DemoFilmstrip() {
  return <CharacterCarousel variant="filmstrip" />;
}
