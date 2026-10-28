'use client';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';

/* Shared parts of the "heroes a" landing pages: scroll-linked variables, a canvas loop that is cheap and clean, a dialog, a validated
   subscribe form, smooth in-page links and a seeded random. Plain React, no dependencies. */

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** small deterministic random (mulberry32): identical on server and client */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function useReduced(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setR(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return r;
}

/**
 * Scroll-linked progress. Elements with data-sl get a --p variable (0..1):
 * data-sl="pass" runs while the element crosses the viewport, data-sl="exit" while it scrolls out of the top.
 * The CSS decides what --p does; without scrolling (or with reduced motion) the CSS default applies.
 */
export function useScrollLinked(root: RefObject<HTMLElement | null>, reduced: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;
    const run = () => {
      raf = 0;
      const vh = window.innerHeight || 800;
      el.querySelectorAll<HTMLElement>('[data-sl]').forEach((n) => {
        const r = n.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) return;
        const p = n.dataset.sl === 'exit' ? clamp(-r.top / Math.max(1, r.height), 0, 1) : clamp((vh - r.top) / (vh + r.height), 0, 1);
        n.style.setProperty('--p', p.toFixed(3));
      });
    };
    const tick = () => { if (!raf) raf = requestAnimationFrame(run); };
    if (reduced) { el.querySelectorAll<HTMLElement>('[data-sl]').forEach((n) => n.style.removeProperty('--p')); return; }
    tick();
    window.addEventListener('scroll', tick, { passive: true, capture: true });
    window.addEventListener('resize', tick);
    return () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener('scroll', tick, { capture: true }); window.removeEventListener('resize', tick); };
  }, [root, reduced]);
}

/** In-page link: scrolls (smoothly unless reduced motion) to the id and moves focus there, so keyboard users land in the section. */
export function jump(id: string, reduced: boolean) {
  return (e: { preventDefault(): void }) => {
    e.preventDefault();
    const t = document.getElementById(id);
    if (!t) return;
    t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  };
}

export interface Pal { [k: string]: string }
/** reads custom properties (as written, so use hex or rgb in them) from an element */
export function readVars(el: Element, names: string[]): Pal {
  const cs = getComputedStyle(el);
  const o: Pal = {};
  names.forEach((n) => { o[n] = cs.getPropertyValue('--' + n).trim(); });
  return o;
}

/** calls cb when the page theme (html data-theme / class / system scheme) changes */
export function onTheme(cb: () => void): () => void {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  mq?.addEventListener('change', cb);
  return () => { mo.disconnect(); mq?.removeEventListener('change', cb); };
}

/** A ref holding the named custom properties of `el`, refreshed on mount and whenever the theme changes; `rev` counts the refreshes. */
export function useThemeVars(el: RefObject<HTMLElement | null>, names: string[]): [RefObject<Pal>, number] {
  const pal = useRef<Pal>({});
  const [rev, setRev] = useState(0);
  const key = names.join(',');
  useEffect(() => {
    const read = () => { if (el.current) { pal.current = readVars(el.current, key.split(',')); setRev((n) => n + 1); } };
    read();
    return onTheme(() => requestAnimationFrame(read));
  }, [el, key]);
  return [pal, rev];
}

export interface LoopApi { w: number; h: number; dpr: number }
/**
 * One rAF loop for a canvas: DPR capped at 2, sized by ResizeObserver, paused off screen and in hidden tabs, one static frame under
 * reduced motion (and again after resize / theme change), full cleanup on unmount.
 * `draw(ctx, api, t, dt)` gets seconds. Pass `bump` (a number that changes with the theme) to redraw the still frame.
 */
export function useCanvasLoop(
  ref: RefObject<HTMLCanvasElement | null>,
  reduced: boolean,
  draw: (ctx: CanvasRenderingContext2D, api: LoopApi, t: number, dt: number) => void,
  bump = 0,
  active = true,
) {
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const api: LoopApi = { w: 0, h: 0, dpr: 1 };
    let raf = 0, last = 0, t = 0, inView = true, vis = !document.hidden;
    const fit = () => {
      const r = cv.getBoundingClientRect();
      api.dpr = Math.min(2, window.devicePixelRatio || 1);
      api.w = Math.max(1, Math.round(r.width));
      api.h = Math.max(1, Math.round(r.height));
      cv.width = Math.round(api.w * api.dpr);
      cv.height = Math.round(api.h * api.dpr);
    };
    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now; t += dt;
      ctx.setTransform(api.dpr, 0, 0, api.dpr, 0, 0);
      drawRef.current(ctx, api, t, dt);
      if (!reduced && active && inView && vis) raf = requestAnimationFrame(frame);
    };
    const still = () => { ctx.setTransform(api.dpr, 0, 0, api.dpr, 0, 0); drawRef.current(ctx, api, 4.2, 0); };
    const start = () => {
      if (raf) return;
      if (reduced || !active) { if (!api.w) fit(); still(); return; }
      if (inView && vis) { last = 0; raf = requestAnimationFrame(frame); }
    };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    fit();
    const ro = new ResizeObserver(() => { fit(); if (!raf) still(); });
    ro.observe(cv);
    const io = new IntersectionObserver((es) => { const e = es[es.length - 1]; inView = e ? e.isIntersecting : true; inView && vis ? start() : stop(); });
    io.observe(cv);
    const onVis = () => { vis = !document.hidden; vis && inView ? start() : stop(); };
    document.addEventListener('visibilitychange', onVis);
    start();
    return () => {
      stop(); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ref, reduced, active, bump]);
}

/** Modal built on the native <dialog>: focus trap, Escape, inert page and focus return come from the browser; the backdrop click closes it. */
export function Dialog({ open, onClose, title, children, cls }: { open: boolean; onClose: () => void; title: string; children: ReactNode; cls: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { try { d.showModal(); } catch { d.setAttribute('open', ''); } }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={`ha-dlg ${cls}`} aria-labelledby={id} onClose={onClose} onCancel={onClose}
      onPointerDown={(e) => { if (e.target === ref.current) onClose(); }}>
      {open && (
        <div className="ha-dlg-box">
          <div className="ha-dlg-head"><h2 id={id}>{title}</h2><button type="button" className="ha-x" onClick={onClose} aria-label="Close dialog"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button></div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Newsletter form with inline validation and a confirmation state. `cls` is the page prefix used by the buttons and fields. */
export function Subscribe({ cls, label = 'Email address', cta = 'Subscribe', doneTitle, doneText, extra, id }: { cls: string; label?: string; cta?: string; doneTitle: (email: string) => string; doneText: string; extra?: ReactNode; id: string }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.trim()) return setErr('Enter your email address.');
    if (!EMAIL.test(v.trim())) return setErr('That does not look like an email. Try name@example.com.');
    setErr(''); setDone(v.trim());
  };
  if (done) {
    return (
      <div className={`ha-ok ${cls}-ok`} role="status">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M7.5 12.5l3 3 6-6.5" /></svg>
        <div><b>{doneTitle(done)}</b><p>{doneText}</p></div>
        <button type="button" className={`${cls}-ghost`} onClick={() => { setDone(''); setV(''); }}>Use another address</button>
      </div>
    );
  }
  return (
    <form className={`ha-sub ${cls}-sub`} onSubmit={submit} noValidate>
      <div className="ha-fld" data-bad={err ? 'true' : undefined}>
        <label htmlFor={`${id}-em`}>{label}</label>
        <input id={`${id}-em`} type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={v} onChange={(e) => { setV(e.target.value); if (err) setErr(''); }} aria-invalid={!!err} aria-describedby={err ? `${id}-er` : undefined} />
        {err && <small id={`${id}-er`} role="alert">{err}</small>}
      </div>
      {extra}
      <button type="submit" className={`${cls}-cta`}>{cta}</button>
    </form>
  );
}
