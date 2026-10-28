'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { readPalette, useReducedMotion, watchLive, watchPalette } from './_t2';
import { renderSource, sourceAlt, ART_VARIANTS, type Source } from './_motion-a';

export type SwapOrder = 'random' | 'diagonal' | 'rows' | 'ripple';

export interface PixelSwapProps {
  /** Pictures to cycle through (URLs or built-in scenes). */
  images?: Source[];
  /** Controlled index. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Tile size in px. */
  cell?: number;
  /** Order in which the tiles flip. */
  order?: SwapOrder;
  /** Whole swap duration in ms. */
  duration?: number;
  /** Auto-advance every N ms (0 = off). Paused on hover, focus and off screen, and always off under reduced motion. */
  autoplay?: number;
  /** Show the previous and next buttons. */
  controls?: boolean;
  className?: string;
  style?: CSSProperties;
}

const DEFAULTS: Source[] = [{ variant: 'dunes' }, { variant: 'city' }, { variant: 'orbit' }, { variant: 'peaks' }];
const hash = (i: number) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const easeIO = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function delays(order: SwapOrder, cols: number, rows: number): Float32Array {
  const d = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = y * cols + x;
    d[i] = order === 'random' ? hash(i)
      : order === 'diagonal' ? (x + y) / Math.max(1, cols + rows - 2)
      : order === 'rows' ? (y + hash(i) * 0.6) / (rows + 0.6)
      : Math.hypot(x - (cols - 1) / 2, y - (rows - 1) / 2) / Math.max(1, Math.hypot(cols / 2, rows / 2));
  }
  return d;
}

/** A picture swap done in tiles: each square squashes over to its new picture on its own beat, in random, diagonal, row or ripple order. Click or arrow keys advance, with optional autoplay. */
export default function PixelSwap({ images = DEFAULTS, index, defaultIndex = 0, onIndexChange, cell = 36, order = 'random', duration = 1000, autoplay = 0, controls = true, className, style }: PixelSwapProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [inner, setInner] = useState(defaultIndex);
  const n = images.length;
  const cur = (((index ?? inner) % n) + n) % n;
  const [hold, setHold] = useState(false);
  const [live, setLive] = useState(true);
  const key = images.map((i) => i.src ?? i.variant ?? '').join('|');
  const eng = useRef<{ goto: (i: number) => void } | null>(null);
  const o = useRef({ order, duration, cell, reduced, images });
  useEffect(() => { o.current = { order, duration, cell, reduced, images }; });

  const go = useCallback((i: number) => {
    const t = (((i % n) + n) % n);
    if (index === undefined) setInner(t);
    onIndexChange?.(t);
  }, [index, n, onIndexChange]);

  useEffect(() => {
    const root = rootRef.current, cv = cvRef.current;
    if (!root || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let pal = readPalette(root);
    let w = 0, h = 0, cols = 1, rows = 1, cw = 1, ch = 1;
    let dl: Float32Array = new Float32Array(1);
    let cache: (HTMLCanvasElement | undefined)[] = [];
    let from = cur, to = cur, t0 = 0, raf = 0, running = false, gen = 0, shown = cur;
    const ensure = async (i: number) => {
      if (cache[i]) return cache[i];
      const c = await renderSource(o.current.images[i] ?? {}, w, h, pal);
      cache[i] = c;
      return c;
    };
    const paint = (now: number) => {
      const a = cache[from], b = cache[to];
      ctx.fillStyle = `rgb(${pal.surface.join(',')})`;
      ctx.fillRect(0, 0, w, h);
      if (!running || !a || !b) { const s = cache[running ? from : to] ?? cache[to]; if (s) ctx.drawImage(s, 0, 0); return; }
      const t = Math.min(1, (now - t0) / o.current.duration);
      const span = 0.45;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const p = Math.min(1, Math.max(0, (t - (dl[y * cols + x] ?? 0) * (1 - span)) / span));
        const sx = x * cw, sy = y * ch;
        const e = easeIO(p);
        const src = e < 0.5 ? a : b;
        const sc = Math.abs(Math.cos(e * Math.PI));
        const dw = cw * sc;
        if (dw < 0.5) continue;
        ctx.drawImage(src, sx, sy, cw, ch, sx + (cw - dw) / 2, sy, dw, ch);
        if (sc < 1) { ctx.fillStyle = `rgba(0,0,0,${((1 - sc) * 0.35).toFixed(3)})`; ctx.fillRect(sx + (cw - dw) / 2, sy, dw, ch); }
      }
    };
    const loop = (now: number) => {
      raf = 0;
      paint(now);
      if (now - t0 >= o.current.duration) { running = false; shown = to; from = to; paint(now); return; }
      raf = requestAnimationFrame(loop);
    };
    const resize = async () => {
      const my = ++gen;
      const r = root.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(r.width * dpr)); h = Math.max(1, Math.round(r.height * dpr));
      cv.width = w; cv.height = h;
      cols = Math.max(1, Math.round(r.width / o.current.cell)); rows = Math.max(1, Math.round(r.height / o.current.cell));
      cw = w / cols; ch = h / rows; dl = delays(o.current.order, cols, rows);
      cache = [];
      await Promise.all([ensure(from), ensure(to)]);
      if (my === gen) paint(performance.now());
    };
    eng.current = {
      goto: async (i) => {
        if (i === to && !running) return;
        if (running) { from = to; running = false; }
        to = i;
        dl = delays(o.current.order, cols, rows);
        await ensure(to);
        if (o.current.reduced) { from = to; running = false; paint(performance.now()); return; }
        running = true; t0 = performance.now();
        if (!raf) raf = requestAnimationFrame(loop);
      },
    };
    void resize();
    const ro = new ResizeObserver(() => { void resize(); });
    ro.observe(root);
    let firstPal = true;
    const offP = watchPalette(root, (p) => { pal = p; if (firstPal) { firstPal = false; return; } if (cache.length) { cache = []; void Promise.all([ensure(from), ensure(to)]).then(() => paint(performance.now())); } });
    const offL = watchLive(root, (v) => { if (!v && raf) { cancelAnimationFrame(raf); raf = 0; } else if (v && running && !raf) raf = requestAnimationFrame(loop); });
    return () => { gen++; ro.disconnect(); offP(); offL(); if (raf) cancelAnimationFrame(raf); eng.current = null; void shown; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell, order, key]);

  useEffect(() => { eng.current?.goto(cur); }, [cur]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    return watchLive(el, setLive);
  }, []);
  useEffect(() => {
    if (!autoplay || reduced || hold || !live || n < 2) return;
    const id = window.setTimeout(() => go(cur + 1), autoplay);
    return () => window.clearTimeout(id);
  }, [autoplay, reduced, hold, live, cur, n, go]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(cur + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
  };
  const img = images[cur] ?? {};
  return (
    <div ref={rootRef} className={`ui-pixel-swap-root ${className ?? ''}`} style={style} tabIndex={0} role="group" aria-roledescription="image swap"
      aria-label="Picture swap. Press Enter or the right arrow for the next picture, left arrow for the previous."
      onKeyDown={onKey} onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
      <canvas ref={cvRef} className="ui-pixel-swap-canvas" onClick={() => go(cur + 1)} aria-hidden="true" />
      <span className="ui-pixel-swap-sr" role="status" aria-live="polite">{`Picture ${cur + 1} of ${n}. ${sourceAlt(img)}`}</span>
      {controls && n > 1 && (
        <div className="ui-pixel-swap-controls">
          <button type="button" aria-label="Previous picture" onClick={() => go(cur - 1)}><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M8 1.5 3.5 6 8 10.5" /></svg></button>
          <span className="ui-pixel-swap-count" aria-hidden="true">{cur + 1} / {n}</span>
          <button type="button" aria-label="Next picture" onClick={() => go(cur + 1)}><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m4 1.5 4.5 4.5L4 10.5" /></svg></button>
        </div>
      )}
    </div>
  );
}

const SCENES: Source[] = ART_VARIANTS.map((variant) => ({ variant }));
const ORDERS: SwapOrder[] = ['random', 'diagonal', 'rows', 'ripple'];

export function Demo() {
  const [order, setOrder] = useState<SwapOrder>('random');
  return (
    <div className="ui-pixel-swap-demo">
      <div className="ui-pixel-swap-bar" role="group" aria-label="Tile order">
        {ORDERS.map((o) => <button key={o} type="button" aria-pressed={order === o} onClick={() => setOrder(o)}>{o}</button>)}
      </div>
      <div className="ui-pixel-swap-frame">
        <PixelSwap order={order} images={SCENES} cell={34} autoplay={3600} />
      </div>
    </div>
  );
}
