'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { seeded, usePrefs } from './_d6';

export interface MagicTreeProps {
  seed?: number;
  /** Branching levels (4 to 8). */
  depth?: number;
  /** Show the Regrow button. */
  button?: boolean;
  /** Starting season; the Season button then cycles spring, summer, autumn, winter. */
  season?: Season;
  className?: string;
  style?: React.CSSProperties;
}

interface Branch { d: string; w: number; delay: number }
interface Bloom { x: number; y: number; r: number; delay: number; light: boolean; hue: number }
interface Spark { id: number; x: number; y: number; fall: number; dx: number; s: number; hue: number }

const GROW = 0.32;
const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
type Season = (typeof SEASONS)[number];
const DRIFT = Array.from({ length: 14 }, (_, i) => i);

function build(seed: number, depth: number) {
  const rnd = seeded(seed);
  const branches: Branch[] = [];
  const blooms: Bloom[] = [];
  const walk = (x: number, y: number, a: number, len: number, lvl: number) => {
    const bend = (rnd() - 0.5) * 0.35;
    const ex = x + Math.sin(a + bend) * len, ey = y - Math.cos(a + bend) * len;
    const mx = x + Math.sin(a) * len * 0.5, my = y - Math.cos(a) * len * 0.5;
    branches.push({ d: `M${x.toFixed(1)} ${y.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`, w: Math.max(0.7, (depth - lvl) * 1.15), delay: lvl * GROW });
    if (lvl >= depth - 3) {
      const n = lvl === depth - 1 ? 3 : 1;
      for (let i = 0; i < n; i++) blooms.push({ x: ex + (rnd() - 0.5) * 10, y: ey + (rnd() - 0.5) * 10, r: 2.2 + rnd() * 3, delay: depth * GROW + rnd() * 0.9, light: rnd() < 0.22, hue: Math.floor(rnd() * 3) });
    }
    if (lvl >= depth - 1) return;
    const kids = rnd() < 0.18 ? 3 : 2;
    for (let i = 0; i < kids; i++) {
      const spread = kids === 2 ? (i ? 1 : -1) * (0.3 + rnd() * 0.35) : (i - 1) * (0.45 + rnd() * 0.2);
      walk(ex, ey, a + spread, len * (0.7 + rnd() * 0.1), lvl + 1);
    }
  };
  walk(100, 150, 0, 40, 0);
  return { branches, blooms };
}

/** A tree that grows from a seed: branches draw themselves recursively, leaves and lights bloom, and the Season button turns spring blossom to summer green, autumn gold with falling leaves, then a bare winter tree with snow and glowing lights; and pointer moves or taps shake sparkles loose. Press Regrow for a new tree. Fully deterministic per seed. */
export default function MagicTree({ seed = 7, depth = 7, button = true, season: first = 'spring', className, style }: MagicTreeProps) {
  const [round, setRound] = useState(0);
  const [season, setSeason] = useState<Season>(first);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const nextId = useRef(0);
  const lastMove = useRef(0);
  const rng = useRef(seeded(seed * 31 + 5));
  const { reduced } = usePrefs();
  const d = Math.max(4, Math.min(8, Math.round(depth)));
  const tree = useMemo(() => build(seed + round * 101, d), [seed, round, d]);

  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; }, []);

  const burst = (cx: number, cy: number, n: number) => {
    const r = rng.current;
    const made: Spark[] = Array.from({ length: n }, () => ({ id: nextId.current++, x: cx + (r() - 0.5) * 8, y: cy + (r() - 0.5) * 6, fall: 40 + r() * 80, dx: (r() - 0.5) * 70, s: 6 + r() * 7, hue: Math.floor(r() * 3) }));
    const ids = new Set(made.map((m) => m.id));
    setSparks((s) => [...s, ...made].slice(-48));
    timers.current.push(window.setTimeout(() => setSparks((s) => s.filter((p) => !ids.has(p.id))), reduced ? 700 : 1700));
  };
  const at = (e: React.PointerEvent) => {
    const rc = root.current?.getBoundingClientRect();
    if (!rc) return null;
    return { x: ((e.clientX - rc.left) / rc.width) * 100, y: ((e.clientY - rc.top) / rc.height) * 100 };
  };
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || e.timeStamp - lastMove.current < 90) return;
    lastMove.current = e.timeStamp;
    const p = at(e); if (p) burst(p.x, p.y, 2);
  };
  const onDown = (e: React.PointerEvent) => { if ((e.target as HTMLElement).closest('button')) return; const p = at(e); if (p) burst(p.x, p.y, 8); };
  const regrow = () => { setSparks([]); setRound((n) => n + 1); };

  return (
    <div ref={root} className={`ui-magic-tree is-${season}${reduced ? ' is-static' : ''}${className ? ' ' + className : ''}`} style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }} onPointerMove={onMove} onPointerDown={onDown}>
      <p className="ui-magic-tree-live" role="status" aria-live="polite">{`It is ${season}.`}</p>
      <svg key={round} className="ui-magic-tree-svg" viewBox="0 0 200 160" preserveAspectRatio="xMidYMax meet" role="img" aria-label="A tree growing from a seed, with glowing lights in its branches">
        <circle className="ui-magic-tree-sky" cx="30" cy="30" r="11" />
        <ellipse className="ui-magic-tree-ground" cx="100" cy="153" rx="46" ry="4" />
        <circle className="ui-magic-tree-seed" cx="100" cy="150" r="3.2" />
        <g className="ui-magic-tree-branches">
          {tree.branches.map((b, i) => (
            <path key={i} d={b.d} pathLength={1} className="ui-magic-tree-branch" style={{ strokeWidth: b.w, animationDelay: `${b.delay}s` }} />
          ))}
        </g>
        <g>
          {tree.blooms.map((b, i) => (
            <circle key={i} cx={b.x} cy={b.y} r={b.r} className={`ui-magic-tree-bloom ${b.light ? 'is-light' : 'is-leaf-' + b.hue}`} style={{ animationDelay: `${b.delay}s`, transformOrigin: `${b.x}px ${b.y}px` }} />
          ))}
        </g>
      </svg>
      <div className="ui-magic-tree-drift" aria-hidden="true">
        {DRIFT.map((i) => <i key={`${season}-${i}`} style={{ ['--i' as string]: i }} />)}
      </div>
      <div className="ui-magic-tree-sparks" aria-hidden="true">
        {sparks.map((s) => (
          <i key={s.id} className={`ui-magic-tree-spark is-${s.hue}`} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, ['--fall' as string]: `${s.fall}px`, ['--dx' as string]: `${s.dx}px` }} />
        ))}
      </div>
      {button && (
        <div className="ui-magic-tree-actions">
          <button type="button" className="ui-magic-tree-btn is-sparkle" onClick={() => burst(50, 28, 10)}>Sparkle</button>
          <button type="button" className="ui-magic-tree-btn" onClick={() => setSeason((c) => SEASONS[(SEASONS.indexOf(c) + 1) % SEASONS.length] as Season)} aria-label={`Season: ${season}. Change season`}>{season}</button>
          <button type="button" className="ui-magic-tree-btn is-primary" onClick={regrow} aria-label="Regrow the tree"><span aria-hidden="true">↻</span><span className="ui-magic-tree-lbl"> Regrow</span></button>
        </div>
      )}
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150 }}>
      <MagicTree depth={6} />
    </div>
  );
}
