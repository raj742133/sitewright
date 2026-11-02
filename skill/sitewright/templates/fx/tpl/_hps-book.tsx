'use client';
// The sketchbook is the page: an open spread whose leaves really turn. Leaf i has a front (a right-hand page) and a back (a left-hand
// page). Drag a corner (or anywhere on a wide spread), click a corner, press the arrow keys or use the buttons. Near a corner the leaf
// lifts and a dog-ear curls under the pointer. On a narrow screen the book is bound along the top and the leaves turn upward.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { PAGES, Plate, type PageData } from './_hps-art';
import { HeroLens } from './_hps-lens';

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

function Face({ p, n, side, live, tape }: { p: PageData; n: number; side: 'l' | 'r'; live: boolean; tape?: boolean }) {
  return (
    <div className="hps-pg" data-kind={p.kind}>
      <div className="hps-pg-art" data-art={live ? side : undefined}>
        <Plate kind={p.kind} />
        {tape && <><span className="hps-tape hps-tape-a" /><span className="hps-tape hps-tape-b" /></>}
      </div>
      <p className="hps-pg-cap"><i>{p.title}</i><span>{p.note}</span></p>
      <span className="hps-pg-n">{n}</span>
    </div>
  );
}

export interface SketchbookProps {
  reduced: boolean;
  name: string;
  /** the title page: it is the left-hand page until the first leaf is turned */
  lead: ReactNode;
  /** extra decoration for the first right-hand page (a sticker, tape) */
  pages?: PageData[];
  onTurn?: (spread: number) => void;
}

export function Sketchbook({ reduced, name, lead, pages = PAGES, onTurn }: SketchbookProps) {
  const L = Math.floor(pages.length / 2);
  const [turned, setTurned] = useState(0);
  const [act, setAct] = useState<{ i: number; p: number } | null>(null);
  const [grab, setGrab] = useState(false);
  const raf = useRef(0);
  const busy = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; i: number; fwd: boolean; vert: boolean; x0: number; y0: number; span: number; moved: boolean; p: number } | null>(null);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => { onTurn?.(turned); }, [turned, onTurn]);
  useEffect(() => { const s = stage.current; if (s) s.dataset.busy = act || grab ? 'true' : ''; }, [act, grab]);

  const animate = useCallback((i: number, from: number, to: number) => {
    cancelAnimationFrame(raf.current);
    busy.current = true;
    const done = () => { setTurned(to === 1 ? i + 1 : i); setAct(null); busy.current = false; };
    if (reduced || from === to) { done(); return; }
    const t0 = performance.now(), dur = 640 * Math.abs(to - from) + 160;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
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

  const begin = (e: PointerEvent<HTMLElement>, fwd: boolean, anywhere: boolean) => {
    if (busy.current || drag.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (fwd ? turned >= L : turned <= 0) return;
    const r = stage.current?.getBoundingClientRect();
    if (!r) return;
    const vert = r.height > r.width;
    if (anywhere && vert) return;
    drag.current = { id: e.pointerId, i: fwd ? turned : turned - 1, fwd, vert, x0: e.clientX, y0: e.clientY, span: (vert ? r.height : r.width) / 2 * 0.95, moved: false, p: fwd ? 0 : 1 };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not capturable: ignore */ }
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (e.target instanceof Element && e.target.closest('a, button, input, select, textarea, [role="slider"]')) return;
    begin(e, e.clientX > r.left + r.width / 2, true);
  };
  const move = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dd = d.vert ? e.clientY - d.y0 : e.clientX - d.x0;
    if (!d.moved && Math.abs(dd) < 6) return;
    if (!d.moved) { d.moved = true; setGrab(true); busy.current = true; }
    d.p = clamp(d.fwd ? -dd / d.span : 1 - dd / d.span);
    setAct({ i: d.i, p: d.p });
  };
  const up = (e: PointerEvent<HTMLElement>, cancel = false) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setGrab(false);
    if (!d.moved) {
      // a click on a corner turns the page; a click in the middle of the page does nothing
      const el = (e.currentTarget as HTMLElement).classList.contains('hps-curl');
      if (!cancel && el) go(d.fwd ? 1 : -1);
      return;
    }
    const to = cancel ? (d.fwd ? 0 : 1) : d.fwd ? (d.p > 0.28 ? 1 : 0) : d.p < 0.72 ? 0 : 1;
    animate(d.i, d.p, to);
  };
  const hover = (e: PointerEvent<HTMLDivElement>) => {
    const s = stage.current;
    if (!s || e.pointerType === 'touch' || reduced || busy.current) return;
    const r = s.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const near = (cx: number, cy: number) => clamp(1 - Math.hypot((x - cx) * (r.width / r.height), y - cy) / 0.34);
    const pr = turned < L ? near(1, 1) : 0, pl = turned > 0 ? near(0, 1) : 0;
    s.style.setProperty('--peek-r', pr.toFixed(3));
    s.style.setProperty('--peek-l', pl.toFixed(3));
  };
  const rest = () => { stage.current?.style.setProperty('--peek-r', '0'); stage.current?.style.setProperty('--peek-l', '0'); };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
    else if (e.key === 'Home') { e.preventDefault(); jump(0); }
    else if (e.key === 'End') { e.preventDefault(); jump(L); }
  };

  const label = turned === 0 ? 'Cover spread' : turned >= L ? 'The last page' : `Spread ${turned + 1} of ${L + 1}`;
  const shown = [pages[turned * 2 - 1], pages[turned * 2]].filter(Boolean).map((p) => p!.title).join(' and ');
  const sh = act ? Math.sin(Math.PI * act.p) : 0;
  const edge = act ? 50 + 50 * Math.cos(Math.PI * act.p) : 50;
  const kinds = { l: turned > 0 ? pages[turned * 2 - 1]?.kind : undefined, r: turned < L ? pages[turned * 2]?.kind : undefined };

  return (
    <div className="hps-bk">
      <div className="hps-bk-cover">
        <span className="hps-bk-block" aria-hidden="true" />
        <div
          ref={stage}
          id="hps-book"
          className="hps-bk-stage"
          data-grab={grab ? 'true' : undefined}
          data-idle={act || grab ? undefined : 'true'}
          tabIndex={0}
          role="group"
          aria-roledescription="book"
          aria-label={`${name}'s sketchbook, ${label}. Drag a corner, or use the left and right arrow keys, to turn the page.`}
          onKeyDown={key}
          onPointerDown={down}
          onPointerMove={(e) => { move(e); hover(e); }}
          onPointerUp={(e) => up(e)}
          onPointerCancel={(e) => up(e, true)}
          onPointerLeave={rest}
        >
          <div className="hps-bk-base hps-bk-l" inert={turned > 0}>{lead}</div>
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
            const cur = i === turned ? 'r' : i === turned - 1 ? 'l' : undefined;
            return (
              <div key={i} className="hps-lf" aria-hidden="true" data-flipped={flipped ? 'true' : undefined} data-cur={cur} style={{ '--ang': `${ang.toFixed(2)}deg`, zIndex: z, visibility: vis ? 'visible' : 'hidden', '--sh': s.toFixed(3) } as CSSProperties}>
                <div className="hps-face hps-front">
                  <Face p={pages[i * 2]!} n={i * 2 + 1} side="r" live={i === turned && !act} tape={i === 0} />
                  {i === turned && <span className="hps-ear" />}
                  <span className="hps-shade" />
                </div>
                <div className="hps-face hps-back">
                  <Face p={pages[i * 2 + 1]!} n={i * 2 + 2} side="l" live={i === turned - 1 && !act} />
                  {i === turned - 1 && <span className="hps-ear" />}
                  <span className="hps-shade" />
                </div>
              </div>
            );
          })}
          <span className="hps-bk-gutter" aria-hidden="true" />
          {turned < L && <span className="hps-curl hps-curl-r" aria-hidden="true" onPointerDown={(e) => begin(e, true, false)} onPointerMove={move} onPointerUp={(e) => up(e)} onPointerCancel={(e) => up(e, true)} />}
          {turned > 0 && <span className="hps-curl hps-curl-l" aria-hidden="true" onPointerDown={(e) => begin(e, false, false)} onPointerMove={move} onPointerUp={(e) => up(e)} onPointerCancel={(e) => up(e, true)} />}
          <HeroLens stage={stage} kinds={kinds} />
        </div>
      </div>
      <div className="hps-bk-bar">
        <button type="button" className="hps-ib" onClick={() => go(-1)} disabled={turned <= 0} aria-label="Previous page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>
        <p className="hps-bk-label" aria-live="polite"><b>{label}</b><span>{shown || `${name}'s desk`}</span></p>
        <div className="hps-bk-dots" role="group" aria-label="Jump to a spread">
          {Array.from({ length: L + 1 }, (_, n) => <button key={n} type="button" className="hps-dot" aria-label={`Spread ${n + 1} of ${L + 1}`} aria-current={n === turned ? 'true' : undefined} onClick={() => jump(n)}><i /></button>)}
        </div>
        <button type="button" className="hps-ib" onClick={() => go(1)} disabled={turned >= L} aria-label="Next page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg></button>
      </div>
    </div>
  );
}
