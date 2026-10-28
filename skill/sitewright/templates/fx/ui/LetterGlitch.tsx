'use client';
import type { CSSProperties } from 'react';
import { rgba, mix, type RGB } from './_t2';
import { rng, useCanvas2D, type Frame, type Painter } from './_bg-c-canvas';
import { BgcDemo } from './_bg-c-demo';

export interface LetterGlitchProps {
  /** Glyph size in px (default 15). */
  size?: number;
  /** How many glyphs change per second, as a fraction of the field (default 0.5). */
  rate?: number;
  /** Characters to draw from (default letters, digits and a few symbols). */
  chars?: string;
  className?: string;
  style?: CSSProperties;
}

function makePainter(f0: Frame, size: number, rate: number, chars: string, font: string): Painter {
  const rand = rng(1337);
  const set = chars.length ? Array.from(chars) : ['#'];
  let cols = 0, rows = 0, cw = size * 0.62, ch = size * 1.3;
  let glyph: string[] = [], col = new Uint8Array(0), prev = new Uint8Array(0), fade = new Float32Array(0);
  let bandY = -1, bandT = 0, bandDx = 0, acc = 0;
  const pick = () => set[Math.floor(rand() * set.length)]!;
  const layout = (f: Frame) => {
    cw = size * 0.62; ch = size * 1.3;
    cols = Math.ceil(f.w / cw) + 1; rows = Math.ceil(f.h / ch) + 1;
    const n = cols * rows;
    glyph = Array.from({ length: n }, pick);
    col = new Uint8Array(n); prev = new Uint8Array(n); fade = new Float32Array(n).fill(1);
    for (let i = 0; i < n; i++) col[i] = rand() < 0.1 ? 1 : rand() < 0.18 ? 2 : 0;
    prev.set(col);
  };
  layout(f0);
  return {
    resize: layout,
    draw(f: Frame) {
      const { ctx, pal } = f;
      const n = cols * rows;
      acc += f.dt * rate * n;
      let k = Math.floor(acc);
      acc -= k;
      while (k-- > 0) {
        const i = Math.floor(rand() * n);
        glyph[i] = pick(); prev[i] = col[i]!; col[i] = rand() < 0.14 ? 1 : rand() < 0.3 ? 2 : 0; fade[i] = 0;
      }
      if (f.dt > 0 && bandT <= 0 && rand() < f.dt * 0.35) { bandY = Math.floor(rand() * rows); bandT = 0.16; bandDx = (rand() - 0.5) * cw * 6; }
      bandT -= f.dt;
      const hi = f.dark ? 0.9 : 0.85;
      const colors: RGB[] = [mix(pal.ink, pal.surface, f.dark ? 0.55 : 0.6), pal.primary, pal.signal];
      const alpha = [0.5, hi, hi];
      ctx.font = font;
      ctx.textBaseline = 'top';
      /* resting cells, batched by colour */
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = rgba(colors[c]!, alpha[c]!);
        for (let r = 0; r < rows; r++) {
          const off = bandT > 0 && r === bandY ? bandDx : 0;
          for (let q = 0; q < cols; q++) {
            const i = r * cols + q;
            if (col[i] !== c) continue;
            if (fade[i]! < 1) continue;
            ctx.fillText(glyph[i]!, q * cw + off, r * ch);
          }
        }
      }
      /* cells still blending from their previous colour */
      for (let i = 0; i < n; i++) {
        if (fade[i]! >= 1) continue;
        fade[i] = Math.min(1, fade[i]! + f.dt * 3.2);
        const a = colors[prev[i]!]!, b = colors[col[i]!]!, m = mix(a, b, fade[i]!);
        const r = Math.floor(i / cols), q = i - r * cols;
        const off = bandT > 0 && r === bandY ? bandDx : 0;
        ctx.fillStyle = rgba(m, alpha[prev[i]!]! + (alpha[col[i]!]! - alpha[prev[i]!]!) * fade[i]!);
        ctx.fillText(glyph[i]!, q * cw + off, r * ch);
      }
    },
  };
}

/**
 * A field of monospace characters that keep flipping to new glyphs and blending between ink, --primary and
 * --signal, with the occasional horizontal row-tear. Canvas 2D, batched by colour so it stays cheap; the centre
 * is calmed by a CSS vignette so foreground text stays readable. Fills its parent; decorative (aria-hidden).
 * One frozen frame under reduced motion; pauses off-screen.
 */
export default function LetterGlitch({ size = 15, rate = 0.5, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+<>/=', className, style }: LetterGlitchProps) {
  const { wrapRef, canvasRef } = useCanvas2D(
    (f) => {
      let fam = 'ui-monospace, SFMono-Regular, Menlo, monospace';
      const w = wrapRef.current;
      if (w) { const v = getComputedStyle(w).getPropertyValue('--font-mono').trim(); if (v) fam = v; }
      return makePainter(f, Math.max(8, size), Math.max(0, rate), chars, `600 ${Math.max(8, size)}px ${fam}`);
    },
    { fps: 30, warm: 60 },
  );
  return (
    <div ref={wrapRef} className={'ui-letter-glitch' + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-letter-glitch-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgcDemo title="Signal noise" sub="Characters flip, tint and tear.">
      <LetterGlitch />
    </BgcDemo>
  );
}
