'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { Cover, DEFAULT_BOOKS, samplePages, TONES, type BookData } from './_tu-three-books';

export type { BookData } from './_tu-three-books';
export interface Bookshelf3dProps {
  /** The books on the shelf (default: seven invented titles with generated covers). */
  books?: BookData[];
  /** Controlled index of the front book. */
  index?: number;
  /** Initial front book when uncontrolled (default 0). */
  defaultIndex?: number;
  /** Called when the front book changes. */
  onIndexChange?: (index: number) => void;
  /** Called when a book is opened for reading. */
  onOpen?: (index: number) => void;
  className?: string;
  style?: CSSProperties;
}
const LEAVES = 4; // cover + 3 page leaves => 4 spreads

const BW = 26; // book width in cqmin
/**
 * A room with a bookshelf whose books stand on a rotating ring: arrows, swipe or the buttons bring one to the front,
 * and selecting it opens the book so pages turn with a 3-D flip. Covers are generated; keyboard: arrows move, Enter opens, Escape closes,
 * and while reading the arrow keys turn pages. With reduced motion everything snaps instantly.
 */
export default function Bookshelf3d({ books = DEFAULT_BOOKS, index, defaultIndex = 0, onIndexChange, onOpen, className, style }: Bookshelf3dProps) {
  const n = Math.max(1, books.length);
  const [inner, setInner] = useState(clampI(defaultIndex, n));
  const cur = index !== undefined ? clampI(index, n) : inner;
  const [open, setOpen] = useState(false);
  const [turn, setTurn] = useState(0);
  const root = useRef<HTMLElement>(null);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const drag = useRef<{ x: number; id: number } | null>(null);
  const [angle, setAngle] = useState(cur); // continuous so the ring takes the short way round
  const set = useCallback((i: number) => {
    const t = ((i % n) + n) % n;
    setAngle((a) => { const base = Math.round(a); const d = ((t - base) % n + n) % n; return base + (d > n / 2 ? d - n : d); });
    if (index === undefined) setInner(t);
    onIndexChange?.(t);
  }, [n, index, onIndexChange]);
  useEffect(() => { if (index !== undefined) setAngle((a) => { const base = Math.round(a); const d = ((cur - base) % n + n) % n; return base + (d > n / 2 ? d - n : d); }); }, [index, cur, n]);

  const openBook = () => { setOpen(true); setTurn(0); onOpen?.(cur); };
  const close = () => { setOpen(false); setTurn(0); window.setTimeout(() => btns.current[cur]?.focus(), 0); };
  const go = (d: number) => { if (open) setTurn((t) => Math.max(0, Math.min(LEAVES, t + d))); else set(cur + d); };
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Escape' && open) close();
    else if (e.key === 'Home' && !open) set(0); else if (e.key === 'End' && !open) set(n - 1);
    else return;
    e.preventDefault();
  };
  const down = (e: PointerEvent) => { drag.current = { x: e.clientX, id: e.pointerId }; };
  const up = (e: PointerEvent) => { const d = drag.current; drag.current = null; if (!d || open) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 36) set(cur + (dx < 0 ? 1 : -1)); };
  useEffect(() => { if (open) root.current?.querySelector<HTMLButtonElement>('[data-reader-close]')?.focus(); }, [open]);

  const R = Math.max(18, ((BW + 6) * n) / (2 * Math.PI));
  const step = 360 / n;
  return (
    <section ref={root} className={'ui-bookshelf-3d' + (className ? ' ' + className : '')} style={{ ...style, ['--bk-r' as string]: R + 'cqmin', ['--bk-w' as string]: BW + 'cqmin' }} data-open={open ? '' : undefined}
      aria-roledescription="carousel" aria-label="Bookshelf" onKeyDown={onKey}>
      <div className="ui-bookshelf-3d-room" aria-hidden="true">
        <div className="ui-bookshelf-3d-glow" />
        <div className="ui-bookshelf-3d-wall">{Array.from({ length: 26 }, (_, k) => <i key={k} style={{ height: 30 + ((k * 37) % 44) + '%', ['--c' as string]: TONES[k % TONES.length]![k % 2 ? 0 : 1] }} />)}</div>
        <div className="ui-bookshelf-3d-plank" /><div className="ui-bookshelf-3d-floor" />
      </div>
      <div className="ui-bookshelf-3d-stage" onPointerDown={down} onPointerUp={up} onPointerCancel={() => { drag.current = null; }}>
        <ol className="ui-bookshelf-3d-ring" style={{ transform: `translateZ(calc(var(--bk-r) * -1)) rotateY(${-angle * step}deg)` }}>
          {books.map((b, i) => {
            const off = Math.abs(((i - angle) % n + n) % n > n / 2 ? ((i - angle) % n + n) % n - n : ((i - angle) % n + n) % n);
            const sel = i === cur, reading = sel && open, pages = b.pages ?? samplePages(i, LEAVES * 2);
            return (
              <li key={i} className="ui-bookshelf-3d-slot" style={{ transform: `rotateY(${i * step}deg) translateZ(var(--bk-r))`, ['--off' as string]: Math.min(off, 3) }}>
                <div className={'ui-bookshelf-3d-book' + (sel ? ' is-front' : '') + (reading ? ' is-open' : '')} style={{ ['--turn' as string]: reading ? turn : 0 }}>
                  <button ref={(el) => { btns.current[i] = el; }} type="button" className="ui-bookshelf-3d-hit" tabIndex={sel ? 0 : -1} disabled={open && !sel}
                    aria-label={`${b.title}, by ${b.author}. Book ${i + 1} of ${n}.${sel ? ' Press Enter to open.' : ''}`} aria-current={sel ? 'true' : undefined}
                    onClick={() => (sel ? (!open && openBook()) : set(i))} />
                  <div className="ui-bookshelf-3d-body" style={{ transform: reading && turn > 0 ? 'translateX(calc(var(--bk-w) * 0.5))' : undefined }}>
                    <div className="ui-bookshelf-3d-face ui-bookshelf-3d-back" />
                    <div className="ui-bookshelf-3d-face ui-bookshelf-3d-spine" style={{ background: `linear-gradient(90deg, ${TONES[(b.tone ?? i) % TONES.length]![1]}, ${TONES[(b.tone ?? i) % TONES.length]![0]})` }} />
                    <div className="ui-bookshelf-3d-face ui-bookshelf-3d-edge" />
                    {Array.from({ length: LEAVES }, (_, j) => {
                      const turned = reading && j < turn, zf = turned ? -0.46 + (j + 1) * 0.1 : 0.46 - j * 0.1;
                      return (
                        <div key={j} className={'ui-bookshelf-3d-leaf' + (turned ? ' is-turned' : '')} style={{ ['--zf' as string]: zf }}>
                          <div className="ui-bookshelf-3d-face ui-bookshelf-3d-front">{j === 0 ? <Cover b={b} i={i} /> : <PageText text={pages[j * 2 - 1]} n={j * 2 - 1} />}</div>
                          <div className="ui-bookshelf-3d-face ui-bookshelf-3d-rear">{j === 0 ? <PageText text={b.title + ' / ' + b.author} n={0} title /> : <PageText text={pages[j * 2]} n={j * 2} />}</div>
                        </div>
                      );
                    })}
                    <div className="ui-bookshelf-3d-face ui-bookshelf-3d-endpage"><PageText text="The end of this sample." n={LEAVES * 2 + 1} title /></div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="ui-bookshelf-3d-bar">
        {!open ? (
          <>
            <button type="button" className="ui-bookshelf-3d-btn" onClick={() => set(cur - 1)} aria-label="Previous book">&#8249;</button>
            <button type="button" className="ui-bookshelf-3d-btn ui-bookshelf-3d-read" onClick={openBook}>Open <span className="ui-bookshelf-3d-sr">{books[cur]?.title}</span></button>
            <button type="button" className="ui-bookshelf-3d-btn" onClick={() => set(cur + 1)} aria-label="Next book">&#8250;</button>
          </>
        ) : (
          <>
            <button type="button" className="ui-bookshelf-3d-btn" onClick={() => go(-1)} disabled={turn === 0} aria-label="Previous page">&#8249;</button>
            <button type="button" className="ui-bookshelf-3d-btn ui-bookshelf-3d-read" data-reader-close onClick={close}>Close book</button>
            <button type="button" className="ui-bookshelf-3d-btn" onClick={() => go(1)} disabled={turn === LEAVES} aria-label="Next page">&#8250;</button>
          </>
        )}
      </div>
      <p className="ui-bookshelf-3d-sr" aria-live="polite">{open ? `Reading ${books[cur]?.title}, spread ${turn + 1} of ${LEAVES + 1}` : `${books[cur]?.title} by ${books[cur]?.author}`}</p>
    </section>
  );
}
const clampI = (i: number, n: number) => Math.max(0, Math.min(n - 1, Math.round(i) || 0));
function PageText({ text, n, title }: { text?: string; n: number; title?: boolean }) {
  return <div className={'ui-bookshelf-3d-page' + (title ? ' is-title' : '')}><p>{text}</p><span>{n || ''}</span></div>;
}

export function Demo() {
  const [i, setI] = useState(0);
  return <Bookshelf3d index={i} onIndexChange={setI} />;
}
