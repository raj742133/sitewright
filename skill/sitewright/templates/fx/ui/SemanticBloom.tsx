'use client';
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { mix, rgba, useCanvasLoop, useReducedMotion } from './_text-c';
import { DEFAULT_GRAPH, allWords, neighbours, slot, type NodeState, type WordGraph } from './_text-c-bloom';

export interface SemanticBloomProps {
  /** The word in the middle at first. */
  seed?: string;
  /** Related words per word (links are symmetric). */
  graph?: WordGraph;
  /** Most related words shown around the centre (default 6; 5 in narrow boxes). */
  max?: number;
  /** Called when a related word becomes the centre. */
  onSelect?: (word: string) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * A wordmark that blooms into related words. The centre word opens on hover, click or Enter; related words grow out of it on gooey liquid
 * bridges with drifting particles. Choosing a related word makes it the new centre and its own relations bloom. Reduced motion jumps straight to the layout.
 */
export default function SemanticBloom({ seed = 'Light', graph = DEFAULT_GRAPH, max = 6, onSelect, className, style }: SemanticBloomProps) {
  const uid = useId().replace(/:/g, '');
  const reduced = useReducedMotion();
  const words = allWords(graph);
  const [focus, setFocus] = useState(seed);
  const [open, setOpen] = useState(reduced);
  const cvs = useRef<HTMLCanvasElement>(null);
  const btn = useRef<Record<string, HTMLButtonElement | null>>({});
  const nodes = useRef<Record<string, NodeState>>({});
  const ctl = useRef({ focus, open, max, graph, rd: reduced });
  useEffect(() => { ctl.current = { focus, open, max, graph, rd: reduced }; });
  useEffect(() => { if (reduced) { setOpen(true); return; } const id = window.setTimeout(() => setOpen(true), 500); return () => window.clearTimeout(id); }, [reduced]);

  const { redraw } = useCanvasLoop(cvs, ({ ctx, w, h, t, dt, pal, still }) => {
    const c = ctl.current;
    const cap = w < 380 ? Math.min(5, c.max) : c.max;
    const near = c.open ? neighbours(c.graph, c.focus).slice(0, cap) : [];
    const target: Record<string, { x: number; y: number; s: number }> = {};
    for (const wd of words) target[wd] = { x: w / 2, y: h / 2, s: 0 };
    target[c.focus] = { x: w / 2, y: h / 2, s: 1 };
    near.forEach((wd, i) => { const p = slot(i, near.length, w, h, still ? 0 : t); target[wd] = { x: p.x, y: p.y, s: 1 }; });
    const k = Math.min(1, dt * 60);
    const fill = rgba(mix(pal.surface, pal.primary, 0.2), 1);
    const fillC = rgba(mix(pal.surface, pal.primary, 0.34), 1);
    ctx.fillStyle = fillC; ctx.strokeStyle = fill; ctx.lineCap = 'round';
    const pts: { wd: string; x: number; y: number; s: number }[] = [];
    for (const wd of words) {
      const tg = target[wd] ?? { x: w / 2, y: h / 2, s: 0 };
      const n = nodes.current[wd] ?? (nodes.current[wd] = { x: w / 2, y: h / 2, vx: 0, vy: 0, s: 0, vs: 0 });
      if (still || c.rd) { n.x = tg.x; n.y = tg.y; n.s = tg.s; n.vx = n.vy = n.vs = 0; }
      else {
        n.vx = (n.vx + (tg.x - n.x) * 0.045 * k) * Math.pow(0.82, k); n.vy = (n.vy + (tg.y - n.y) * 0.045 * k) * Math.pow(0.82, k); n.vs = (n.vs + (tg.s - n.s) * 0.05 * k) * Math.pow(0.8, k);
        n.x += n.vx * k; n.y += n.vy * k; n.s += n.vs * k;
      }
      const el = btn.current[wd];
      const sc = Math.max(0, n.s);
      if (el) {
        el.style.transform = `translate(${n.x.toFixed(1)}px, ${n.y.toFixed(1)}px) translate(-50%, -50%) scale(${(wd === c.focus ? 1 : 0.4 + sc * 0.6).toFixed(3)})`;
        el.style.opacity = wd === c.focus ? '1' : String(Math.min(1, sc * 1.4));
        el.style.visibility = wd === c.focus || sc > 0.04 ? 'visible' : 'hidden';
      }
      pts.push({ wd, x: n.x, y: n.y, s: sc });
    }
    const cn = nodes.current[c.focus];
    const base = Math.min(w, h);
    for (const p of pts) {
      if (p.wd === c.focus || p.s < 0.03 || !cn) continue;
      ctx.lineWidth = Math.max(1.5, base * 0.028 * (1 - Math.min(1, Math.hypot(p.x - cn.x, p.y - cn.y) / base) * 0.5) * p.s);
      ctx.beginPath(); ctx.moveTo(cn.x, cn.y);
      ctx.quadraticCurveTo((cn.x + p.x) / 2 + Math.sin(t + p.x) * 6, (cn.y + p.y) / 2 + Math.cos(t * 0.8 + p.y) * 6, p.x, p.y);
      ctx.stroke();
    }
    for (const p of pts) {
      if (p.s < 0.03) continue;
      const foc = p.wd === c.focus;
      ctx.fillStyle = foc ? fillC : fill;
      const wl = p.wd.length * 4.2 + 16;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, (foc ? wl * 1.5 + 14 : wl * 1.1) * p.s, (foc ? 30 : 20) * p.s, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (cn && cn.s > 0.5) {
      ctx.fillStyle = rgba(pal.primary, 0.55);
      const drift = still ? 0 : t;
      pts.forEach((p, i) => {
        if (p.wd === c.focus || p.s < 0.5) return;
        for (let j = 0; j < 3; j++) {
          const u = (drift * 0.22 + i * 0.37 + j / 3) % 1;
          ctx.beginPath(); ctx.arc(cn.x + (p.x - cn.x) * u + Math.sin(u * 9 + i) * 5, cn.y + (p.y - cn.y) * u + Math.cos(u * 7 + i) * 5, 2.2 * (1 - u * 0.5), 0, Math.PI * 2); ctx.fill();
        }
      });
    }
  }, reduced);
  useEffect(() => { redraw(); }, [focus, open, redraw]);

  const near = open ? neighbours(graph, focus).slice(0, max) : [];
  const choose = (wd: string) => {
    if (wd === focus) { setOpen((o) => !o); return; }
    setFocus(wd); setOpen(true); onSelect?.(wd);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Escape') { setOpen(false); } };
  return (
    <div className={`ui-semantic-bloom-root ${className ?? ''}`} style={style} role="group" aria-label="Related words" onKeyDown={onKey}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setOpen(true); }}>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <filter id={`goo-${uid}`} colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
          <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" />
        </filter>
      </svg>
      <canvas ref={cvs} className="ui-semantic-bloom-canvas" style={{ filter: `url(#goo-${uid})` }} aria-hidden="true" />
      {words.map((wd) => {
        const shown = wd === focus || near.includes(wd);
        return (
          <button key={wd} type="button" ref={(el) => { btn.current[wd] = el; }} className={wd === focus ? 'ui-semantic-bloom-seed' : 'ui-semantic-bloom-word'}
            tabIndex={shown ? 0 : -1} aria-hidden={shown ? undefined : true} aria-expanded={wd === focus ? open : undefined}
            aria-label={wd === focus ? `${wd}, ${open ? 'close' : 'open'} related words` : `${wd}, make it the centre`} onClick={() => choose(wd)}>
            {wd}
          </button>
        );
      })}
    </div>
  );
}

export function Demo() {
  return <div className="ui-semantic-bloom-stage"><SemanticBloom /></div>;
}
