'use client';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { getGlassEngine, type GlassInstance, type GlassParams } from './_tg-engine';

/* Shared React plumbing for the glass components (Tactile Glass, MIT, see LICENSE-tactile-glass.txt): one hook that registers an element with
   the shared engine and tracks the pointer, the optics props every component takes, and a tilt helper for cards. */

/** Every optical setting, with the ranges and names upstream uses. All optional: each component has its own defaults. */
export interface GlassOptics {
  /** 0..100 how strongly the edge bends what is behind it */ refraction: number;
  /** 0..100 */ thickness: number;
  /** 0..30 px width of the bevel */ bevelWidth: number;
  /** 0..100 blur of what is behind */ frost: number;
  /** 0..100 colour fringing on the bevel */ dispersion: number;
  /** 0..100 specular gleam */ sheen: number;
  /** -180..180 degrees */ lightAngle: number;
  /** 0..100 smoked-glass absorption */ darkness: number;
  /** 0..100 outer rim light */ rim: number;
  /** 0..300 brightness of the liquid light */ fluidBrightness: number;
  /** 0..300 */ fluidSpeed: number;
  /** 0..100 */ fluidScale: number;
  /** 0..96 px reach of the rim aura */ fluidAuraWidth: number;
  /** 0..100 how much liquid light reaches the middle */ fluidCenter: number;
  /** 0..100 comet that travels round the rim */ auroraFlow: number;
  /** 0..300 */ hoverBrightness: number;
  /** 0..100 */ lightTrackingStrength: number;
  /** 0..100 */ shockwaveStrength: number;
  /** 0..100 opacity of a tinted glass body (helps on light pages) */ body: number;
  /** the light follows the pointer (default true) */ trackCursorLight: boolean;
  /** a click sends a ripple (default true) */ clickShockwave: boolean;
}
export type GlassOpticsProps = Partial<GlassOptics>;
export type GlassDefaults = Omit<GlassParams, 'radius'>;

export function toParams(d: GlassDefaults, o: GlassOpticsProps = {}): GlassParams {
  return {
    refraction: o.refraction ?? d.refraction,
    thickness: o.thickness ?? d.thickness,
    bevelWidth: o.bevelWidth ?? d.bevelWidth,
    frost: o.frost ?? d.frost,
    dispersion: o.dispersion ?? d.dispersion,
    sheen: o.sheen ?? d.sheen,
    lightAngle: o.lightAngle ?? d.lightAngle ?? d.angle ?? 24,
    darkness: o.darkness ?? d.darkness,
    rim: o.rim ?? d.rim,
    fluidBright: o.fluidBrightness ?? d.fluidBright,
    fluidSpeed: o.fluidSpeed ?? d.fluidSpeed,
    fluidScale: o.fluidScale ?? d.fluidScale,
    fluidAuraWidth: o.fluidAuraWidth ?? d.fluidAuraWidth,
    fluidCenter: o.fluidCenter ?? d.fluidCenter,
    auroraFlow: o.auroraFlow ?? d.auroraFlow,
    hoverBright: o.hoverBrightness ?? d.hoverBright,
    lightTrack: o.trackCursorLight === false ? 0 : (o.lightTrackingStrength ?? d.lightTrack),
    clickWave: o.clickShockwave === false ? 0 : (o.shockwaveStrength ?? d.clickWave),
    body: o.body ?? d.body ?? 0,
  };
}

export function useMedia(query: string): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const f = () => setM(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [query]);
  return m;
}
export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');

export interface UseGlassOptions {
  defaults: GlassDefaults;
  optics?: GlassOpticsProps;
  /** corner radius: 'pill' = half the height, 'css' = the element's own border-radius (default), or a number in CSS px */
  radius?: 'pill' | 'css' | number;
  /** canvas size in CSS px when it is not the element's size (the glass word pads it) */
  measure?: (root: HTMLElement) => [number, number];
  /** runs once per registration: set getRect / getSwitchThumb / isAudioDeck / textMask / tilt. May return a cleanup. */
  setup?: (inst: GlassInstance, root: HTMLElement, resize: () => void) => void | (() => void);
  /** register again when these change */
  deps?: readonly unknown[];
  /** called after the canvas was resized */
  onResize?: (root: HTMLElement, canvas: HTMLCanvasElement) => void;
}

/**
 * Registers `rootRef`'s element with the shared engine and draws into `canvasRef`. `gl` is true while WebGL is working; when it is false
 * (no WebGL2, context lost) the component keeps its CSS look and the canvas stays empty.
 */
export function useGlass<T extends HTMLElement>(o: UseGlassOptions): { rootRef: RefObject<T | null>; canvasRef: RefObject<HTMLCanvasElement | null>; instRef: RefObject<GlassInstance | null>; gl: boolean; dataGlass: 'gl' | 'css' } {
  const id = useId();
  const rootRef = useRef<T | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instRef = useRef<GlassInstance | null>(null);
  const [gl, setGl] = useState(false);
  const paramsRef = useRef<GlassParams>(toParams(o.defaults, o.optics));
  const optionsRef = useRef(o);
  optionsRef.current = o;

  // optics may change on any render: keep the params object (the engine holds it) and just copy the new values in
  const sig = JSON.stringify(o.optics ?? {});
  useEffect(() => {
    const next = toParams(optionsRef.current.defaults, optionsRef.current.optics);
    Object.assign(paramsRef.current, next);
    getGlassEngine().invalidate();
  }, [sig]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) { setGl(false); return; }
    const engine = getGlassEngine();
    const opt = optionsRef.current;
    let radiusPx = 0; // css radius in device px, cached on resize
    const dprNow = () => Math.min(window.devicePixelRatio || 1, 2);

    const inst: GlassInstance = {
      id, canvas, ctx,
      getParams: () => {
        const p = paramsRef.current;
        const r = optionsRef.current.radius ?? 'css';
        const maxRad = Math.min(canvas.width, canvas.height) * 0.5;
        p.radius = r === 'pill' ? canvas.height * 0.5 : Math.min(typeof r === 'number' ? r * dprNow() : radiusPx, maxRad);
        return p;
      },
      curHover: 0, targetHover: 0, curMouseX: 0, curMouseY: 0, targetMouseX: 0, targetMouseY: 0,
      clickPos: [-999, -999], clickTime: -999, visible: true,
      onStatus: (ok) => setGl(ok),
    };
    instRef.current = inst;

    const resize = () => {
      const dpr = dprNow();
      const [cw, ch] = (optionsRef.current.measure ?? ((el: HTMLElement) => [el.offsetWidth, el.offsetHeight] as [number, number]))(root);
      const w = Math.round(cw * dpr);
      const h = Math.round(ch * dpr);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
      }
      const br = parseFloat(getComputedStyle(root).borderRadius);
      radiusPx = (Number.isFinite(br) ? br : 16) * dpr;
      optionsRef.current.onResize?.(root, canvas);
      engine.invalidate();
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(root);

    const coord = (e: { clientX: number; clientY: number }) => {
      const r = root.getBoundingClientRect();
      const dpr = dprNow();
      inst.targetMouseX = (e.clientX - (r.left + r.width * 0.5)) * dpr;
      inst.targetMouseY = (r.top + r.height * 0.5 - e.clientY) * dpr;
    };
    const onEnter = (e: PointerEvent) => { inst.targetHover = 1; coord(e); };
    const onLeave = () => { inst.targetHover = 0; };
    const onDown = (e: PointerEvent) => {
      coord(e);
      inst.clickPos = [inst.targetMouseX, inst.targetMouseY];
      inst.clickTime = engine.getTime();
    };
    const onUp = (e: PointerEvent) => { if (e.pointerType === 'touch') onLeave(); };
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointermove', onEnter);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointercancel', onLeave);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointerdown', onDown);

    const cleanup = opt.setup?.(inst, root, resize);
    engine.register(inst);

    return () => {
      if (typeof cleanup === 'function') cleanup();
      engine.unregister(id);
      instRef.current = null;
      ro?.disconnect();
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointermove', onEnter);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('pointercancel', onLeave);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointerdown', onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ...(o.deps ?? [])]);

  return { rootRef, canvasRef, instRef, gl, dataGlass: gl ? 'gl' : 'css' };
}

export interface TiltOptions {
  max: number;
  /** x/y multipliers on the tilt and the hover scale */
  kx?: number; ky?: number; scale?: number;
  /** easing per frame while hovered / settling */
  easeIn?: number; easeOut?: number;
  /** pointer targets that should not tilt the card (matched with closest) */
  calm?: string;
}

/** Perspective tilt toward the pointer, applied to the element and passed to the engine so the glass refracts the tilted surface. */
export function attachTilt(el: HTMLElement, inst: GlassInstance, o: TiltOptions): () => void {
  const { max, kx = 1, ky = 1, scale = 1.03, easeIn = 0.12, easeOut = 0.08, calm } = o;
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf: number | null = null;
  let tx = 0, ty = 0, ts = 1, cx = 0, cy = 0, cs = 1, hovered = false;
  const step = () => {
    const ease = hovered ? easeIn : easeOut;
    cx += (tx - cx) * ease; cy += (ty - cy) * ease; cs += (ts - cs) * ease;
    inst.tilt = { rotX: cx, rotY: cy, scale: cs, focalLength: 1000 };
    el.style.transform = `perspective(var(--tg-perspective, 1000px)) rotateX(${cx.toFixed(2)}deg) rotateY(${cy.toFixed(2)}deg) scale3d(${cs.toFixed(3)}, ${cs.toFixed(3)}, ${cs.toFixed(3)})`;
    const moving = Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01 || Math.abs(ts - cs) > 0.001;
    if (hovered || moving) raf = requestAnimationFrame(step);
    else { raf = null; inst.tilt = null; el.style.transform = ''; }
  };
  const kick = () => { if (raf === null) raf = requestAnimationFrame(step); };
  const aim = (e: PointerEvent) => {
    if (still()) return;
    const r = el.getBoundingClientRect();
    if (calm && e.target instanceof Element && e.target.closest(calm)) { tx = 0; ty = 0; ts = 1; kick(); return; }
    const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width * 0.5)) / (r.width * 0.5)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.5)) / (r.height * 0.5)));
    tx = -ny * max * ky; ty = nx * max * kx; ts = scale; hovered = true; kick();
  };
  const leave = () => { hovered = false; tx = 0; ty = 0; ts = 1; if (raf !== null || cx || cy || cs !== 1) kick(); };
  const up = (e: PointerEvent) => { if (e.pointerType === 'touch') leave(); };
  el.addEventListener('pointerenter', aim);
  el.addEventListener('pointermove', aim);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('pointercancel', leave);
  el.addEventListener('pointerup', up);
  return () => {
    if (raf !== null) cancelAnimationFrame(raf);
    el.removeEventListener('pointerenter', aim);
    el.removeEventListener('pointermove', aim);
    el.removeEventListener('pointerleave', leave);
    el.removeEventListener('pointercancel', leave);
    el.removeEventListener('pointerup', up);
    inst.tilt = null;
    el.style.transform = '';
  };
}
