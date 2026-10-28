'use client';
// A sketchbook whose leaves really turn: drag a page (or click it, or use the arrow keys) and the leaf rotates around the
// spine in 3D with a travelling shade and a cast shadow. Leaf i has a front (right-hand page) and a back (left-hand page).
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { PAGES, Plate, type PageData } from './_hps-art';

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

function Face({ p, n }: { p: PageData; n: number }) {
  return (
    <div className="hps-pg">
      <div className="hps-pg-art"><Plate kind={p.kind} /></div>
      <p className="hps-pg-cap"><i>{p.title}</i><span>{p.note}</span></p>
      <span className="hps-pg-n">{n}</span>
    </div>
  );
}

export interface SketchbookProps { reduced: boolean; pages?: PageData[]; name: string }

export function Sketchbook({ reduced, pages = PAGES, name }: SketchbookProps) {
  const L = Math.floor(pages.length / 2);
  const [turned, setTurned] = useState(0);
  const [act, setAct] = useState<{ i: number; p: number } | null>(null);
  const [grab, setGrab] = useState(false);
  const raf = useRef(0);
  const busy = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; i: number; fwd: boolean; x0: number; w: number; moved: boolean; p: number } | null>(null);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const animate = useCallback((i: number, from: number, to: number) => {
    cancelAnimationFrame(raf.current);
    busy.current = true;
    const done = () => { setTurned(to === 1 ? i + 1 : i); setAct(null); busy.current = false; };
    if (reduced || from === to) { done(); return; }
    const t0 = performance.now(), dur = 520 * Math.abs(to - from) + 140;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      setAct({ i, p: from + (to - from) * e });
      if (k < 1) raf.current = requestAnimationFrame(step); else done();
    };
    raf.current = requestAnimationFrame(step);
  }, [reduced]);

  const go = useCallback((dir: 1 | -1) => {
    if (busy.current) return;
    if (dir > 0 && turned < L) animate(turned, 0, 1);
    else if (dir < 0 && turned > 0) animate(turned - 1, 1, 0);
  }, [animate, turned, L]);

  const jump = (n: number) => { if (busy.current) return; cancelAnimationFrame(raf.current); setAct(null); setTurned(clamp(n, 0, L)); };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (busy.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const fwd = e.clientX > r.left + r.width / 2;
    if (fwd ? turned >= L : turned <= 0) return;
    drag.current = { id: e.pointerId, i: fwd ? turned : turned - 1, fwd, x0: e.clientX, w: r.width / 2, moved: false, p: fwd ? 0 : 1 };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not capturable: ignore */ }
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dx) < 5) return;
    if (!d.moved) { d.moved = true; setGrab(true); busy.current = true; }
    d.p = clamp(d.fwd ? -dx / (d.w * 0.95) : 1 - dx / (d.w * 0.95));
    setAct({ i: d.i, p: d.p });
  };
  const up = (e: PointerEvent<HTMLDivElement>, cancel = false) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setGrab(false);
    if (!d.moved) { go(d.fwd ? 1 : -1); return; }
    const to = cancel ? (d.fwd ? 0 : 1) : d.fwd ? (d.p > 0.3 ? 1 : 0) : d.p < 0.7 ? 0 : 1;
    animate(d.i, d.p, to);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
    else if (e.key === 'Home') { e.preventDefault(); jump(0); }
    else if (e.key === 'End') { e.preventDefault(); jump(L); }
  };

  const total = pages.length;
  const label = turned === 0 ? `Page 1 of ${total}` : turned >= L ? `Page ${total} of ${total}, the end` : `Pages ${turned * 2} and ${turned * 2 + 1} of ${total}`;
  const shown = [pages[turned * 2 - 1], pages[turned * 2]].filter(Boolean).map((p) => p!.title).join(' and ');
  const sh = act ? Math.sin(Math.PI * act.p) : 0;
  const edge = act ? 50 + 50 * Math.cos(Math.PI * act.p) : 50;

  return (
    <div className="hps-bk">
      <div className="hps-bk-cover">
        <div
          ref={stage}
          id="hps-book"
          className="hps-bk-stage"
          data-grab={grab ? 'true' : undefined}
          tabIndex={0}
          role="group"
          aria-roledescription="book"
          aria-label={`${name}'s sketchbook. Drag a page, or use the left and right arrow keys, to turn it.`}
          onKeyDown={key}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={(e) => up(e)}
          onPointerCancel={(e) => up(e, true)}
        >
          <div className="hps-bk-base hps-bk-l" aria-hidden="true">
            <div className="hps-pg hps-pg-end"><b>Ex libris</b><span className="hps-pg-rule" /><i>{name}</i><small>Sketchbook no. 14<br />Porto, 2025 to 2026</small></div>
          </div>
          <div className="hps-bk-base hps-bk-r" aria-hidden="true">
            <div className="hps-pg hps-pg-end"><b>Fin.</b><span className="hps-pg-rule" /><i>More on the shelf, ask me.</i></div>
          </div>
          <div className="hps-bk-cast" aria-hidden="true" style={{ left: `${edge}%`, opacity: sh * 0.9 }} />
          {Array.from({ length: L }, (_, i) => {
            const flipped = act && act.i === i ? act.p >= 0.5 : i < turned;
            const ang = act && act.i === i ? -180 * act.p : i < turned ? -180 : 0;
            const z = act && act.i === i ? 50 : i < turned ? i + 1 : L - i;
            const s = act && act.i === i ? sh : 0;
            const vis = Math.abs(i - (turned - 0.5)) <= 1.6 || (act && act.i === i);
            return (
              <div key={i} className="hps-lf" aria-hidden="true" data-flipped={flipped ? 'true' : undefined} style={{ transform: `rotateY(${ang.toFixed(2)}deg)`, zIndex: z, visibility: vis ? 'visible' : 'hidden', '--sh': s.toFixed(3) } as CSSProperties}>
                <div className="hps-face hps-front">
                  <Face p={pages[i * 2]!} n={i * 2 + 1} />
                  {i === turned && <span className="hps-ear" />}
                  <span className="hps-shade" />
                </div>
                <div className="hps-face hps-back">
                  <Face p={pages[i * 2 + 1]!} n={i * 2 + 2} />
                  <span className="hps-shade" />
                </div>
              </div>
            );
          })}
          <span className="hps-bk-gutter" aria-hidden="true" />
        </div>
      </div>
      <div className="hps-bk-bar">
        <button type="button" className="hps-ib" onClick={() => go(-1)} disabled={turned <= 0} aria-label="Previous page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>
        <p className="hps-bk-label" aria-live="polite"><b>{label}</b><span className="hps-sr">{shown ? ` ${shown}.` : ''}</span></p>
        <div className="hps-bk-dots" role="group" aria-label="Jump to a spread">
          {Array.from({ length: L + 1 }, (_, n) => <button key={n} type="button" className="hps-dot" aria-label={`Spread ${n + 1} of ${L + 1}`} aria-current={n === turned ? 'true' : undefined} onClick={() => jump(n)}><i /></button>)}
        </div>
        <button type="button" className="hps-ib" onClick={() => go(1)} disabled={turned >= L} aria-label="Next page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg></button>
      </div>
    </div>
  );
}
