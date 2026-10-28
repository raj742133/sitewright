'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import { clampDpr, rgba, useReducedMotion, watchPalette, type Palette } from './_t2';
import { clamp, fitCanvas, onFontsReady, seeded, useLoop, useSize } from './_text-a-kit';

export interface FuzzyTextProps {
  /** The text (also the accessible name). */
  text?: string;
  /** Resting fuzz: horizontal scanline jitter in px. */
  fuzz?: number;
  /** Fuzz while the pointer is over the text or a finger is down. */
  hoverFuzz?: number;
  /** Font weight. */
  weight?: number;
  /** Solid CSS colour; leave empty for the primary-to-signal brand gradient. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

/** Text drawn in canvas whose scanlines tremble sideways, leaving a furry, TV-static edge. The pointer (or a touch) raises the interference. Still under reduced motion. */
export default function FuzzyText({ text = 'Fuzzy', fuzz = 3, hoverFuzz = 11, weight = 900, color, className, style }: FuzzyTextProps) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const { w, h } = useSize(root);
  const s = useRef({ off: null as HTMLCanvasElement | null, pal: null as Palette | null, amp: fuzz, hover: false, frame: 0, acc: 0, ox: 0, oy: 0, fw: 0, fh: 0 });

  /** Rasterises the clean word once; frames then only slice and shift it. */
  const bake = () => {
    const el = root.current;
    if (!el || w < 8 || h < 8) return;
    const dpr = clampDpr();
    const pad = Math.ceil(hoverFuzz * 2 + 6);
    const cs = getComputedStyle(el);
    const fam = cs.fontFamily;
    const probe = document.createElement('canvas').getContext('2d');
    if (!probe) return;
    probe.font = `${weight} 100px ${fam}`;
    const m = probe.measureText(text);
    const size = clamp(Math.min(((w - pad * 2) / Math.max(1, m.width)) * 100, h * 0.62), 14, 260);
    const tw = Math.ceil((m.width * size) / 100);
    const off = document.createElement('canvas');
    off.width = Math.ceil((tw + pad * 2) * dpr);
    off.height = Math.ceil(size * 1.3 * dpr);
    const g = off.getContext('2d');
    if (!g) return;
    g.scale(dpr, dpr);
    g.font = `${weight} ${size}px ${fam}`;
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    const p = s.current.pal;
    if (color) g.fillStyle = color;
    else {
      const grd = g.createLinearGradient(pad, 0, pad + tw, 0);
      grd.addColorStop(0, p ? rgba(p.primary, 1) : '#2563eb');
      grd.addColorStop(1, p ? rgba(p.signal, 1) : '#f59e0b');
      g.fillStyle = grd;
    }
    g.fillText(text, (tw + pad * 2) / 2, (size * 1.3) / 2 + size * 0.04);
    const k = s.current;
    k.off = off; k.fw = off.width / dpr; k.fh = off.height / dpr;
    k.ox = (w - k.fw) / 2; k.oy = (h - k.fh) / 2;
    paint(0);
  };

  const paint = (frame: number) => {
    const k = s.current;
    const c = canvas.current;
    if (!c || !k.off || w < 8) return;
    const ctx = fitCanvas(c, w, h);
    if (!ctx) return;
    const dpr = clampDpr();
    ctx.clearRect(0, 0, w, h);
    const rnd = seeded(frame * 7919 + 13);
    const rows = Math.ceil(k.fh);
    const amp = k.amp;
    // Faint wide ghost first, then the sharp jittered scanlines.
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = pass === 0 ? 0.3 : 1;
      const spread = pass === 0 ? 1.8 : 1;
      let drift = 0;
      for (let y = 0; y < rows; y++) {
        drift = drift * 0.55 + (rnd() - 0.5) * 2 * amp * spread;
        const sy = Math.floor(y * dpr);
        const sh = Math.max(1, Math.floor((y + 1) * dpr) - sy);
        if (sy + sh > k.off.height) break;
        ctx.drawImage(k.off, 0, sy, k.off.width, sh, k.ox + drift, k.oy + y, k.fw, sh / dpr);
      }
    }
    ctx.globalAlpha = 1;
  };

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const offP = watchPalette(el, (p) => { s.current.pal = p; bake(); });
    const offF = onFontsReady(bake);
    bake();
    return () => { offP(); offF(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, w, h, weight, color, hoverFuzz]);

  useEffect(() => { s.current.amp = fuzz; if (reduced) paint(0); });

  useLoop(root, (_t, dt) => {
    const k = s.current;
    const target = k.hover ? hoverFuzz : fuzz;
    k.amp += (target - k.amp) * Math.min(1, dt * 10);
    k.acc += dt;
    if (k.acc < 0.055) return;
    k.acc = 0; k.frame++;
    paint(k.frame);
  }, !reduced);

  return (
    <div ref={root} className={`ui-fuzzy-text-root ${className ?? ''}`} style={style}
      onPointerEnter={() => { s.current.hover = true; }} onPointerLeave={() => { s.current.hover = false; }}
      onPointerDown={() => { s.current.hover = true; }} onPointerUp={(e) => { if (e.pointerType === 'touch') s.current.hover = false; }}>
      <canvas ref={canvas} className="ui-fuzzy-text-canvas" role="img" aria-label={text} />
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-fuzzy-text-stage">
      <FuzzyText text="Fuzzy" />
    </div>
  );
}
