'use client';
import { useEffect, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { clamp } from './_ha-kit';
import type { Book } from './_ha-books';

/* Quillfold Press: the tall 3D book of the first screen. Pure CSS 3D (front board, spine, page block, top and bottom edges, back) driven by
   one rAF loop that also projects the book's corners to the screen, so the headline can be cut along the real silhouette:
   ink where it crosses the page, paper-coloured where it crosses the cover. */

export const PERSP = 1600;
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Charter, 'Bitstream Charter', Georgia, serif";

type V3 = [number, number, number];
interface Pose { yaw: number; pitch: number; ty: number }
const rad = (d: number) => (d * Math.PI) / 180;

function xf([x, y, z]: V3, { yaw, pitch, ty }: Pose): V3 {
  const cy = Math.cos(rad(yaw)), sy = Math.sin(rad(yaw)), cp = Math.cos(rad(pitch)), sp = Math.sin(rad(pitch));
  const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  return [x1, y * cp - z1 * sp + ty, y * sp + z1 * cp];
}
const proj = (p: V3): [number, number] => { const k = PERSP / (PERSP - p[2]); return [p[0] * k, p[1] * k]; };

/** convex hull (monotone chain) of screen points */
function hull(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: number[], a: number[], b: number[]) => (a[0]! - o[0]!) * (b[1]! - o[1]!) - (a[1]! - o[1]!) * (b[0]! - o[0]!);
  const lo: [number, number][] = [], up: [number, number][] = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2]!, lo[lo.length - 1]!, q) <= 0) lo.pop(); lo.push(q); }
  for (const q of [...p].reverse()) { while (up.length > 1 && cr(up[up.length - 2]!, up[up.length - 1]!, q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/** Screen polygon of the cover and (when it faces the viewer) the spine, in px relative to the book centre. */
function coverPoly(w: number, h: number, d: number, pose: Pose): [number, number][] {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const pts: [number, number][] = [];
  ([[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]] as V3[]).forEach((c) => pts.push(proj(xf(c, pose))));
  // spine faces left; it is visible when its rotated normal points towards the camera
  const n = xf([-1, 0, 0], { ...pose, ty: 0 }), c = xf([-hw, 0, 0], pose);
  if (n[0] * (0 - c[0]) + n[1] * (0 - c[1]) + n[2] * (PERSP - c[2]) > 0) ([[-hw, -hh, -hd], [-hw, hh, -hd]] as V3[]).forEach((q) => pts.push(proj(xf(q, pose))));
  return hull(pts);
}

export interface StageRefs { hero: RefObject<HTMLElement | null>; stage: RefObject<HTMLElement | null>; book: RefObject<HTMLElement | null>; hl: RefObject<HTMLElement | null>; over: RefObject<HTMLElement | null>; ink: RefObject<HTMLElement | null>; floor: RefObject<HTMLElement | null> }

/** Drives the hero book: slow turn, pointer tilt, scroll exit, intro; keeps the headline clip paths in step. One loop, paused off screen. */
export function useBookStage(r: StageRefs, reduced: boolean) {
  useEffect(() => {
    const hero = r.hero.current, stage = r.stage.current, book = r.book.current, hl = r.hl.current, over = r.over.current, ink = r.ink.current, floor = r.floor.current;
    if (!hero || !stage || !book || !hl || !over || !ink) return;
    const coarse = !!window.matchMedia?.('(pointer: coarse)').matches;
    let W = 0, H = 0, D = 0, raf = 0, last = 0, t = 0, inView = true, vis = !document.hidden;
    const ptr = { x: 0, y: 0, cx: 0, cy: 0 };
    const geo = () => {
      const sw = stage.offsetWidth, sh = stage.offsetHeight;
      W = Math.min(sw * 0.86, (sh * 0.9) / 1.5); H = W * 1.5; D = W * 0.17;
      stage.style.setProperty('--bw', W.toFixed(1) + 'px'); stage.style.setProperty('--bh', H.toFixed(1) + 'px'); stage.style.setProperty('--bd', D.toFixed(1) + 'px');
    };
    const paint = () => {
      const hr = hero.getBoundingClientRect();
      const sp = reduced ? 0 : clamp(-hr.top / Math.max(1, hr.height), 0, 1);
      hero.style.setProperty('--p', sp.toFixed(3));
      const intro = reduced ? 1 : 1 - Math.pow(1 - clamp((t - 0.1) / 1.7, 0, 1), 4);
      const swing = reduced ? -17 : -4 + 25 * Math.sin((t * Math.PI * 2) / 22 + 0.55);
      const pose: Pose = {
        yaw: swing + ptr.cx * 9 + sp * 46 - (1 - intro) * 62,
        pitch: -3 - ptr.cy * 5 + sp * 6,
        ty: (reduced ? 0 : Math.sin(t * 0.9) * 5) - sp * 70 + (1 - intro) * 36,
      };
      book.style.transform = `translate3d(0, ${pose.ty.toFixed(2)}px, 0) rotateX(${pose.pitch.toFixed(2)}deg) rotateY(${pose.yaw.toFixed(2)}deg)`;
      book.style.setProperty('--sx', (52 - pose.yaw * 2.2).toFixed(1) + '%');
      book.style.opacity = String(clamp(intro * 3, 0, 1));
      if (floor) floor.style.transform = `translateX(${(-pose.yaw * 1.6).toFixed(1)}px) scaleX(${(1 - Math.abs(pose.yaw) / 160 - sp * 0.3).toFixed(3)})`;
      if (floor) floor.style.opacity = String(clamp(intro * 1.4, 0, 1) * (1 - sp * 0.8));
      // headline clip: project the corners, convert to the headline box's own px
      const sr = stage.getBoundingClientRect(), lr = hl.getBoundingClientRect();
      const k = sr.width / Math.max(1, stage.offsetWidth) || 1;
      const ox = (sr.left + sr.width / 2 - lr.left) / k, oy = (sr.top + sr.height / 2 - lr.top) / k;
      const poly = coverPoly(W, H, D, pose).map(([x, y]) => [x + ox, y + oy] as [number, number]);
      const bw = hl.offsetWidth, bh = hl.offsetHeight;
      const pts = poly.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`);
      over.style.clipPath = `polygon(${poly.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})`;
      ink.style.clipPath = `path(evenodd,'M0 0H${bw}V${bh}H0Z M${pts.join(' L')} Z')`;
    };
    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now; t += dt;
      const e = 1 - Math.exp(-dt * 4.5);
      ptr.cx += (ptr.x - ptr.cx) * e; ptr.cy += (ptr.y - ptr.cy) * e;
      paint();
      if (inView && vis) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && !reduced && inView && vis) { last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const still = () => { geo(); paint(); };
    geo();
    if (reduced) { t = 9; still(); } else { t = 0; paint(); start(); }
    const ro = new ResizeObserver(() => { geo(); if (!raf) paint(); });
    ro.observe(stage); ro.observe(hl);
    const io = new IntersectionObserver((es) => { const e = es[es.length - 1]; inView = e ? e.isIntersecting : true; inView ? start() : stop(); });
    io.observe(hero);
    const onVis = () => { vis = !document.hidden; vis ? start() : stop(); };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || reduced || coarse) return;
      const b = hero.getBoundingClientRect();
      ptr.x = clamp(((e.clientX - b.left) / b.width) * 2 - 1, -1, 1); ptr.y = clamp(((e.clientY - b.top) / b.height) * 2 - 1, -1, 1);
    };
    const onLeave = () => { ptr.x = 0; ptr.y = 0; };
    const onScroll = () => { if (!raf) paint(); };
    document.addEventListener('visibilitychange', onVis);
    hero.addEventListener('pointermove', onMove); hero.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      stop(); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      hero.removeEventListener('pointermove', onMove); hero.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [r, reduced]);
}

/** The cover of the featured book (200 x 300): a ledger page at dusk. The middle is kept calm so the headline can cross it. */
export function HeroCover() {
  return (
    <svg className="hbs-cover" viewBox="0 0 200 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hbs-hc-bg" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stopColor="#1b4165" /><stop offset="1" stopColor="#0c1f33" /></linearGradient>
        <clipPath id="hbs-hc-clip"><rect x="0" y="0" width="200" height="300" /></clipPath>
      </defs>
      <rect width="200" height="300" fill="url(#hbs-hc-bg)" />
      <g clipPath="url(#hbs-hc-clip)" fill="none" stroke="#f1e7d0" strokeWidth=".5">
        {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M0 ${112 + i * 13}H200`} opacity=".14" />)}
        <path d="M58 104V232M150 104V232" opacity=".14" />
        {[34, 58, 84, 112, 142].map((r, i) => <circle key={r} cx="100" cy="246" r={r} opacity={0.22 - i * 0.03} />)}
      </g>
      <circle cx="100" cy="246" r="26" fill="#e8743b" />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M0 ${236 + i * 13} q25 -7 50 0 t50 0 t50 0 t50 0 V300 H0z`} fill="#0c1f33" opacity={0.3 + i * 0.17} />)}
      <rect x="11" y="11" width="178" height="278" fill="none" stroke="#f1e7d0" strokeWidth=".6" opacity=".4" />
      <g fill="#f1e7d0" fontFamily={SERIF}>
        <text x="22" y="34" fontSize="7.4" letterSpacing="2.6" fontFamily="system-ui, sans-serif" opacity=".85">A NOVEL</text>
        <text x="22" y="64" fontSize="31" fontWeight="700" letterSpacing="-.6">The Salt</text>
        <text x="22" y="92" fontSize="31" fontStyle="italic" letterSpacing="-.6">Ledger</text>
        <text x="100" y="285" textAnchor="middle" fontSize="7.6" letterSpacing="2.8" fontFamily="system-ui, sans-serif">INES VALCOURT</text>
      </g>
      <rect x="0" y="0" width="7" height="300" fill="#000" opacity=".18" /><rect x="7" y="0" width="1.4" height="300" fill="#fff" opacity=".22" />
    </svg>
  );
}

export interface Book3DProps { b: Book; cover: ReactNode; spine?: { bg: string; fg: string }; className?: string; style?: CSSProperties; bookRef?: RefObject<HTMLDivElement | null> }
/** A cuboid book: six faces in preserve-3d. Size comes from --bw / --bh / --bd on an ancestor (set by useBookStage, or in CSS for the small ones). */
export function Book3D({ b, cover, spine = { bg: '#14304a', fg: '#f1e7d0' }, className, style, bookRef }: Book3DProps) {
  return (
    <div ref={bookRef} className={`hbs-b3 ${className ?? ''}`} style={{ '--spine-bg': spine.bg, '--spine-fg': spine.fg, ...style } as CSSProperties}>
      <div className="hbs-b3f hbs-b3-back" />
      <div className="hbs-b3f hbs-b3-pages" />
      <div className="hbs-b3f hbs-b3-top" />
      <div className="hbs-b3f hbs-b3-bot" />
      <div className="hbs-b3f hbs-b3-spine"><span>{b.title}</span><i /></div>
      <div className="hbs-b3f hbs-b3-front">{cover}<span className="hbs-b3-sheen" /></div>
    </div>
  );
}
