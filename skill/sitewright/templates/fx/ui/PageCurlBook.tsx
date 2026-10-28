'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { SKETCHES, SheetArt } from './_tu-css-sketch';
import { useReducedMotion } from './_t2';

export interface PageCurlBookProps {
  /** Controlled current page (0-based). */
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  className?: string;
  style?: CSSProperties;
}

const N = SKETCHES.length;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const EDGE = 0.26;

/** A paper sketchbook of six invented drawings. Drag a page edge to curl it over, or use the arrow keys and buttons; a magnifier lens inspects the current page. Under reduced motion pages change instantly. */
export default function PageCurlBook({ page, defaultPage = 0, onPageChange, className, style }: PageCurlBookProps) {
  const reduced = useReducedMotion();
  const [own, setOwn] = useState(clamp(defaultPage, 0, N - 1));
  const cur = clamp(page ?? own, 0, N - 1);
  const [layers, setLayers] = useState({ top: cur, under: Math.min(N - 1, cur + 1) });
  const [lens, setLens] = useState(false);
  const [zoom, setZoom] = useState(2.5);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const sheet = useRef<HTMLDivElement>(null);
  const s = useRef(0);
  const raf = useRef(0);
  const busy = useRef(false);
  const drag = useRef<{ id: number; dir: 1 | -1; x0: number; moved: boolean; t0: number; last: number } | null>(null);
  const lensDrag = useRef<number | null>(null);
  const curRef = useRef(cur);
  useEffect(() => { curRef.current = cur; });
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const setS = (v: number) => { s.current = v; sheet.current?.style.setProperty('--ui-page-curl-book-s', v.toFixed(4)); };
  const commit = useCallback((n: number) => {
    if (page === undefined) setOwn(n);
    onPageChange?.(n);
  }, [page, onPageChange]);
  const settle = useCallback((n: number) => {
    busy.current = false;
    setS(0);
    setLayers({ top: n, under: Math.min(N - 1, n + 1) });
  }, []);
  const animate = useCallback((to: 0 | 1, finish: () => void) => {
    cancelAnimationFrame(raf.current);
    if (reduced) { setS(to); finish(); return; }
    const from = s.current;
    const dur = 520 * Math.max(0.25, Math.abs(to - from));
    const t0 = performance.now();
    busy.current = true;
    const tick = (now: number) => {
      const k = clamp((now - t0) / dur, 0, 1);
      setS(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf.current = requestAnimationFrame(tick); else finish();
    };
    raf.current = requestAnimationFrame(tick);
  }, [reduced]);

  /** Turn to the neighbouring page (dir 1 = forward). */
  const turn = useCallback((dir: 1 | -1) => {
    const c = curRef.current;
    const n = c + dir;
    if (busy.current || n < 0 || n >= N) return;
    if (dir === 1) { setLayers({ top: c, under: n }); setS(0); } else { setLayers({ top: n, under: c }); setS(1); }
    busy.current = true;
    requestAnimationFrame(() => animate(dir === 1 ? 1 : 0, () => { commit(n); settle(n); }));
  }, [animate, commit, settle]);

  const jump = (n: number) => { if (!busy.current && n !== cur && n >= 0 && n < N) { commit(n); settle(n); } };

  const rel = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1), w: r.width };
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (busy.current) return;
    const p = rel(e);
    const dir: 1 | -1 | 0 = p.x > 1 - EDGE && cur < N - 1 ? 1 : p.x < EDGE && cur > 0 ? -1 : 0;
    if (dir === 0 || (lens && p.x >= EDGE && p.x <= 1 - EDGE)) {
      if (lens) { lensDrag.current = e.pointerId; setPos({ x: p.x, y: p.y }); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
      return;
    }
    drag.current = { id: e.pointerId, dir, x0: e.clientX, moved: false, t0: performance.now(), last: e.clientX };
    if (dir === 1) setLayers({ top: cur, under: cur + 1 }); else setLayers({ top: cur - 1, under: cur });
    setS(dir === 1 ? 0 : 1);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (lens && (lensDrag.current === e.pointerId || e.pointerType === 'mouse') && !d) { const p = rel(e); setPos({ x: p.x, y: p.y }); return; }
    if (!d || d.id !== e.pointerId) return;
    const w = e.currentTarget.getBoundingClientRect().width;
    const dx = e.clientX - d.x0;
    if (Math.abs(dx) > 5) d.moved = true;
    d.last = e.clientX;
    if (d.moved) setS(d.dir === 1 ? clamp(-dx / (w * 0.9), 0, 1) : clamp(1 - dx / (w * 0.9), 0, 1));
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (lensDrag.current === e.pointerId) lensDrag.current = null;
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const n = cur + d.dir;
    const fast = Math.abs(e.clientX - d.x0) / Math.max(1, performance.now() - d.t0) > 0.6;
    const go = !d.moved || fast || (d.dir === 1 ? s.current > 0.4 : s.current < 0.6);
    if (go) animate(d.dir === 1 ? 1 : 0, () => { commit(n); settle(n); });
    else animate(d.dir === 1 ? 0 : 1, () => settle(cur));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (lens && e.shiftKey && e.key.startsWith('Arrow')) {
      setPos((p) => ({ x: clamp(p.x + (e.key === 'ArrowRight' ? 0.06 : e.key === 'ArrowLeft' ? -0.06 : 0), 0, 1), y: clamp(p.y + (e.key === 'ArrowDown' ? 0.06 : e.key === 'ArrowUp' ? -0.06 : 0), 0, 1) }));
    } else if (e.key === 'ArrowRight' || e.key === 'PageDown') turn(1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') turn(-1);
    else if (e.key === 'Home') jump(0);
    else if (e.key === 'End') jump(N - 1);
    else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, z + 0.5));
    else if (e.key === '-') setZoom((z) => Math.max(1.5, z - 0.5));
    else return;
    e.preventDefault();
  };

  const info = SKETCHES[cur]!;
  const vars = { '--ui-page-curl-book-fx': pos.x, '--ui-page-curl-book-fy': pos.y, '--ui-page-curl-book-z': zoom } as CSSProperties;
  return (
    <div className={`ui-page-curl-book-root ${className ?? ''}`} style={style} role="group" aria-roledescription="sketchbook" aria-label="Sketchbook">
      <div className="ui-page-curl-book-desk">
        <div className={`ui-page-curl-book-book${lens ? ' has-lens' : ''}`} tabIndex={0} onKeyDown={onKey} aria-label={`${info.title}. Page ${cur + 1} of ${N}. Left and right arrows turn pages; with the magnifier on, Shift plus arrows move it and plus or minus change zoom.`}>
          <div ref={sheet} className="ui-page-curl-book-sheet" style={vars} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <div className="ui-page-curl-book-under"><SheetArt index={layers.under} /></div>
            <div className="ui-page-curl-book-cast" aria-hidden="true" />
            <div className="ui-page-curl-book-top"><SheetArt index={layers.top} /></div>
            <div className="ui-page-curl-book-flap" aria-hidden="true"><div className="ui-page-curl-book-back" /></div>
            {cur < N - 1 && <span className="ui-page-curl-book-dogear" aria-hidden="true" />}
            {lens && (
              <div className="ui-page-curl-book-lens" aria-hidden="true">
                <div className="ui-page-curl-book-lens-page"><SheetArt index={cur} /></div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="ui-page-curl-book-bar">
        <button type="button" className="ui-page-curl-book-btn" aria-label="Previous page" disabled={cur === 0} onClick={() => turn(-1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg></button>
        <span className="ui-page-curl-book-label"><b>{info.title}</b><i>Page {cur + 1} of {N}</i></span>
        <button type="button" className="ui-page-curl-book-btn" aria-label="Next page" disabled={cur === N - 1} onClick={() => turn(1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg></button>
        <button type="button" className="ui-page-curl-book-btn is-lens" aria-pressed={lens} aria-label="Magnifier" onClick={() => setLens((v) => !v)}><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg></button>
        {lens && <button type="button" className="ui-page-curl-book-btn is-zoom" aria-label={`Magnifier zoom ${zoom} times. Activate to change.`} onClick={() => setZoom((z) => (z >= 4 ? 1.5 : z + 0.5))}>{zoom}x</button>}
      </div>
      <p className="ui-page-curl-book-live" role="status" aria-live="polite">Page {cur + 1} of {N}: {info.title}. {info.alt}.</p>
    </div>
  );
}

export function Demo() {
  return <div className="ui-page-curl-book-demo"><PageCurlBook /></div>;
}
