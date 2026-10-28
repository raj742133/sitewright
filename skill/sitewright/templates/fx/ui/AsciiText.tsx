'use client';
import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react';
import { readPalette, rgba, mix, watchPalette, type Palette } from './_t2';
import { useReducedMotion } from './_t2';
import { fitCanvas, onFontsReady, useLoop, useSize } from './_text-a-kit';

export interface AsciiTextProps {
  /** The word or short phrase to render as ASCII art (also the accessible name). */
  text?: string;
  /** Characters from lightest to densest. */
  ramp?: string;
  /** Cell height in px; 0 picks one from the container width. */
  cell?: number;
  /** Pointer lens and click ripples. */
  interactive?: boolean;
  /** Font weight used to rasterise the word. */
  weight?: number;
  className?: string;
  style?: CSSProperties;
}

interface Field { cols: number; rows: number; cw: number; ch: number; cov: Float32Array }

/** Rasterises the word onto an offscreen canvas and averages it into a coverage value per character cell. */
function buildField(text: string, w: number, h: number, cell: number, weight: number, family: string): Field {
  const ch = cell;
  const cw = Math.round(cell * 0.6 * 10) / 10;
  const cols = Math.max(4, Math.floor(w / cw));
  const rows = Math.max(3, Math.floor(h / ch));
  const S = 2;
  const off = document.createElement('canvas');
  off.width = Math.round(cols * cw * S);
  off.height = Math.round(rows * ch * S);
  const g = off.getContext('2d', { willReadFrequently: true });
  const cov = new Float32Array(cols * rows);
  if (!g) return { cols, rows, cw, ch, cov };
  g.fillStyle = '#000';
  let size = off.height * 0.78;
  g.font = `${weight} ${size}px ${family}`;
  const sx = 0.7; // letters are drawn narrower so the word gets more character rows
  const mw = g.measureText(text).width * sx;
  const maxW = off.width * 0.94;
  if (mw > maxW) { size *= maxW / mw; g.font = `${weight} ${size}px ${family}`; }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.translate(off.width / 2, off.height * 0.54);
  g.scale(sx, 1);
  g.fillText(text, 0, 0);
  const data = g.getImageData(0, 0, off.width, off.height).data;
  const bw = cw * S;
  const bh = ch * S;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
        const px = Math.min(off.width - 1, Math.floor(c * bw + ((i + 0.5) / 3) * bw));
        const py = Math.min(off.height - 1, Math.floor(r * bh + ((j + 0.5) / 3) * bh));
        sum += (data[(py * off.width + px) * 4 + 3] ?? 0) / 255;
      }
      cov[r * cols + c] = sum / 9;
    }
  }
  return { cols, rows, cw, ch, cov };
}

/** A word drawn as living ASCII art: characters swell and fade in a travelling wave, the pointer acts as a lens and clicks send ripples. Static under reduced motion. */
export default function AsciiText({ text = 'Sitewright', ramp = ' .:-=+*#%@', cell = 0, interactive = true, weight = 800, className, style }: AsciiTextProps) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const { w, h } = useSize(root);
  const st = useRef({ field: null as Field | null, pal: null as Palette | null, mono: 'monospace', px: -1, py: -1, lens: 0, ripples: [] as { x: number; y: number; t: number }[], clock: 0 });

  const draw = (t: number, dt: number) => {
    const s = st.current;
    const c = canvas.current;
    const f = s.field;
    if (!c || !f || !s.pal || w < 10) return;
    const ctx = fitCanvas(c, f.cols * f.cw, f.rows * f.ch);
    if (!ctx) return;
    const p = s.pal;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.font = `700 ${f.ch * 0.92}px ${s.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const inside = s.px >= 0;
    s.lens += ((inside ? 1 : 0) - s.lens) * Math.min(1, dt * 8);
    s.ripples = s.ripples.filter((r) => t - r.t < 1.6);
    const n = ramp.length - 1;
    const hi = mix(p.primary, p.signal, 0.0);
    let last = '';
    for (let r = 0; r < f.rows; r++) {
      for (let col = 0; col < f.cols; col++) {
        const v = f.cov[r * f.cols + col] ?? 0;
        const wave = Math.sin(col * 0.32 - t * 2.1 + r * 0.45) * 0.5 + 0.5;
        let lvl = v > 0.04 ? v * (0.72 + 0.28 * wave) : 0;
        let heat = 0;
        if (s.lens > 0.01) {
          const dx = col * f.cw - s.px, dy = r * f.ch - s.py;
          const d = Math.sqrt(dx * dx + dy * dy);
          const k = Math.max(0, 1 - d / (f.ch * 5.5)) * s.lens;
          heat = k;
          lvl = Math.min(1, lvl + k * 0.55 * (v > 0.04 ? 1 : 0.16));
        }
        for (const rp of s.ripples) {
          const age = t - rp.t;
          const dx = col * f.cw - rp.x, dy = r * f.ch - rp.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const band = Math.exp(-Math.pow((d - age * f.ch * 22) / (f.ch * 2.2), 2)) * (1 - age / 1.6);
          if (band > 0.02) { lvl = Math.min(1, lvl + band * 0.8); heat = Math.max(heat, band); }
        }
        if (lvl < 0.06) {
          if (wave > 0.965 && (col + r * 3) % 4 === 0) {
            ctx.fillStyle = rgba(p.muted, 0.35);
            ctx.fillText('.', col * f.cw + f.cw / 2, r * f.ch + f.ch / 2);
          }
          continue;
        }
        const idx = Math.min(n, Math.round(lvl * n));
        const chr = ramp[idx];
        if (!chr || chr === ' ') continue;
        const tone = col / f.cols;
        const base = mix(mix(p.primary, p.signal, tone * 0.85), p.ink, 0.12);
        const col2 = mix(base, hi, 0);
        const fill = heat > 0.05 ? rgba(mix(col2, p.signal, Math.min(1, heat)), 0.55 + 0.45 * lvl) : rgba(col2, 0.6 + 0.4 * lvl);
        if (fill !== last) { ctx.fillStyle = fill; last = fill; }
        ctx.fillText(chr, col * f.cw + f.cw / 2, r * f.ch + f.ch / 2);
      }
    }
  };

  // Rebuild the coverage field when size, text or fonts change; repaint at once.
  useEffect(() => {
    const el = root.current;
    if (!el || w < 10 || h < 10) return;
    const build = () => {
      const cs = getComputedStyle(el);
      const body = cs.fontFamily;
      st.current.mono = cs.getPropertyValue('--font-mono').trim() || 'ui-monospace, Menlo, monospace';
      const size = cell > 0 ? cell : Math.max(7, Math.min(20, Math.round(w / 50)));
      st.current.field = buildField(text, w, h, size, weight, body);
      draw(1.3, 0.016);
    };
    build();
    const offFonts = onFontsReady(build);
    const offPal = watchPalette(el, (p) => { st.current.pal = p; draw(1.3, 0.016); });
    return () => { offFonts(); offPal(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, w, h, cell, weight, ramp]);

  useEffect(() => { if (reduced) draw(1.3, 0.016); });
  useLoop(root, (t, dt) => draw(t, dt), !reduced);

  const local = (e: PointerEvent) => {
    const f = st.current.field;
    const c = canvas.current;
    if (!f || !c) return null;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * f.cols * f.cw, y: ((e.clientY - r.top) / r.height) * f.rows * f.ch };
  };
  const move = (e: PointerEvent) => {
    if (!interactive || reduced) return;
    const p = local(e);
    if (p) { st.current.px = p.x; st.current.py = p.y; }
  };
  const down = (e: PointerEvent) => {
    if (!interactive || reduced) return;
    const p = local(e);
    if (p) { st.current.ripples.push({ x: p.x, y: p.y, t: performance.now() / 1000 }); st.current.px = p.x; st.current.py = p.y; }
  };
  const leave = () => { st.current.px = -1; st.current.py = -1; };

  return (
    <div ref={root} className={`ui-asciitext-root ${className ?? ''}`} style={style}
      onPointerMove={move} onPointerDown={down} onPointerLeave={leave} onPointerUp={(e) => { if (e.pointerType === 'touch') leave(); }}>
      <canvas ref={canvas} className="ui-asciitext-canvas" role="img" aria-label={text} />
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-asciitext-stage">
      <AsciiText text="ASCII" />
    </div>
  );
}
