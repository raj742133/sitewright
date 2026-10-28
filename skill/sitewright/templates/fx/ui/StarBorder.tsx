'use client';
import { useEffect, useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { readPalette, useReducedMotion, watchLive, watchPalette, type Palette, type RGB } from './_t2';
import { cx } from './_motion-a';

export interface StarBorderProps {
  children?: ReactNode;
  /** Rendered element. 'a' needs href. */
  as?: 'div' | 'button' | 'a';
  /** Corner radius in px. */
  radius?: number;
  /** Number of stars travelling the border. */
  stars?: number;
  /** Seconds for one lap. */
  period?: number;
  /** Star size in px. */
  starSize?: number;
  /** Length of the glowing tail as a fraction of the border. */
  tail?: number;
  /** Star colour: 'signal' | 'primary' | 'ink' (theme tokens). */
  tone?: 'signal' | 'primary' | 'ink';
  className?: string;
  style?: CSSProperties;
  href?: string;
  onClick?: () => void;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target'];
  disabled?: boolean;
}

/** Point at distance s along the perimeter of a rounded rectangle (clockwise from the top-left corner's end). */
function onBorder(s: number, w: number, h: number, r: number): [number, number] {
  const sw = w - 2 * r, sh = h - 2 * r, arc = (Math.PI / 2) * r, per = 2 * sw + 2 * sh + 4 * arc;
  let d = ((s % per) + per) % per;
  if (d < sw) return [r + d, 0];
  d -= sw;
  if (d < arc) { const a = d / r; return [w - r + Math.sin(a) * r, r - Math.cos(a) * r]; }
  d -= arc;
  if (d < sh) return [w, r + d];
  d -= sh;
  if (d < arc) { const a = d / r; return [w - r + Math.cos(a) * r, h - r + Math.sin(a) * r]; }
  d -= arc;
  if (d < sw) return [w - r - d, h];
  d -= sw;
  if (d < arc) { const a = d / r; return [r - Math.sin(a) * r, h - r + Math.cos(a) * r]; }
  d -= arc;
  if (d < sh) return [0, h - r - d];
  d -= sh;
  const a = d / r;
  return [r - Math.cos(a) * r, r - Math.sin(a) * r];
}
const perimeter = (w: number, h: number, r: number) => 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;

function sparkle(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath(); g.moveTo(0, -r);
  g.quadraticCurveTo(0, 0, r, 0); g.quadraticCurveTo(0, 0, 0, r); g.quadraticCurveTo(0, 0, -r, 0); g.quadraticCurveTo(0, 0, 0, -r);
  g.closePath(); g.fill(); g.restore();
}

/** A bordered container (div, button or link) with glowing four-point stars travelling around its edge on a canvas overlay. Speeds up on hover and focus; frozen under reduced motion. */
export default function StarBorder({ children, as = 'div', radius = 14, stars = 3, period = 7, starSize = 7, tail = 0.07, tone = 'signal', className, style, ...rest }: StarBorderProps) {
  const rootRef = useRef<HTMLElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const cfg = useRef({ stars, period, starSize, tail, tone, radius, reduced });
  const redraw = useRef<(() => void) | null>(null);
  useEffect(() => { cfg.current = { stars, period, starSize, tail, tone, radius, reduced }; redraw.current?.(); });

  useEffect(() => {
    const root = rootRef.current, cv = cvRef.current;
    if (!root || !cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    let w = 0, h = 0, dpr = 1, pad = 0;
    let pal: Palette = readPalette(root);
    let phase = 0, boost = 0, hot = false, raf = 0, last = 0, live = true;
    const colour = (): RGB => { const t = cfg.current.tone; return t === 'ink' ? pal.ink : t === 'primary' ? pal.primary : pal.signal; };
    const draw = () => {
      const c = cfg.current;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      if (w < 10 || h < 10) return;
      const r = Math.min(c.radius, w / 2 - 1, h / 2 - 1);
      const per = perimeter(w, h, r), col = colour();
      g.translate(pad, pad);
      g.globalCompositeOperation = 'lighter';
      const n = Math.max(1, c.stars);
      for (let i = 0; i < n; i++) {
        const head = (phase + i / n) * per;
        const len = per * c.tail, seg = 16;
        g.lineCap = 'round';
        for (let k = seg; k > 0; k--) {
          const a = (seg - k) / seg;
          const [x1, y1] = onBorder(head - (k * len) / seg, w, h, r), [x2, y2] = onBorder(head - ((k - 1) * len) / seg, w, h, r);
          g.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${(a * a * 0.9).toFixed(3)})`;
          g.lineWidth = 1 + a * 1.6;
          g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        }
        const [hx, hy] = onBorder(head, w, h, r);
        const tw = c.reduced ? 1 : 0.8 + 0.2 * Math.sin(phase * 40 + i * 2);
        const glow = g.createRadialGradient(hx, hy, 0, hx, hy, c.starSize * 2.4);
        glow.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.55)`); glow.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
        g.fillStyle = glow; g.fillRect(hx - c.starSize * 3, hy - c.starSize * 3, c.starSize * 6, c.starSize * 6);
        g.fillStyle = `rgba(255,255,255,${(0.92 * tw).toFixed(3)})`;
        sparkle(g, hx, hy, c.starSize * tw, phase * 6);
      }
      g.globalCompositeOperation = 'source-over';
    };
    const frame = (t: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      boost += ((hot ? 1 : 0) - boost) * Math.min(1, dt * 5);
      phase = (phase + (dt / Math.max(1, cfg.current.period)) * (1 + boost * 1.6)) % 1;
      draw();
      if (live && !cfg.current.reduced) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && live && !cfg.current.reduced) { last = 0; raf = requestAnimationFrame(frame); } };
    const fit = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = root.offsetWidth; h = root.offsetHeight; pad = Math.ceil(cfg.current.starSize * 3);
      cv.width = Math.round((w + pad * 2) * dpr); cv.height = Math.round((h + pad * 2) * dpr);
      cv.style.inset = `${-pad}px`; cv.style.width = `${w + pad * 2}px`; cv.style.height = `${h + pad * 2}px`;
      draw();
    };
    redraw.current = () => { if (cfg.current.reduced) { phase = 0.12; draw(); } else { draw(); kick(); } };
    fit();
    if (cfg.current.reduced) phase = 0.12;
    const ro = new ResizeObserver(() => { fit(); });
    ro.observe(root);
    const offP = watchPalette(root, (p) => { pal = p; draw(); });
    const offL = watchLive(root, (v) => { live = v; if (v) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } });
    const on = () => { hot = true; kick(); }, offH = () => { hot = false; kick(); };
    root.addEventListener('pointerenter', on); root.addEventListener('pointerleave', offH); root.addEventListener('focusin', on); root.addEventListener('focusout', offH);
    kick();
    return () => {
      ro.disconnect(); offP(); offL(); if (raf) cancelAnimationFrame(raf); redraw.current = null;
      root.removeEventListener('pointerenter', on); root.removeEventListener('pointerleave', offH); root.removeEventListener('focusin', on); root.removeEventListener('focusout', offH);
    };
  }, []);

  const Tag = as as 'div';
  const props = { ...rest } as Record<string, unknown>;
  if (as !== 'a') { delete props.href; delete props.target; }
  if (as !== 'button') { delete props.type; delete props.disabled; }
  return (
    <Tag ref={rootRef as never} className={cx('ui-star-border-root', className)} style={{ '--ui-sb-r': radius + 'px', ...style } as CSSProperties} {...props}>
      <canvas ref={cvRef} className="ui-star-border-canvas" aria-hidden="true" />
      <span className="ui-star-border-inner">{children}</span>
    </Tag>
  );
}

export function Demo() {
  return (
    <div className="ui-star-border-demo">
      <StarBorder as="button" type="button" radius={16}>Start free trial</StarBorder>
      <StarBorder as="div" radius={18} tone="primary" stars={2} period={9} className="ui-star-border-card">
        <strong>Pro plan</strong>
        <span>Unlimited projects, priority builds and a calmer inbox.</span>
      </StarBorder>
    </div>
  );
}
