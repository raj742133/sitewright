'use client';
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { useReducedMotion, watchLive, watchPalette, clampDpr, rgba, mix, type Palette } from './_t2';
import { makeRig, stepRig, type Rig } from './_inputs-verlet';

export interface LanyardProps {
  name?: string;
  role?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
}

/** A name badge on a strap. The strap is a verlet rope and the badge swings on it; drag the badge, or press the arrow keys to give it a push. */
export default function Lanyard({ name = 'Avery Stone', role = 'Design engineer', id = 'No. 0427', className, style }: LanyardProps) {
  const root = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const sim = useRef<{ kick: (fx: number, fy: number) => void; grab: (p: { x: number; y: number } | null) => void; geo: () => { cx: number; cy: number }; wake: () => void } | null>(null);

  useEffect(() => {
    const el = root.current, c = cv.current, cardEl = card.current;
    if (!el || !c || !cardEl) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let W = 0, H = 0, dpr = 1, ax = 0, ay = 0, cw = 0, ch = 0, rig: Rig | null = null;
    let pal: Palette | null = null;
    let raf = 0, live = true, asleep = false;
    let grabPt: { x: number; y: number } | null = null;
    let calm = 0;
    const build = () => {
      W = el.clientWidth; H = el.clientHeight;
      dpr = clampDpr();
      c.width = Math.max(1, Math.round(W * dpr)); c.height = Math.max(1, Math.round(H * dpr));
      ch = Math.max(84, Math.min(H * 0.52, 230)); cw = Math.min(ch * 0.72, W * 0.7);
      cardEl.style.width = cw + 'px'; cardEl.style.height = ch + 'px';
      cardEl.style.setProperty('--u', ch / 140 + '');
      ax = W / 2; ay = -4;
      const rope = Math.max(40, H - ch - 14 - 12) * 0.62;
      rig = makeRig(ax, ay, rope, ch * 0.5 - 4);
      // start slightly swung so the first frame is not dead straight (a still pose under reduced motion)
      if (!reducedRef.current) rig.tail.x += 26;
      asleep = false;
    };
    const draw = () => {
      if (!rig || !pal) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const pts = rig.rope;
      const att = pts[pts.length - 1]!;
      // strap: a ribbon along the rope
      const side = (i: number) => { const a = pts[Math.max(0, i - 1)]!, b = pts[Math.min(pts.length - 1, i + 1)]!; const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { nx: -dy / l, ny: dx / l }; };
      const half = Math.max(5, ch * 0.05);
      ctx.beginPath();
      pts.forEach((p, i) => { const s = side(i); ctx[i ? 'lineTo' : 'moveTo'](p.x + s.nx * half, p.y + s.ny * half); });
      for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]!, s = side(i); ctx.lineTo(p.x - s.nx * half, p.y - s.ny * half); }
      ctx.closePath();
      ctx.fillStyle = rgba(pal.primary, 1);
      ctx.fill();
      ctx.strokeStyle = rgba(mix(pal.primary, pal.ink, 0.35), 1);
      ctx.lineWidth = 1; ctx.stroke();
      // stitched centre line
      ctx.beginPath(); ctx.setLineDash([4, 5]);
      pts.forEach((p, i) => { ctx[i ? 'lineTo' : 'moveTo'](p.x, p.y); });
      ctx.strokeStyle = rgba(mix(pal.primary, [255, 255, 255], 0.6), 0.9); ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
      // clip ring
      ctx.beginPath(); ctx.arc(att.x, att.y, half * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = rgba(pal.muted, 1); ctx.fill();
      // card element follows attach point / centre
      const t = rig.tail;
      const ang = Math.atan2(t.x - att.x, t.y - att.y); // 0 when hanging straight down
      const mx = (att.x + t.x) / 2, my = (att.y + t.y) / 2;
      cardEl.style.transform = `translate(${(mx - cw / 2).toFixed(1)}px, ${(my - ch / 2 - 0).toFixed(1)}px) rotate(${(-ang).toFixed(4)}rad)`;
    };
    const frame = () => {
      raf = 0;
      if (!rig) return;
      const e = stepRig(rig, ax, ay, grabPt);
      draw();
      if (!grabPt && e < 0.0008) { calm++; } else calm = 0;
      if (calm > 30) { asleep = true; return; }
      if (live && !reducedRef.current || grabPt) raf = requestAnimationFrame(frame);
    };
    const wake = () => { asleep = false; calm = 0; if (!raf && live) raf = requestAnimationFrame(frame); };
    sim.current = {
      kick: (fx, fy) => { if (!rig) return; rig.tail.px -= fx; rig.tail.py -= fy; wake(); },
      grab: (p) => { grabPt = p; wake(); },
      geo: () => ({ cx: rig ? rig.tail.x : 0, cy: rig ? rig.tail.y : 0 }),
      wake,
    };
    build();
    const offP = watchPalette(el, (p) => { pal = p; draw(); });
    if (reducedRef.current) { for (let i = 0; i < 400; i++) stepRig(rig!, ax, ay, null); draw(); }
    else wake();
    const ro = new ResizeObserver(() => { build(); if (reducedRef.current) { for (let i = 0; i < 400; i++) stepRig(rig!, ax, ay, null); } draw(); wake(); });
    ro.observe(el);
    const offL = watchLive(el, (l) => { live = l; if (l) wake(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); offP(); offL(); sim.current = null; };
  }, []);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    move(e);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const r = root.current!.getBoundingClientRect();
    sim.current?.grab({ x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const up = () => sim.current?.grab(null);
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const k: Record<string, [number, number]> = { ArrowLeft: [-9, 0], ArrowRight: [9, 0], ArrowUp: [0, -6], ArrowDown: [0, 6], Enter: [9, 0], ' ': [-9, 0] };
    const v = k[e.key];
    if (!v) return;
    e.preventDefault();
    sim.current?.kick(v[0], v[1]);
  };
  const initials = name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
  return (
    <div ref={root} className={`ui-lanyard-root ${className ?? ''}`} style={style}>
      <canvas ref={cv} className="ui-lanyard-canvas" aria-hidden="true" />
      <div ref={card} className="ui-lanyard-card" role="group" tabIndex={0} aria-label={`${name}, ${role}. A badge hanging on a strap: drag it to swing it, or use the arrow keys to push it.`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
        <span className="ui-lanyard-slot" aria-hidden="true" />
        <span className="ui-lanyard-avatar" aria-hidden="true">{initials}</span>
        <strong>{name}</strong>
        <span className="ui-lanyard-role">{role}</span>
        <span className="ui-lanyard-id">{id}</span>
        <span className="ui-lanyard-stripe" aria-hidden="true" />
      </div>
    </div>
  );
}

export function Demo() {
  return <div className="ui-lanyard-demo"><Lanyard /></div>;
}
