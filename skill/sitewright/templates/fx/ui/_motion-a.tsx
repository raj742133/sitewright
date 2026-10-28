'use client';
import { useEffect, useState, type RefObject } from 'react';
import { mix, type Palette, type RGB } from './_t2';

/* Shared helpers for the motion-a batch: procedural artwork (SVG markup that works in the DOM and as a canvas source),
   an in-view hook and a source loader. No network, no binary assets. */

export type ArtVariant = 'dunes' | 'city' | 'orbit' | 'bloom' | 'peaks' | 'tide';
export const ART_VARIANTS: ArtVariant[] = ['dunes', 'city', 'orbit', 'bloom', 'peaks', 'tide'];
export const ART_LABELS: Record<ArtVariant, string> = {
  dunes: 'Sun setting over layered dunes', city: 'A city skyline at dusk', orbit: 'A ringed planet in space',
  bloom: 'Overlapping translucent circles', peaks: 'Mountain peaks with snow caps', tide: 'Waves under a rising sun',
};

/** An image source: a URL, or one of the built-in drawn scenes. */
export interface Source { src?: string; variant?: ArtVariant; alt?: string; label?: string }
export const sourceAlt = (s: Source) => s.alt ?? (s.src ? '' : ART_LABELS[s.variant ?? 'dunes']);

export interface ArtColors { sky1: string; sky2: string; sun: string; far: string; mid: string; near: string; accent: string; ink: string }
const SPEC: Record<keyof ArtColors, [string, string, number]> = {
  sky1: ['P', 'D', 0.4], sky2: ['P', 'S', 0.6], sun: ['S', 'W', 0.4], far: ['P', 'D', 0.55],
  mid: ['P', 'D', 0.72], near: ['P', 'D', 0.86], accent: ['S', 'S', 0], ink: ['D', 'D', 0],
};
const KEYS = Object.keys(SPEC) as (keyof ArtColors)[];
const CSS_REF: Record<string, string> = { P: 'var(--primary, #2563eb)', S: 'var(--signal, #f59e0b)', D: '#0b1020', W: '#ffffff' };
const HEX: Record<string, RGB> = { D: [11, 16, 32], W: [255, 255, 255] };

/** Scene colours as CSS (follows the live theme tokens). */
export const cssArt: ArtColors = Object.fromEntries(KEYS.map((k) => {
  const [a, b, t] = SPEC[k];
  return [k, t === 0 ? CSS_REF[a] : `color-mix(in srgb, ${CSS_REF[a]} ${Math.round((1 - t) * 100)}%, ${CSS_REF[b]})`];
})) as unknown as ArtColors;

/** Scene colours resolved to rgb() from a palette (for canvas sources). */
export function rgbArt(p: Palette): ArtColors {
  const ref = (n: string): RGB => (n === 'P' ? p.primary : n === 'S' ? p.signal : HEX[n] ?? [0, 0, 0]);
  return Object.fromEntries(KEYS.map((k) => {
    const [a, b, t] = SPEC[k];
    const c = mix(ref(a), ref(b), t);
    return [k, `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`];
  })) as unknown as ArtColors;
}

const rn = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const f = (n: number) => n.toFixed(1);

/** Inner SVG markup (viewBox 0 0 160 100) for a drawn scene. */
export function artMarkup(v: ArtVariant, c: ArtColors): string {
  const id = 'ma-' + v;
  const grad = (a: string, b: string) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${a}"/><stop offset="1" style="stop-color:${b}"/></linearGradient></defs><rect width="160" height="100" fill="url(#${id})"/>`;
  const fill = (col: string, extra = '') => `style="fill:${col};${extra}"`;
  if (v === 'dunes') {
    return grad(c.sky1, c.sky2) + `<circle cx="112" cy="46" r="15" ${fill(c.sun)}/><path d="M0 66 Q30 50 62 62 T124 58 T160 64 V100 H0Z" ${fill(c.far)}/><path d="M0 78 Q40 60 84 76 T160 72 V100 H0Z" ${fill(c.mid)}/><path d="M0 90 Q50 76 100 88 T160 84 V100 H0Z" ${fill(c.near)}/>`;
  }
  if (v === 'city') {
    let s = grad(c.sky1, c.sky2) + `<circle cx="124" cy="26" r="9" ${fill(c.sun)}/>`;
    for (let i = 0; i < 10; i++) {
      const w = 13 + Math.floor(rn(i) * 7), h = 26 + rn(i + 40) * 40, x = i * 16.5 - 3, y = 100 - h;
      s += `<rect x="${f(x)}" y="${f(y)}" width="${w}" height="${f(h)}" ${fill(i % 2 ? c.far : c.mid)}/>`;
      for (let j = 0; j < 14; j++) {
        const wx = x + 2 + (j % 3) * 4, wy = y + 3 + Math.floor(j / 3) * 6;
        if (wy < 96 && rn(i * 17 + j) > 0.5) s += `<rect x="${f(wx)}" y="${f(wy)}" width="2" height="3" ${fill(c.sun)} opacity="0.85"/>`;
      }
    }
    return s + `<rect y="94" width="160" height="6" ${fill(c.near)}/>`;
  }
  if (v === 'orbit') {
    let s = grad(c.near, c.sky1);
    for (let i = 0; i < 34; i++) s += `<circle cx="${f(rn(i) * 160)}" cy="${f(rn(i + 90) * 100)}" r="${f(0.4 + rn(i + 7) * 0.8)}" fill="#fff" opacity="${f(0.3 + rn(i + 3) * 0.6)}"/>`;
    s += `<defs><radialGradient id="${id}-p" cx="0.35" cy="0.3" r="0.8"><stop offset="0" style="stop-color:${c.sun}"/><stop offset="0.55" style="stop-color:${c.accent}"/><stop offset="1" style="stop-color:${c.mid}"/></radialGradient></defs>`;
    s += `<g transform="rotate(-18 80 52)"><path d="M34 52 A46 11 0 0 1 126 52" fill="none" style="stroke:${c.sun}" stroke-width="3" opacity="0.7"/>`;
    s += `<circle cx="80" cy="52" r="23" fill="url(#${id}-p)"/><path d="M34 52 A46 11 0 0 0 126 52" fill="none" style="stroke:${c.sun}" stroke-width="3"/></g>`;
    return s + `<circle cx="132" cy="22" r="4" ${fill(c.far)}/>`;
  }
  if (v === 'bloom') {
    const b = 'mix-blend-mode:screen';
    return grad(c.near, c.mid) + `<circle cx="62" cy="52" r="32" ${fill(c.accent, b)} opacity="0.8"/><circle cx="98" cy="46" r="30" ${fill(c.sky2, b)} opacity="0.85"/><circle cx="82" cy="68" r="28" ${fill(c.sun, b)} opacity="0.6"/><circle cx="82" cy="54" r="40" fill="none" stroke="#fff" stroke-width="0.6" opacity="0.35"/>`;
  }
  if (v === 'peaks') {
    return grad(c.sky1, c.sky2) + `<circle cx="38" cy="32" r="11" ${fill(c.sun)}/><path d="M0 72 L28 46 L50 64 L84 28 L116 64 L138 48 L160 68 V100 H0Z" ${fill(c.far)}/><path d="M84 28 L73 42 L80 40 L84 46 L90 40 L96 44Z" fill="#fff" opacity="0.85"/><path d="M0 86 L34 62 L66 82 L102 58 L160 88 V100 H0Z" ${fill(c.mid)}/><path d="M0 100 V93 Q40 84 80 95 T160 91 V100Z" ${fill(c.near)}/>`;
  }
  const w = (y: number, col: string, d: number) => `<path d="M0 ${y} Q${20 + d} ${y - 7} ${40 + d} ${y} T${80 + d} ${y} T${120 + d} ${y} T${160 + d} ${y} V100 H0Z" ${fill(col)}/>`;
  return grad(c.sky1, c.sky2) + `<circle cx="80" cy="60" r="22" ${fill(c.sun)}/>` + w(62, c.far, 0) + w(74, c.mid, -12) + w(87, c.near, -4);
}

/** A drawn scene as an SVG element (decorative; pair with your own alt text on a wrapper if it carries meaning). */
export function Art({ variant = 'dunes', className, style }: { variant?: ArtVariant; className?: string; style?: React.CSSProperties }) {
  return <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" className={className} style={style} dangerouslySetInnerHTML={{ __html: artMarkup(variant, cssArt) }} />;
}

const loadImg = (url: string, cors: boolean) => new Promise<HTMLImageElement>((res, rej) => {
  const im = new Image();
  if (cors) im.crossOrigin = 'anonymous';
  im.onload = () => res(im);
  im.onerror = () => rej(new Error('image'));
  im.src = url;
});

/** Renders a source to a w x h (device pixel) canvas, cover-fitted. Never rejects: a failed load gives a flat panel. */
export async function renderSource(s: Source, w: number, h: number, pal: Palette): Promise<HTMLCanvasElement> {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w)); cv.height = Math.max(1, Math.round(h));
  const g = cv.getContext('2d');
  if (!g) return cv;
  g.fillStyle = `rgb(${pal.surface.join(',')})`;
  g.fillRect(0, 0, cv.width, cv.height);
  try {
    if (s.src) {
      const im = await loadImg(s.src, true);
      const k = Math.max(cv.width / im.naturalWidth, cv.height / im.naturalHeight);
      const dw = im.naturalWidth * k, dh = im.naturalHeight * k;
      g.drawImage(im, (cv.width - dw) / 2, (cv.height - dh) / 2, dw, dh);
    } else {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" width="${cv.width}" height="${cv.height}" preserveAspectRatio="xMidYMid slice">${artMarkup(s.variant ?? 'dunes', rgbArt(pal))}</svg>`;
      const im = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), false);
      g.drawImage(im, 0, 0, cv.width, cv.height);
    }
  } catch { /* keep the flat panel */ }
  return cv;
}

/** True once the element has been on screen (once) or while it is on screen (once = false). */
export function useInView(ref: RefObject<Element | null>, o: { threshold?: number; once?: boolean; rootMargin?: string } = {}): boolean {
  const { threshold = 0.2, once = true, rootMargin = '0px' } = o;
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setOn(true); return; }
    const io = new IntersectionObserver((es) => {
      const e = es[es.length - 1];
      if (!e) return;
      if (e.isIntersecting) { setOn(true); if (once) io.disconnect(); } else if (!once) setOn(false);
    }, { threshold, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, once, rootMargin]);
  return on;
}

/** The nearest scrollable ancestor, or null for the window. */
export function scrollParent(el: Element | null): HTMLElement | null {
  for (let p = el?.parentElement ?? null; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const cx = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(' ');
