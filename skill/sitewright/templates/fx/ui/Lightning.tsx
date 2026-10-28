'use client';
import type { CSSProperties } from 'react';
import { rgba, mix } from './_t2';
import { rng, useCanvas2D, type Frame, type Painter } from './_bg-c-canvas';
import { BgcDemo } from './_bg-c-demo';

export interface LightningProps {
  /** Strikes per minute on their own (default 20). Click or tap strikes immediately. */
  rate?: number;
  /** Branching amount, 0 to 1 (default 0.6). */
  branching?: number;
  className?: string;
  style?: CSSProperties;
}

interface Seg { pts: number[]; w: number }
interface Bolt { segs: Seg[]; age: number; life: number; flicker: number; x: number }

/** Midpoint-displacement polyline from (x0,y0) to (x1,y1), returned as [x,y,x,y...]. */
function jag(rand: () => number, x0: number, y0: number, x1: number, y1: number, rough: number): number[] {
  let pts = [x0, y0, x1, y1];
  let amp = Math.hypot(x1 - x0, y1 - y0) * rough;
  for (let lvl = 0; lvl < 6; lvl++) {
    const out: number[] = [pts[0]!, pts[1]!];
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const ax = pts[i]!, ay = pts[i + 1]!, bx = pts[i + 2]!, by = pts[i + 3]!;
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, o = (rand() - 0.5) * amp;
      out.push((ax + bx) / 2 - (dy / L) * o, (ay + by) / 2 + (dx / L) * o, bx, by);
    }
    pts = out; amp *= 0.55;
  }
  return pts;
}
function makeBolt(rand: () => number, x0: number, y0: number, x1: number, y1: number, branching: number): Bolt {
  const segs: Seg[] = [];
  const grow = (ax: number, ay: number, bx: number, by: number, w: number, depth: number) => {
    const pts = jag(rand, ax, ay, bx, by, 0.2);
    segs.push({ pts, w });
    if (depth > 2) return;
    const n = pts.length / 2;
    for (let i = 4; i < n - 4; i++) {
      if (rand() > 0.07 * branching * (depth === 0 ? 1 : 0.6)) continue;
      const px = pts[i * 2]!, py = pts[i * 2 + 1]!;
      const dir = Math.atan2(by - ay, bx - ax) + (rand() < 0.5 ? -1 : 1) * (0.35 + rand() * 0.6);
      const len = Math.hypot(bx - ax, by - ay) * (0.16 + rand() * 0.22) * (depth ? 0.7 : 1);
      grow(px, py, px + Math.cos(dir) * len, py + Math.sin(dir) * len, w * 0.55, depth + 1);
    }
  };
  grow(x0, y0, x1, y1, 3.4, 0);
  return { segs, age: 0, life: 1.3, flicker: rand(), x: x1 };
}

function makePainter(f0: Frame, rate: number, branching: number): Painter {
  const rand = rng(777);
  let bolts: Bolt[] = [];
  let next = 0.15;
  const strike = (f: Frame, tx?: number, ty?: number) => {
    const x1 = tx ?? f.w * (0.12 + rand() * 0.76);
    const y1 = ty ?? f.h * (0.62 + rand() * 0.3);
    const x0 = x1 + (rand() - 0.5) * f.w * 0.3;
    bolts.push(makeBolt(rand, x0, -10, x1, y1, branching));
    if (bolts.length > 4) bolts.shift();
  };
  /* the still frame under reduced motion: one fixed, fully lit bolt */
  const frozen = makeBolt(rng(31), f0.w * 0.58, -10, f0.w * 0.46, f0.h * 0.82, branching);
  return {
    resize(f) { frozen.segs.length = 0; frozen.segs.push(...makeBolt(rng(31), f.w * 0.58, -10, f.w * 0.46, f.h * 0.82, branching).segs); },
    draw(f: Frame) {
      const { ctx, w, h, pal, dt } = f;
      const pk = f.dark ? pal.ink : mix(pal.ink, pal.primary, 0.25);
      if (!f.reduced) {
        for (const tp of f.ptr.taps) strike(f, tp.x, tp.y);
        next -= dt;
        if (next <= 0 && dt > 0) { strike(f); next = (60 / Math.max(1, rate)) * (0.5 + rand()); }
      }
      for (let i = 0; i < 3; i++) {
        const cx = w * (0.2 + i * 0.3) + Math.sin(f.t * 0.12 + i * 2) * w * 0.06, cy = h * 0.04;
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.5);
        cg.addColorStop(0, rgba(f.dark ? mix(pal.primary, pal.ink, 0.2) : mix(pal.ink, pal.primary, 0.5), f.dark ? 0.2 : 0.16)); cg.addColorStop(1, rgba(pal.primary, 0));
        ctx.fillStyle = cg; ctx.fillRect(0, 0, w, h);
      }
      const list = f.reduced ? [frozen] : bolts;
      let flash = 0;
      for (const b of list) {
        if (!f.reduced) b.age += dt;
        const k = f.reduced ? 0.12 : b.age / b.life;
        const a = f.reduced ? 1 : k > 1 ? 0 : (k < 0.35 ? 0.65 + 0.35 * Math.sin(b.age * (40 + b.flicker * 30)) ** 2 : 0.5 * (1 - (k - 0.35) / 0.65)) + 0.0;
        flash = Math.max(flash, f.reduced ? 0.12 : Math.max(0, 1 - k * 7) * 0.55);
        if (a <= 0.01) continue;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const s of b.segs) {
          const p = s.pts;
          for (const [mul, col, al] of [[7, pal.primary, 0.12], [3, mix(pal.primary, pal.signal, 0.5), 0.35], [1, pk, 0.95]] as const) {
            ctx.beginPath(); ctx.moveTo(p[0]!, p[1]!);
            for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i]!, p[i + 1]!);
            ctx.strokeStyle = rgba(col, al * a); ctx.lineWidth = s.w * mul; ctx.stroke();
          }
        }
        const g = ctx.createRadialGradient(b.x, h, 0, b.x, h, h * 0.7);
        g.addColorStop(0, rgba(pal.signal, 0.32 * a)); g.addColorStop(1, rgba(pal.signal, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      bolts = bolts.filter((b) => b.age < b.life);
      if (flash > 0.01) { ctx.fillStyle = rgba(f.dark ? pal.primary : pal.signal, flash * (f.dark ? 0.22 : 0.2)); ctx.fillRect(0, 0, w, h); }
    },
  };
}

/**
 * Branching lightning bolts that strike on their own every few seconds, flicker, and light the sky around them.
 * Click or tap anywhere (on the parent) to call a strike at that point. Built from midpoint-displaced polylines with
 * recursive forks, drawn on a Canvas 2D in --primary, --signal and --ink. Fills its parent; decorative (aria-hidden).
 * Reduced motion shows one frozen bolt; pauses off-screen.
 */
export default function Lightning({ rate = 20, branching = 0.6, className, style }: LightningProps) {
  const { wrapRef, canvasRef } = useCanvas2D((f) => makePainter(f, rate, Math.min(1, Math.max(0, branching))), { fps: 60, warm: 1 });
  return (
    <div ref={wrapRef} className={'ui-lightning' + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-lightning-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgcDemo title="Storm front" sub="Click anywhere to call a strike.">
      <Lightning />
    </BgcDemo>
  );
}
