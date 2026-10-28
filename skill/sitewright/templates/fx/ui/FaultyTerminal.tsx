'use client';
import type { CSSProperties } from 'react';
import { DemoShell, clamp, lum, mixc, rgba, rng, useCanvasBg, type Frame } from './_bg-b-kit';

export interface FaultyTerminalProps {
  /** How often the screen glitches, 0..1 (default 0.6). */
  glitch?: number;
  /** Scroll speed in lines per second (default 3). */
  speed?: number;
  /** Text size in px; defaults to a size that suits the parent. */
  fontSize?: number;
  className?: string;
  style?: CSSProperties;
}

const WORDS = ['sync', 'link', 'node', 'cache', 'queue', 'probe', 'relay', 'vault', 'frame', 'index', 'shard', 'ping'];
const STATES = ['ok', 'ok', 'ok', 'warn', 'retry', 'ok', 'fail', 'ok'];
const POOL: string[] = (() => {
  const r = rng(404);
  const hex = (n: number) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(r() * 16)]).join('');
  return Array.from({ length: 96 }, (_, i) => {
    const k = Math.floor(r() * 4);
    const wd = WORDS[Math.floor(r() * WORDS.length)]!, st = STATES[Math.floor(r() * STATES.length)]!;
    const ts = String(1000 + ((i * 37) % 9000)).padStart(5, '0');
    if (k === 0) return `[${ts}] ${wd}/${hex(4)} .......... ${st}`;
    if (k === 1) return `0x${hex(6)}  ${hex(2)} ${hex(2)} ${hex(2)} ${hex(2)} ${hex(2)} ${hex(2)}  |${wd}|`;
    if (k === 2) return `> ${wd} --${WORDS[Math.floor(r() * WORDS.length)]} ${(r() * 99).toFixed(1)}ms ${st}`;
    return `${st.toUpperCase().padEnd(5)} ${wd}.${hex(3)} -> ${WORDS[Math.floor(r() * WORDS.length)]}.${hex(3)}`;
  });
})();
const JUNK = '#%&@$?/\\|<>=+*~^';
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function drawTerminal(f: Frame, glitch: number, speed: number, fontSize?: number) {
  const { ctx, w, h, t, pal } = f;
  const dark = lum(pal.surface) < 0.5;
  const fs = fontSize ?? clamp(Math.round(Math.min(w / 34, 15)), 10, 15);
  const lh = Math.round(fs * 1.5);
  const rows = Math.ceil(h / lh) + 1;
  const bg = mixc(pal.surface, pal.primary, dark ? 0.12 : 0.08);
  const fg = mixc(pal.primary, pal.ink, dark ? 0.1 : 0.3);
  const warn = mixc(pal.signal, pal.ink, dark ? 0 : 0.25);
  ctx.fillStyle = rgba(bg, 1); ctx.fillRect(0, 0, w, h);
  ctx.font = `${fs}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.textBaseline = 'top';
  const scroll = t * speed;
  const base = Math.floor(scroll), frac = scroll - base;
  const flick = 1 - 0.06 * hash(Math.floor(t * 24));
  const tick = Math.floor(t * 7);
  const gAmt = clamp(glitch, 0, 1);
  const bandOn = hash(tick * 3.1) < 0.12 + gAmt * 0.45;
  const bandRow = Math.floor(hash(tick * 1.7) * rows), bandLen = 2 + Math.floor(hash(tick * 5.3) * 5);
  const pad = Math.round(fs * 1.2);
  const pRow = f.hover > 0.1 ? Math.floor(f.py * rows) : -99;

  for (let r = 0; r < rows; r++) {
    const idx = ((base + r) % POOL.length + POOL.length) % POOL.length;
    let line = POOL[idx]!;
    const y = r * lh - frac * lh;
    const inBand = bandOn && r >= bandRow && r < bandRow + bandLen;
    const near = Math.abs(r - pRow) <= 1;
    let dx = 0;
    if (inBand) dx = (hash(tick + r * 9.1) - 0.5) * 46 * (0.4 + gAmt);
    if (near) dx += (hash(tick * 2 + r) - 0.5) * 18 * f.hover;
    if (inBand || near) {
      const cs = line.split('');
      for (let k = 0; k < cs.length; k++) if (hash(tick * 13 + r * 7 + k) < 0.12) cs[k] = JUNK[Math.floor(hash(k + r * 3 + tick) * JUNK.length)]!;
      line = cs.join('');
    }
    const isWarn = /warn|retry|fail|WARN|FAIL|RETRY/.test(line);
    const col = isWarn ? warn : fg;
    const a = (0.5 + 0.35 * Math.sin(r * 0.5 + 1.2) ** 2) * flick * (isWarn ? 1 : 0.9);
    if (inBand && dx !== 0) {
      ctx.fillStyle = rgba(pal.signal, a * 0.7); ctx.fillText(line, pad + dx + 2.5, y);
      ctx.fillStyle = rgba(pal.primary, a * 0.7); ctx.fillText(line, pad + dx - 2.5, y);
    }
    ctx.fillStyle = rgba(col, a);
    ctx.fillText(line, pad + dx, y);
  }
  // prompt line with a blinking cursor, pinned to the bottom
  const py = Math.floor((h - lh * 1.8) / lh) * lh + lh * 0.2;
  ctx.fillStyle = rgba(bg, 0.9); ctx.fillRect(0, py - 4, w, h - py + 4);
  ctx.fillStyle = rgba(fg, 0.95); ctx.fillText('sw@host:~$ run --check', pad, py);
  const cw = ctx.measureText('sw@host:~$ run --check ').width;
  if (f.reduced || Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = rgba(pal.signal, 0.95); ctx.fillRect(pad + cw, py + 1, Math.ceil(fs * 0.62), fs); }
  // tearing line
  if (bandOn) { const ty = (bandRow + bandLen) * lh; ctx.fillStyle = rgba(pal.primary, 0.18); ctx.fillRect(0, ty, w, 2); }
  // scanlines
  ctx.fillStyle = rgba(dark ? [0, 0, 0] : pal.ink, dark ? 0.2 : 0.055);
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  // rolling bar
  const by = ((t * 0.12) % 1.4 - 0.2) * h;
  const rg = ctx.createLinearGradient(0, by - 40, 0, by + 40);
  rg.addColorStop(0, rgba(pal.primary, 0)); rg.addColorStop(0.5, rgba(pal.primary, 0.09)); rg.addColorStop(1, rgba(pal.primary, 0));
  ctx.fillStyle = rg; ctx.fillRect(0, by - 40, w, 80);
  // vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, dark ? 'rgba(0,0,0,.5)' : rgba(mixc(pal.primary, pal.ink, 0.5), 0.2));
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
}

/**
 * A glitching terminal screen: scrolling log lines, tearing bands with RGB split, corrupted characters,
 * scanlines, flicker and a blinking prompt. Hovering the parent scrambles the lines under the pointer.
 * Fills its parent (first child of a `position:relative` section). Decorative (aria-hidden); a single still
 * frame with reduced motion.
 */
export default function FaultyTerminal({ glitch = 0.6, speed = 3, fontSize, className, style }: FaultyTerminalProps) {
  const { wrapRef, canvasRef, status } = useCanvasBg((f) => drawTerminal(f, glitch, speed, fontSize), { fps: 30 });
  return (
    <div ref={wrapRef} className={'ui-faulty-terminal' + (className ? ' ' + className : '')} style={style} data-state={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-faulty-terminal-canvas" />
    </div>
  );
}

export function Demo() {
  return <DemoShell bg={<FaultyTerminal />} title="Signal lost" sub="Self-test failed. Retrying link." />;
}
