'use client';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { readPalette, useReducedMotion, watchLive, watchPalette, type Palette } from './_t2';
import { renderSource, sourceAlt, type ArtVariant, type Source } from './_motion-a';

export interface HalftoneRevealProps {
  /** Image URL (same-origin or CORS-enabled). Omit to use a drawn scene. */
  src?: string;
  /** Built-in scene used when no src is given. */
  variant?: ArtVariant;
  /** Accessible description of the picture. */
  alt?: string;
  /** Dot grid spacing in px. */
  cell?: number;
  /** Grid rotation in degrees. */
  angle?: number;
  /** 'color' keeps the picture's colours in the dots, 'ink' draws them in the ink token. */
  dots?: 'color' | 'ink';
  /** hover: reveal from the pointer; view: reveal from the centre when scrolled into view; click: only on press or Enter. */
  trigger?: 'hover' | 'view' | 'click';
  /** Controlled state: true shows the picture, false the halftone. */
  revealed?: boolean;
  defaultRevealed?: boolean;
  onRevealedChange?: (revealed: boolean) => void;
  /** Duration of the full wipe in ms. */
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

interface Grid { n: number; x: Float32Array; y: Float32Array; cov: Float32Array; col: Uint8ClampedArray }

function buildGrid(src: HTMLCanvasElement, w: number, h: number, cell: number, angle: number, inkOnLight: boolean): Grid {
  const g = src.getContext('2d', { willReadFrequently: true });
  const data = g ? g.getImageData(0, 0, src.width, src.height).data : new Uint8ClampedArray(src.width * src.height * 4);
  const a = (angle * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  const cxm = w / 2, cym = h / 2, span = Math.hypot(w, h) / 2 + cell;
  const steps = Math.ceil(span / cell);
  const xs: number[] = [], ys: number[] = [], cov: number[] = [], col: number[] = [];
  for (let j = -steps; j <= steps; j++) for (let i = -steps; i <= steps; i++) {
    const lx = i * cell, ly = j * cell;
    const px = cxm + lx * ca - ly * sa, py = cym + lx * sa + ly * ca;
    if (px < -cell * 0.5 || py < -cell * 0.5 || px > w + cell * 0.5 || py > h + cell * 0.5) continue;
    const sx = Math.min(src.width - 1, Math.max(0, Math.round(px))), sy = Math.min(src.height - 1, Math.max(0, Math.round(py)));
    const o = (sy * src.width + sx) * 4;
    const r = data[o] ?? 0, gr = data[o + 1] ?? 0, b = data[o + 2] ?? 0;
    const lum = (0.2126 * r + 0.7152 * gr + 0.0722 * b) / 255;
    xs.push(px); ys.push(py); cov.push(inkOnLight ? 1 - lum : lum); col.push(r, gr, b);
  }
  return { n: xs.length, x: Float32Array.from(xs), y: Float32Array.from(ys), cov: Float32Array.from(cov), col: Uint8ClampedArray.from(col) };
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lumOf = (c: [number, number, number]) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

/** A picture that sits as a halftone dot screen until you reveal it: a soft circular wipe from the pointer (or the centre) turns the dots into the full image. Press, tap or Enter pins it open. */
export default function HalftoneReveal({
  src, variant = 'dunes', alt, cell = 8, angle = 18, dots = 'color', trigger = 'hover', revealed, defaultRevealed = false,
  onRevealedChange, duration = 900, className, style,
}: HalftoneRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [pinned, setPinned] = useState(defaultRevealed);
  const [hover, setHover] = useState(false);
  const [inView, setInView] = useState(false);
  const pin = revealed ?? pinned;
  const wantOpen = pin || (trigger === 'hover' && hover) || (trigger === 'view' && inView);
  const api = useRef<{ target: (v: boolean, x?: number, y?: number) => void } | null>(null);
  const want = useRef(wantOpen);
  want.current = wantOpen;
  const opts = useRef({ src, variant, alt, cell, angle, dots, duration, reduced });
  useEffect(() => { opts.current = { src, variant, alt, cell, angle, dots, duration, reduced }; });

  // one effect owns the canvas, the grid and the animation loop
  useEffect(() => {
    const root = rootRef.current, cv = cvRef.current;
    if (!root || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const layer = document.createElement('canvas');
    const lg = layer.getContext('2d');
    let pal: Palette = readPalette(root);
    let img: HTMLCanvasElement | null = null;
    let grid: Grid | null = null;
    let w = 0, h = 0, dpr = 1;
    let prog = want.current ? 1 : 0, ox = 0.5, oy = 0.5;
    let goal = prog, raf = 0, last = 0, live = true, gen = 0;

    const draw = () => {
      if (!grid || !img || !lg) return;
      const o = opts.current;
      const maxD = Math.hypot(Math.max(ox, 1 - ox) * w, Math.max(oy, 1 - oy) * h);
      const soft = Math.max(40 * dpr, maxD * 0.22);
      const R = prog * (maxD + soft);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = `rgb(${pal.surface.join(',')})`;
      ctx.fillRect(0, 0, cv.width, cv.height);
      const px = ox * w, py = oy * h, r0 = cell * dpr * 0.62;
      const ink = `rgb(${pal.ink.join(',')})`;
      for (let i = 0; i < grid.n; i++) {
        const x = (grid.x[i] ?? 0), y = (grid.y[i] ?? 0);
        const d = Math.hypot(x - px, y - py);
        const k = Math.min(1, Math.max(0, (R - d) / soft));
        if (k >= 1) continue;
        const rad = r0 * Math.sqrt(grid.cov[i] ?? 0) * (1 - k);
        if (rad < 0.3) continue;
        ctx.fillStyle = o.dots === 'ink' ? ink : `rgb(${grid.col[i * 3]},${grid.col[i * 3 + 1]},${grid.col[i * 3 + 2]})`;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
      }
      if (prog > 0) {
        lg.globalCompositeOperation = 'source-over';
        lg.clearRect(0, 0, w, h);
        lg.drawImage(img, 0, 0);
        const gr = lg.createRadialGradient(px, py, Math.max(0, R - soft), px, py, Math.max(1, R));
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        lg.globalCompositeOperation = 'destination-in';
        lg.fillStyle = gr; lg.fillRect(0, 0, w, h);
        ctx.drawImage(layer, 0, 0);
      }
    };
    const frame = (t: number) => {
      raf = 0;
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      const step = dt / Math.max(1, opts.current.duration);
      prog = goal > prog ? Math.min(goal, prog + step) : Math.max(goal, prog - step);
      draw();
      if (live && prog !== goal) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const kick = () => { if (opts.current.reduced) { prog = goal; draw(); } else if (!raf && live) raf = requestAnimationFrame(frame); };

    const build = async () => {
      const my = ++gen;
      const r = root.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(r.width * dpr)); h = Math.max(1, Math.round(r.height * dpr));
      cv.width = w; cv.height = h; layer.width = w; layer.height = h;
      const o = opts.current;
      const s: Source = { src: o.src, variant: o.variant };
      const c = await renderSource(s, w, h, pal);
      if (my !== gen) return;
      img = c;
      const light = lumOf(pal.surface) > lumOf(pal.ink);
      grid = buildGrid(c, w, h, o.cell * dpr, o.angle, light);
      draw();
    };
    api.current = { target: (v, x, y) => { if (x !== undefined && y !== undefined) { ox = x; oy = y; } goal = v ? 1 : 0; kick(); } };
    goal = want.current ? 1 : 0;
    void build();
    const ro = new ResizeObserver(() => { void build(); });
    ro.observe(root);
    let firstPal = true;
    const offPal = watchPalette(root, (p) => { pal = p; if (firstPal) { firstPal = false; return; } if (img) void build(); });
    const offLive = watchLive(root, (v) => { live = v; if (v) kick(); });
    return () => { gen++; ro.disconnect(); offPal(); offLive(); if (raf) cancelAnimationFrame(raf); api.current = null; };
  }, [src, variant, cell, angle, dots]);

  useEffect(() => { api.current?.target(wantOpen); }, [wantOpen, reduced]);

  useEffect(() => {
    if (trigger !== 'view') return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver((es) => { const e = es[es.length - 1]; if (e?.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [trigger]);

  const setPin = (v: boolean) => { if (revealed === undefined) setPinned(v); onRevealedChange?.(v); };
  const origin = (e: { clientX: number; clientY: number }) => {
    const r = rootRef.current?.getBoundingClientRect();
    if (!r) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    return [((e.clientX - r.left) * dpr) / (r.width * dpr), ((e.clientY - r.top) * dpr) / (r.height * dpr)] as const;
  };
  const onEnter = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || trigger !== 'hover') return;
    const o = origin(e);
    if (o) api.current?.target(true, o[0], o[1]);
    setHover(true);
  };
  const onClick = (e: MouseEvent) => {
    const o = origin(e);
    if (o && !pin) api.current?.target(true, o[0], o[1]);
    setPin(!pin);
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPin(!pin); } };

  return (
    <div ref={rootRef} role="button" tabIndex={0} aria-pressed={pin} className={`ui-halftone-reveal-root ${className ?? ''}`} style={style}
      aria-label={`${(alt ?? sourceAlt({ src, variant })) || 'Picture'}. ${pin ? 'Shown in full. Press to return to halftone.' : 'Shown as halftone dots. Press to reveal.'}`}
      onPointerEnter={onEnter} onPointerLeave={() => setHover(false)} onClick={onClick} onKeyDown={onKey}>
      <canvas ref={cvRef} className="ui-halftone-reveal-canvas" aria-hidden="true" />
      <span className="ui-halftone-reveal-tag" aria-hidden="true">{wantOpen ? 'Full colour' : trigger === 'view' ? 'Halftone' : 'Hover or tap to reveal'}</span>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-halftone-reveal-demo">
      <HalftoneReveal variant="dunes" cell={7} />
    </div>
  );
}
