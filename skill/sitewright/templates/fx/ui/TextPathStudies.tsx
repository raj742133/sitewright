'use client';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useCanvasLoop, useReducedMotion, clamp } from './_text-c';
import { PATH_VARIANTS, drawCloth, drawGlobe, drawRipple, newPathState, type PathState, type PathVariant } from './_text-c-paths';
import { drawBall, drawMorph } from './_text-c-paths2';

export interface TextPathStudiesProps {
  /** Letters that are laid along the paths. */
  text?: string;
  /** Controlled treatment. */
  variant?: PathVariant;
  defaultVariant?: PathVariant;
  onVariantChange?: (v: PathVariant) => void;
  /** Show the treatment switcher (default true). */
  controls?: boolean;
  className?: string;
  style?: CSSProperties;
}

const HELP: Record<PathVariant, string> = {
  globe: 'A globe of letters; drag or use arrow keys to turn it, plus and minus to zoom.',
  cloth: 'Rows of letters on a waving cloth that the pointer pushes up.',
  ripple: 'Rows of letters; click, tap or press Enter to send a ripple through them.',
  ball: 'A bouncing ball wrapped in a spiral of letters; drag to throw it, Enter to make it jump.',
  morph: 'Letters flowing along a path that morphs between shapes; click or press Enter for the next shape.',
};

/**
 * Five studies of text set along paths on Canvas2D: a draggable letter globe with procedural continents and markers, a cloth that
 * ripples under the pointer, ripples crossing rows of text, a bouncing spiral-wrapped ball you can throw, and a path that morphs shape to shape.
 * Reduced motion paints one still frame per study.
 */
export default function TextPathStudies({ text = 'text finds its own way along every curve ', variant, defaultVariant = 'globe', onVariantChange, controls = true, className, style }: TextPathStudiesProps) {
  const [inner, setInner] = useState<PathVariant>(defaultVariant);
  const cur = variant ?? inner;
  const reduced = useReducedMotion();
  const cvs = useRef<HTMLCanvasElement>(null);
  const S = useRef<PathState>(newPathState());
  const chars = Array.from(text).map((c) => (c === ' ' ? '·' : c));
  const vr = useRef(cur);
  useEffect(() => { vr.current = cur; });

  const { redraw } = useCanvasLoop(cvs, (f) => {
    const s = S.current;
    s.now = f.t;
    const v = vr.current;
    if (v === 'globe') drawGlobe(f, s, chars);
    else if (v === 'cloth') drawCloth(f, s, chars);
    else if (v === 'ripple') drawRipple(f, s, chars);
    else if (v === 'ball') drawBall(f, s, chars);
    else drawMorph(f, s, chars);
  }, reduced);
  useEffect(() => { redraw(); }, [cur, redraw]);

  useEffect(() => {
    const el = cvs.current;
    if (!el || reduced) return;
    const s = S.current;
    let lx = 0, ly = 0, lt = 0;
    const local = (e: PointerEvent) => { const r = el.getBoundingClientRect(); s.px = e.clientX - r.left; s.py = e.clientY - r.top; };
    const down = (e: PointerEvent) => {
      local(e); s.down = true; s.inside = true; lx = s.px; ly = s.py; lt = performance.now();
      const v = vr.current;
      if (v === 'globe' || v === 'ball') { s.dragging = true; el.setPointerCapture(e.pointerId); }
      if (v === 'ripple') s.bursts.push({ t0: s.now, x: s.px, y: s.py });
      if (v === 'morph') s.advance = true;
    };
    const move = (e: PointerEvent) => {
      local(e); s.inside = true;
      const v = vr.current, now = performance.now(), dtm = Math.max(1, now - lt) / 1000;
      if (s.dragging && v === 'globe') { const dx = s.px - lx; s.yaw += dx * 0.012; s.vyaw = clamp((dx * 0.012) / dtm, -6, 6); s.pitch = clamp(s.pitch - (s.py - ly) * 0.008, -1.2, 1.2); }
      if (s.dragging && v === 'ball') { const b = s.ball; b.vx = clamp((s.px - lx) / dtm, -1500, 1500); b.vy = clamp((s.py - ly) / dtm, -1500, 1500); b.x = s.px; b.y = s.py; }
      if (v === 'ripple' && s.now - s.lastSpawn > 0.45 && Math.hypot(s.px - lx, s.py - ly) > 24) { s.bursts.push({ t0: s.now, x: s.px, y: s.py }); s.lastSpawn = s.now; }
      lx = s.px; ly = s.py; lt = now;
    };
    const up = () => { s.down = false; s.dragging = false; };
    const leave = () => { s.inside = false; };
    const wheel = (e: WheelEvent) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); s.zoom = clamp(s.zoom * (e.deltaY < 0 ? 1.08 : 0.92), 0.6, 1.7); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave); el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave); el.removeEventListener('wheel', wheel);
    };
  }, [reduced]);

  const choose = (v: PathVariant) => { if (variant === undefined) setInner(v); onVariantChange?.(v); };
  const zoom = (k: number) => { S.current.zoom = clamp(S.current.zoom * k, 0.6, 1.7); redraw(); };
  const onKey = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const s = S.current, v = cur;
    if (e.key === '+' || e.key === '=') zoom(1.12);
    else if (e.key === '-' || e.key === '_') zoom(0.9);
    else if (v === 'globe' && e.key === 'ArrowLeft') { s.yaw -= 0.25; s.vyaw = 0; }
    else if (v === 'globe' && e.key === 'ArrowRight') { s.yaw += 0.25; s.vyaw = 0; }
    else if (v === 'globe' && e.key === 'ArrowUp') s.pitch = clamp(s.pitch + 0.15, -1.2, 1.2);
    else if (v === 'globe' && e.key === 'ArrowDown') s.pitch = clamp(s.pitch - 0.15, -1.2, 1.2);
    else if (v === 'ball' && e.key === 'ArrowLeft') s.ball.vx -= 260;
    else if (v === 'ball' && e.key === 'ArrowRight') s.ball.vx += 260;
    else if (v === 'ball' && (e.key === 'Enter' || e.key === ' ')) s.ball.vy = -1100;
    else if (v === 'ripple' && (e.key === 'Enter' || e.key === ' ')) { const c = cvs.current; s.bursts.push({ t0: s.now, x: (c?.clientWidth ?? 200) / 2, y: (c?.clientHeight ?? 150) / 2 }); }
    else if (v === 'morph' && (e.key === 'Enter' || e.key === ' ')) s.advance = true;
    else return;
    e.preventDefault();
    if (reduced) redraw();
  };

  return (
    <div className={`ui-text-path-studies-root ${className ?? ''}`} style={style}>
      <canvas ref={cvs} className="ui-text-path-studies-canvas" data-variant={cur} tabIndex={0} role="img" aria-label={HELP[cur]} onKeyDown={onKey} />
      {controls ? (
        <div className="ui-text-path-studies-bar">
          <div className="ui-text-path-studies-tabs" role="group" aria-label="Study">
            {PATH_VARIANTS.map((o) => (
              <button key={o.id} type="button" className="ui-text-path-studies-tab" aria-pressed={cur === o.id} onClick={() => choose(o.id)}>{o.label}</button>
            ))}
          </div>
          {cur === 'globe' || cur === 'ball' ? (
            <div className="ui-text-path-studies-zoom" role="group" aria-label="Zoom">
              <button type="button" aria-label="Zoom out" onClick={() => zoom(0.9)}>−</button>
              <button type="button" aria-label="Zoom in" onClick={() => zoom(1.12)}>+</button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Demo() {
  return <div className="ui-text-path-studies-stage"><TextPathStudies /></div>;
}
