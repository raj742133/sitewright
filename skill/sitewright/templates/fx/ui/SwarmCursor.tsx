'use client';
import { useEffect, useRef } from 'react';
import { createField, ease, fitCanvas, mix, rgba, rng, useCoarsePointer, useReducedMotion, type CursorFxProps } from './_cursor-kit';
import { Stage } from './_cursor-stage';

export interface SwarmCursorProps extends CursorFxProps {
  /** Number of agents in the swarm. */
  count?: number;
  /** Radius of the cloud around the pointer when it rests, in px. */
  spread?: number;
}

interface Agent { x: number; y: number; vx: number; vy: number; ph: number; orbit: number; spin: number; tx: number[]; ty: number[] }
const TRAIL = 7;

/** A small swarm of agents flies after the pointer, orbiting it while it rests and stretching out when it moves. A press scatters them; on touch screens the swarm follows your finger and chases a ghost pointer when idle. Scoped to its box unless `global`. */
export default function SwarmCursor({ children, className, style, global = false, idle = 'touch', count = 40, spread = 46 }: SwarmCursorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();

  useEffect(() => {
    const host = hostRef.current, canvas = layerRef.current;
    if (!host || !canvas) return;
    const rand = rng(11);
    const agents: Agent[] = Array.from({ length: count }, (_, i) => ({
      x: 0, y: 0, vx: 0, vy: 0, ph: rand() * 6.283, orbit: 0.25 + 0.75 * Math.sqrt((i + 0.5) / count), spin: (rand() > 0.5 ? 1 : -1) * (0.6 + rand() * 0.9), tx: [], ty: [],
    }));
    let placed = false, presence = 0, stretch = 0;
    const place = (cx: number, cy: number, f: { t: number }) => {
      agents.forEach((a) => {
        const ang = a.ph, r = a.orbit * spread;
        a.x = cx + Math.cos(ang) * r; a.y = cy + Math.sin(ang) * r; a.vx = a.vy = 0; a.tx = []; a.ty = [];
      });
      void f; placed = true;
    };
    const arrow = (ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, s: number) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(s * 1.5, 0); ctx.lineTo(-s, s * 0.8); ctx.lineTo(-s * 0.5, 0); ctx.lineTo(-s, -s * 0.8); ctx.closePath(); ctx.fill(); ctx.restore();
    };
    const fx = createField(host, canvas, { global, idle, reduced, coarse }, {
      down: (f, x, y) => {
        if (reduced) return;
        agents.forEach((a) => { const dx = a.x - x, dy = a.y - y, d = Math.hypot(dx, dy) || 1, k = 520 / (1 + d * 0.01); a.vx += (dx / d) * k; a.vy += (dy / d) * k; });
        void f;
      },
      frame: (f) => {
        const ctx = fitCanvas(canvas, f);
        if (!ctx) return;
        const here = f.seen && (f.inside || f.auto);
        presence = reduced ? 1 : ease(presence, here ? 1 : 0, 6, f.dt);
        const cx = f.x, cy = f.y;
        if (!placed) place(cx, cy, f);
        const speed = Math.hypot(f.vx, f.vy);
        stretch = ease(stretch, Math.min(1, speed / 700), 4, f.dt);
        ctx.clearRect(0, 0, f.w, f.h);
        const { primary, signal } = f.pal;
        const rad = spread * (1 + stretch * 1.4);
        agents.forEach((a, i) => {
          if (reduced) {
            a.x = cx + Math.cos(a.ph) * a.orbit * spread; a.y = cy + Math.sin(a.ph) * a.orbit * spread;
          } else {
            const ang = a.ph + f.t * a.spin * 1.6;
            const r = a.orbit * rad * (0.85 + 0.15 * Math.sin(f.t * 2 + a.ph * 3));
            const lead = 0.06 * stretch;
            const ax = (cx + f.vx * lead + Math.cos(ang) * r - a.x) * 38 - a.vx * 7.5;
            const ay = (cy + f.vy * lead + Math.sin(ang) * r - a.y) * 38 - a.vy * 7.5;
            a.vx += ax * f.dt; a.vy += ay * f.dt;
            a.x += a.vx * f.dt; a.y += a.vy * f.dt;
            a.tx.unshift(a.x); a.ty.unshift(a.y);
            if (a.tx.length > TRAIL) { a.tx.pop(); a.ty.pop(); }
          }
          const col = mix(primary, signal, i % 3 === 0 ? 0.9 : i % 3 === 1 ? 0.3 : 0);
          const al = presence * (0.55 + 0.45 * a.orbit);
          if (!reduced && a.tx.length > 1) {
            ctx.lineCap = 'round';
            for (let s = 1; s < a.tx.length; s++) {
              ctx.strokeStyle = rgba(col, al * (1 - s / a.tx.length) * 0.5);
              ctx.lineWidth = 2.2 * (1 - s / a.tx.length) + 0.4;
              ctx.beginPath(); ctx.moveTo(a.tx[s - 1]!, a.ty[s - 1]!); ctx.lineTo(a.tx[s]!, a.ty[s]!); ctx.stroke();
            }
          }
          const dir = reduced ? a.ph : Math.hypot(a.vx, a.vy) > 8 ? Math.atan2(a.vy, a.vx) : a.ph;
          ctx.fillStyle = rgba(col, al);
          arrow(ctx, a.x, a.y, dir, 2.6 + a.orbit * 1.8);
        });
        return !reduced && (presence > 0.01 || here);
      },
    });
    return () => fx.dispose();
  }, [global, idle, reduced, coarse, count, spread]);

  return (
    <div ref={hostRef} className={`ui-swarm-cursor-root ${className ?? ''}`} style={style}>
      <div className="ui-swarm-cursor-content">{children}</div>
      <canvas ref={layerRef} className={`ui-swarm-cursor-layer${global ? ' ui-swarm-cursor-global' : ''}`} aria-hidden="true" />
    </div>
  );
}

export function Demo() {
  return (
    <SwarmCursor idle="always">
      <Stage eyebrow="Swarm cursor" title="Followed by a flock" text="They orbit while you rest and stretch out when you move." />
    </SwarmCursor>
  );
}
