'use client';
import type { CSSProperties, ReactNode } from 'react';
import { watchLive, watchPalette, useCoarsePointer, useReducedMotion, rgba, mix, type Palette, type RGB } from './_t2';

/* Shared engine for the pointer-following effects: one pointer "field" per component. It tracks the pointer inside the host element (or the
   whole window when `global` is set), drives a single rAF loop that sleeps when nothing moves, pauses off-screen and in hidden tabs, and runs
   a gentle autopilot path when there is no pointer (touch screens, or `idle="always"`), so every effect has a touch equivalent. */

export { useCoarsePointer, useReducedMotion, rgba, mix };
export type { Palette, RGB };

/** When the effect plays by itself: `touch` = only on touch screens (default), `always` = whenever no pointer is over it, `never`. */
export type IdleMode = 'touch' | 'always' | 'never';

/** Props every pointer effect shares. */
export interface CursorFxProps {
  /** Content the effect sits on (or over). */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Track the pointer over the whole page instead of only this element. Off by default; the effect then covers the viewport. */
  global?: boolean;
  /** When the effect animates on its own without a pointer. */
  idle?: IdleMode;
}

export interface Field {
  /** Pointer (or autopilot) position in px relative to the effect layer. */
  x: number; y: number;
  /** Position at the previous frame. */
  lx: number; ly: number;
  /** Smoothed velocity in px per second. */
  vx: number; vy: number;
  /** A position exists (pointer has been seen or autopilot has started). */
  seen: boolean;
  /** A mouse or pen is over the host (or touch was used moments ago). */
  inside: boolean;
  /** The autopilot is steering x/y. */
  auto: boolean;
  /** A button/finger is down. */
  down: boolean;
  w: number; h: number; dpr: number;
  /** Seconds (clock) and last frame length in seconds. */
  t: number; dt: number;
  pal: Palette;
  reduced: boolean; coarse: boolean;
}

export interface FieldHandlers {
  /** Called every frame. Return true to ask for another frame even when nothing moves. */
  frame(f: Field): boolean | void;
  down?(f: Field, x: number, y: number, e: PointerEvent): void;
  /** Real pointer moved (not called for the autopilot). */
  move?(f: Field, e: PointerEvent): void;
  leave?(f: Field): void;
  resize?(f: Field): void;
  palette?(f: Field): void;
}

export interface FieldConfig { global: boolean; idle: IdleMode; reduced: boolean; coarse: boolean; continuous?: boolean }
export interface FieldApi { f: Field; wake(): void; dispose(): void }

const TOUCH_HOLD = 2600;
const FALLBACK_PAL: Palette = { primary: [37, 99, 235], signal: [245, 158, 11], ink: [24, 24, 27], surface: [250, 250, 250], raised: [255, 255, 255], muted: [113, 113, 122] };

/** A slow wandering path used by the autopilot: smooth, never leaves the box, deterministic in time. */
export function autopilotPath(t: number, w: number, h: number): { x: number; y: number } {
  return {
    x: w * (0.5 + 0.33 * Math.sin(t * 0.62) + 0.08 * Math.sin(t * 1.9 + 1)),
    y: h * (0.5 + 0.28 * Math.sin(t * 0.47 + 1.2) + 0.07 * Math.cos(t * 1.6)),
  };
}

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sizes a canvas to its CSS box at a capped DPR and returns a 2D context whose units are CSS px. */
export function fitCanvas(c: HTMLCanvasElement, f: Field): CanvasRenderingContext2D | null {
  const W = Math.max(1, Math.round(f.w * f.dpr)), H = Math.max(1, Math.round(f.h * f.dpr));
  if (c.width !== W) c.width = W;
  if (c.height !== H) c.height = H;
  const ctx = c.getContext('2d');
  ctx?.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  return ctx;
}

export function createField(host: HTMLElement, layer: HTMLElement, cfg: FieldConfig, h: FieldHandlers): FieldApi {
  const f: Field = {
    x: 0, y: 0, lx: 0, ly: 0, vx: 0, vy: 0, seen: false, inside: false, auto: false, down: false,
    w: 1, h: 1, dpr: 1, t: 0, dt: 0.016, pal: FALLBACK_PAL, reduced: cfg.reduced, coarse: cfg.coarse,
  };
  const autoOn = !cfg.reduced && (cfg.idle === 'always' || (cfg.idle === 'touch' && cfg.coarse));
  let raf = 0, live = true, last = 0, activeUntil = 0, dead = false, timer = 0;

  const measure = () => {
    const r = layer.getBoundingClientRect();
    f.w = Math.max(1, r.width); f.h = Math.max(1, r.height);
    f.dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!f.seen) { f.x = f.lx = f.w / 2; f.y = f.ly = f.h / 2; }
    h.resize?.(f);
  };
  const tick = (now: number) => {
    raf = 0;
    if (dead || !live) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now; f.t = now / 1000; f.dt = dt;
    f.auto = autoOn && now > activeUntil;
    if (f.auto) {
      const p = autopilotPath(f.t, f.w, f.h);
      if (!f.seen) { f.x = f.lx = p.x; f.y = f.ly = p.y; f.seen = true; }
      const k = 1 - Math.exp(-dt * 3);
      f.x += (p.x - f.x) * k; f.y += (p.y - f.y) * k;
    }
    const kv = 1 - Math.exp(-dt * 14);
    f.vx += ((f.x - f.lx) / dt - f.vx) * kv; f.vy += ((f.y - f.ly) / dt - f.vy) * kv;
    const more = h.frame(f);
    f.lx = f.x; f.ly = f.y;
    if (cfg.continuous || f.auto || more) raf = requestAnimationFrame(tick);
    else { last = 0; f.vx = f.vy = 0; }
  };
  const wake = () => { if (!raf && live && !dead) raf = requestAnimationFrame(tick); };
  const hold = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') { activeUntil = Infinity; return; }
    activeUntil = performance.now() + TOUCH_HOLD;
    if (autoOn) { clearTimeout(timer); timer = window.setTimeout(wake, TOUCH_HOLD + 60); }
  };
  const local = (e: PointerEvent) => { const r = layer.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  const onMove = (e: PointerEvent) => {
    const [x, y] = local(e);
    f.x = x; f.y = y;
    if (!f.seen) { f.lx = x; f.ly = y; f.seen = true; }
    f.inside = true; hold(e); h.move?.(f, e); wake();
  };
  const onDown = (e: PointerEvent) => {
    const [x, y] = local(e);
    f.x = x; f.y = y;
    if (!f.seen) { f.lx = x; f.ly = y; f.seen = true; }
    f.inside = true; f.down = true; hold(e); h.down?.(f, x, y, e); wake();
  };
  const onUp = (e: PointerEvent) => {
    f.down = false; hold(e);
    if (e.pointerType === 'touch') { f.inside = false; h.leave?.(f); }
    wake();
  };
  const onLeave = (e: PointerEvent) => {
    f.down = false; f.inside = false;
    if (e.pointerType === 'touch') hold(e); else activeUntil = 0;
    h.leave?.(f); wake();
  };

  const evt: EventTarget = cfg.global ? window : host;
  const leaveTarget: EventTarget = cfg.global ? document.documentElement : host;
  evt.addEventListener('pointermove', onMove as EventListener, { passive: true });
  evt.addEventListener('pointerdown', onDown as EventListener, { passive: true });
  evt.addEventListener('pointerup', onUp as EventListener, { passive: true });
  evt.addEventListener('pointercancel', onUp as EventListener, { passive: true });
  leaveTarget.addEventListener('pointerleave', onLeave as EventListener, { passive: true });

  const ro = new ResizeObserver(() => { measure(); wake(); });
  ro.observe(layer);
  measure();
  const offLive = watchLive(layer, (v) => { live = v; if (v) wake(); else { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; } });
  const offPal = watchPalette(host, (p) => { f.pal = p; h.palette?.(f); wake(); });
  wake();

  return {
    f, wake,
    dispose() {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(timer);
      evt.removeEventListener('pointermove', onMove as EventListener);
      evt.removeEventListener('pointerdown', onDown as EventListener);
      evt.removeEventListener('pointerup', onUp as EventListener);
      evt.removeEventListener('pointercancel', onUp as EventListener);
      leaveTarget.removeEventListener('pointerleave', onLeave as EventListener);
      ro.disconnect(); offLive(); offPal();
    },
  };
}

/** Eases `cur` toward `to` with a frame-rate independent factor (rate per second). */
export const ease = (cur: number, to: number, rate: number, dt: number) => cur + (to - cur) * (1 - Math.exp(-rate * dt));

/** Reports the element that has keyboard focus (and passes `match`), or null when focus leaves. Keyboard users get the effect too. */
export function watchFocus(root: HTMLElement | Document, match: (el: HTMLElement) => boolean, cb: (el: HTMLElement | null) => void): () => void {
  const on = (e: Event) => {
    const el = e.target as HTMLElement | null;
    let ok = false;
    try { ok = !!el && el.matches(':focus-visible') && match(el); } catch { ok = !!el && match(el); }
    if (el && ok) cb(el);
  };
  const off = () => cb(null);
  root.addEventListener('focusin', on); root.addEventListener('focusout', off);
  return () => { root.removeEventListener('focusin', on); root.removeEventListener('focusout', off); };
}

/** Centre and size of an element in the layer's coordinate space. */
export function boxIn(layer: HTMLElement, el: Element) {
  const l = layer.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: r.left - l.left, y: r.top - l.top, w: r.width, h: r.height, cx: r.left - l.left + r.width / 2, cy: r.top - l.top + r.height / 2 };
}
