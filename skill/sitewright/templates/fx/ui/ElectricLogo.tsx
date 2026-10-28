'use client';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { mix, noise2, rnd, rgba, useCanvas2D, type Frame } from './_motion-gl-2d';

export interface ElectricLogoProps {
  /** SVG path data for your own mark (in `viewBox` units). Ignored when `children` is given. */
  path?: string;
  /** Your own SVG elements (path, circle, rect, polygon...) drawn inside the mark's <svg>. Use stroke="currentColor" or fill="currentColor". */
  children?: ReactNode;
  /** Coordinate system of `path` / `children` (default "0 0 120 120"). */
  viewBox?: string;
  /** Rendered size in px (default 160). */
  size?: number;
  /** Accessible name; leave empty to mark it decorative. */
  label?: string;
  /** Arc strength 0..2 (default 1). */
  intensity?: number;
  className?: string;
  style?: CSSProperties;
}

/** A neutral generic mark: a faceted gem inside a hexagon (nothing to do with any real brand). */
const DEFAULT_MARK = (
  <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round">
    <path d="M60 10 L103 35 V85 L60 110 L17 85 V35 Z" />
    <path d="M60 36 L82 60 L60 84 L38 60 Z" />
  </g>
);

interface Line { x: number[]; y: number[]; nx: number[]; ny: number[] }
const GEOM = 'path,circle,ellipse,rect,line,polyline,polygon';

/** Walk every geometry element of the svg and sample its outline in viewBox units. */
function sample(svg: SVGSVGElement): Line[] {
  const out: Line[] = [];
  const inv = svg.getCTM()?.inverse();
  svg.querySelectorAll(GEOM).forEach((el) => {
    const g = el as unknown as SVGGeometryElement;
    if (typeof g.getTotalLength !== 'function') return;
    try {
      const len = g.getTotalLength();
      if (!(len > 1)) return;
      const m = inv && g.getCTM ? g.getCTM() : null;
      const n = Math.min(260, Math.max(12, Math.round(len / 2.5)));
      const l: Line = { x: [], y: [], nx: [], ny: [] };
      for (let i = 0; i <= n; i++) {
        const p = g.getPointAtLength((len * i) / n);
        const q = inv && m ? new DOMPoint(p.x, p.y).matrixTransform(inv.multiply(m)) : p;
        l.x.push(q.x); l.y.push(q.y);
      }
      for (let i = 0; i <= n; i++) {
        const a = Math.max(0, i - 1), b = Math.min(n, i + 1);
        const dx = l.x[b]! - l.x[a]!, dy = l.y[b]! - l.y[a]!, d = Math.hypot(dx, dy) || 1;
        l.nx.push(dy / d); l.ny.push(-dx / d);
      }
      out.push(l);
    } catch { /* element not measurable */ }
  });
  return out;
}

/**
 * Crackles electric arcs around a logo mark. Pass your own SVG `path` or `children` (any
 * path/circle/rect/polygon shapes); the arcs follow their outlines. Canvas 2D on top of a crisp
 * SVG; decorative arcs are aria-hidden; one still frame with reduced motion.
 */
export default function ElectricLogo({ path, children, viewBox = '0 0 120 120', size = 160, label, intensity = 1, className, style }: ElectricLogoProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const lines = useRef<Line[] | null>(null);
  const vb = viewBox.trim().split(/[\s,]+/).map(Number);
  const [vx = 0, vy = 0, vw = 120, vh = 120] = vb;
  const { wrapRef, canvasRef, redraw } = useCanvas2D((f: Frame) => {
    const svg = svgRef.current;
    if (!svg) return;
    if (!lines.current || f.fresh) lines.current = sample(svg);
    const { ctx, w, h, t, pal } = f;
    const s = Math.min(w / vw, h / vh);
    const ox = (w - vw * s) / 2 - vx * s, oy = (h - vh * s) / 2 - vy * s;
    const col = rgba(pal.primary, 1);
    const hot = rgba(mix(pal.primary, [255, 255, 255], 0.7), 1);
    const amp = 3.2 * intensity * Math.max(0.6, s * 1.1);
    const flick = 0.72 + 0.28 * Math.sin(t * 23) * Math.sin(t * 7.3);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    lines.current.forEach((l, li) => {
      const n = l.x.length;
      const run = (seed: number, lw: number, alpha: number, c: string, k: number) => {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const d = (noise2(i * 0.28 + seed * 9, t * 3.4 + li * 5, seed) + noise2(i * 0.9, t * 8 + seed, seed + 3) * 0.4) * amp * k;
          const x = ox + (l.x[i]! + l.nx[i]! * d / s) * s, y = oy + (l.y[i]! + l.ny[i]! * d / s) * s;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = alpha * flick; ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.stroke();
      };
      run(1, 12, 0.14, col, 1);
      run(1, 4.5, 0.32, col, 1);
      run(2, 1.4, 0.55, col, 1.2);
      run(1, 1.6, 0.95, col, 1);
      run(1, 0.8, 0.9, hot, 1);
    });
    // sparks: short jagged bolts leaving the outline; re-rolled ~9 times a second
    const slot = Math.floor(t * 9);
    for (let k = 0; k < Math.round(5 * intensity); k++) {
      const l = lines.current[Math.floor(rnd(slot * 13 + k) * lines.current.length)];
      if (!l) continue;
      const i = Math.floor(rnd(slot * 31 + k * 7) * l.x.length);
      let x = ox + l.x[i]! * s, y = oy + l.y[i]! * s;
      const nx = l.nx[i]!, ny = l.ny[i]!;
      const len = (14 + rnd(slot * 5 + k) * 26) * Math.max(0.7, s);
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 1; j <= 5; j++) {
        const along = (len * j) / 5, side = (rnd(slot * 17 + k * 3 + j) - 0.5) * 12;
        x = ox + l.x[i]! * s + nx * along - ny * side; y = oy + l.y[i]! * s + ny * along + nx * side;
        ctx.lineTo(x, y);
      }
      ctx.globalAlpha = (0.9 - rnd(slot + k) * 0.4) * flick; ctx.strokeStyle = hot; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, { pad: 40, pointer: false });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    lines.current = null;
    redraw();
    const mo = new MutationObserver(() => { lines.current = null; redraw(); });
    mo.observe(svg, { subtree: true, childList: true, attributes: true });
    return () => mo.disconnect();
  }, [path, viewBox, children, redraw]);

  return (
    <div ref={wrapRef} className={'ui-electric-logo' + (className ? ' ' + className : '')} style={{ width: size, height: size, ...style }}>
      <canvas ref={canvasRef} className="ui-electric-logo-canvas" aria-hidden="true" style={{ inset: -40 }} />
      <svg ref={svgRef} className="ui-electric-logo-svg" viewBox={viewBox} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}>
        {children ?? (path ? <path d={path} fill="none" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" /> : DEFAULT_MARK)}
      </svg>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-electric-logo-stage">
      <ElectricLogo size={168} label="Generic gem mark" />
    </div>
  );
}
