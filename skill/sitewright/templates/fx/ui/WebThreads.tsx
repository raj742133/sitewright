'use client';
import type { CSSProperties } from 'react';
import { BgDemo, rgba, useBg2D, type Sketch } from './_bg-a';
import { ramp, wash } from './_bg-f';

export interface WebThreadsProps {
  /** Radial spokes (default 14). */
  spokes?: number;
  /** Concentric rings (default 9). */
  rings?: number;
  /** The pointer plucks the threads, which ring and settle (default true). Listens on the parent. Without a pointer a soft idle pluck keeps it alive. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A spider-web of fine threads: spokes and sagging rings whose joints are springs. Sweeping the pointer
 * across plucks them (they ring and settle); with no pointer a ghost finger strokes the web now and then.
 * Fills its parent: put it first inside a `position:relative` section. Decorative; a still web under
 * reduced motion.
 */
export default function WebThreads({ spokes = 14, rings = 9, interactive = true, className, style }: WebThreadsProps) {
  const { wrapRef, canvasRef, ready } = useBg2D(
    (): Sketch => {
      const S = Math.max(5, Math.min(28, Math.round(spokes))), R = Math.max(3, Math.min(18, Math.round(rings)));
      const N = S * R;
      const rx = new Float32Array(N), ry = new Float32Array(N), dx = new Float32Array(N), dy = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
      let cx = 0, cy = 0, maxR = 1;
      const px = { x: 0, y: 0, ok: false };
      const pluck = (x: number, y: number, ux: number, uy: number, rad: number, gain: number) => {
        for (let n = 0; n < N; n++) {
          const ex = cx + rx[n]! + dx[n]! - x, ey = cy + ry[n]! + dy[n]! - y, d2 = ex * ex + ey * ey;
          if (d2 > rad * rad) continue;
          const fall = 1 - Math.sqrt(d2) / rad;
          vx[n] = vx[n]! + ux * fall * fall * gain; vy[n] = vy[n]! + uy * fall * fall * gain;
        }
      };
      return {
        resize(e) {
          cx = e.w * 0.5; cy = e.h * 0.5; maxR = Math.hypot(e.w, e.h) * 0.52;
          for (let s = 0; s < S; s++) {
            const a = (s / S) * 6.2832 + 0.25 + 0.05 * Math.sin(s * 3.1);
            for (let r = 0; r < R; r++) {
              const rad = maxR * Math.pow((r + 1) / R, 1.25) * (1 + 0.03 * Math.sin(s * 2.3 + r));
              rx[r * S + s] = Math.cos(a) * rad; ry[r * S + s] = Math.sin(a) * rad * 0.86;
            }
          }
          dx.fill(0); dy.fill(0); vx.fill(0); vy.fill(0);
        },
        frame(t, dt, e) {
          const { ctx, w, h, ptr, dark } = e;
          wash(e);
          if (dt > 0) {
            const live = interactive && ptr.inside;
            if (live) {
              if (px.ok) { const sp = Math.hypot(ptr.x - px.x, ptr.y - px.y); if (sp > 0.5) pluck(ptr.x, ptr.y, (ptr.x - px.x) * 9, (ptr.y - px.y) * 9, 70, 1); }
              px.x = ptr.x; px.y = ptr.y; px.ok = true;
            } else {
              px.ok = false;
              const gx = cx + Math.cos(t * 0.42) * maxR * 0.42, gy = cy + Math.sin(t * 0.31 + 1) * maxR * 0.3;
              pluck(gx, gy, -Math.sin(t * 0.42) * 220, Math.cos(t * 0.31 + 1) * 160, 120, dt * 0.55);
            }
            const sub = 2, h2 = Math.min(dt, 0.04) / sub;
            for (let it = 0; it < sub; it++) {
              for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) {
                const n = r * S + s, l = r * S + ((s + S - 1) % S), rr = r * S + (s + 1) % S, i = r > 0 ? n - S : -1, o = r < R - 1 ? n + S : -1;
                let ax = -90 * dx[n]! - 3.2 * vx[n]!, ay = -90 * dy[n]! - 3.2 * vy[n]!;
                let nx = dx[l]! + dx[rr]!, ny = dy[l]! + dy[rr]!, c = 2;
                if (i >= 0) { nx += dx[i]!; ny += dy[i]!; c++; }
                if (o >= 0) { nx += dx[o]!; ny += dy[o]!; c++; }
                ax += 70 * (nx / c - dx[n]!); ay += 70 * (ny / c - dy[n]!);
                vx[n] = vx[n]! + ax * h2; vy[n] = vy[n]! + ay * h2;
              }
              for (let n = 0; n < N; n++) { dx[n] = dx[n]! + vx[n]! * h2; dy[n] = dy[n]! + vy[n]! * h2; }
            }
          }
          const X = (n: number) => cx + rx[n]! + dx[n]!, Y = (n: number) => cy + ry[n]! + dy[n]!;
          ctx.lineCap = 'round';
          // spokes: centre -> ring nodes -> anchored far end
          for (let s = 0; s < S; s++) {
            ctx.beginPath(); ctx.moveTo(cx, cy);
            for (let r = 0; r < R; r++) ctx.lineTo(X(r * S + s), Y(r * S + s));
            const last = (R - 1) * S + s;
            ctx.lineTo(cx + rx[last]! * 1.25, cy + ry[last]! * 1.25);
            ctx.strokeStyle = rgba(e.pal.ink, dark ? 0.34 : 0.3); ctx.lineWidth = 1; ctx.stroke();
          }
          // rings: sagging curves between neighbouring spokes
          for (let r = 0; r < R; r++) {
            ctx.beginPath();
            for (let s = 0; s < S; s++) {
              const a = r * S + s, b = r * S + (s + 1) % S;
              const mx = (X(a) + X(b)) / 2, my = (Y(a) + Y(b)) / 2;
              const sag = 0.14;
              const qx = mx + (cx - mx) * sag, qy = my + (cy - my) * sag;
              if (s === 0) ctx.moveTo(X(a), Y(a));
              ctx.quadraticCurveTo(qx, qy, X(b), Y(b));
            }
            ctx.strokeStyle = rgba(ramp(e, r / (R - 1)), dark ? 0.7 : 0.62); ctx.lineWidth = r % 3 === 0 ? 1.3 : 0.9; ctx.stroke();
          }
          // joints glow when they move
          for (let n = 0; n < N; n++) {
            const v = Math.min(1, Math.hypot(vx[n]!, vy[n]!) / 120);
            ctx.fillStyle = rgba(v > 0.05 ? e.pal.signal : e.pal.primary, 0.45 + 0.5 * v);
            ctx.beginPath(); ctx.arc(X(n), Y(n), 1.3 + 2 * v, 0, 6.2832); ctx.fill();
          }
          void w; void h;
        },
      };
    },
    { pointer: interactive, fps: 60 },
  );
  return (
    <div ref={wrapRef} className={'ui-web-threads' + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-web-threads-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <BgDemo title="Web threads" note="Move the pointer to pluck">
      <WebThreads />
    </BgDemo>
  );
}
