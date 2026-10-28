'use client';
import { Children, createElement, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion } from './_t2';
import { Art, cx, useInView } from './_motion-a';

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none';
const EASES: Record<string, string> = {
  smooth: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  linear: 'linear',
};

export interface AnimatedContentProps {
  children?: ReactNode;
  /** Side the content travels in from. */
  direction?: RevealDirection;
  /** Travel distance in px. */
  distance?: number;
  /** Starting scale (1 = none, 0.9 grows in from 90%). */
  scale?: number;
  /** Starting rotation in degrees. */
  rotate?: number;
  /** Starting blur in px. */
  blur?: number;
  /** Duration in ms. */
  duration?: number;
  /** Delay before the first item in ms. */
  delay?: number;
  /** Extra delay per child in ms; above 0 every child animates on its own. */
  stagger?: number;
  /** 'smooth' | 'out' | 'spring' | 'linear' or any CSS timing function. */
  easing?: string;
  /** Fraction of the block that must be visible (0 to 1). */
  threshold?: number;
  /** IntersectionObserver rootMargin, e.g. '0px 0px -10% 0px'. */
  rootMargin?: string;
  /** true: reveal once. false: hide again when it leaves the screen so it replays. */
  once?: boolean;
  /** Controlled: when set, in-view detection is ignored. */
  show?: boolean;
  onReveal?: (shown: boolean) => void;
  /** Wrapper element. */
  as?: 'div' | 'section' | 'ul' | 'ol' | 'article';
  className?: string;
  style?: CSSProperties;
}

/** A reveal wrapper that slides, scales, rotates and un-blurs its content in when it scrolls into view. Staggers children, replays on demand, and shows instantly under reduced motion. */
export default function AnimatedContent({
  children, direction = 'up', distance = 32, scale = 1, rotate = 0, blur = 0, duration = 700, delay = 0, stagger = 0,
  easing = 'out', threshold = 0.2, rootMargin = '0px', once = true, show, onReveal, as = 'div', className, style,
}: AnimatedContentProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const seen = useInView(ref, { threshold, once, rootMargin });
  const shown = show ?? seen;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const cb = useRef(onReveal);
  useEffect(() => { cb.current = onReveal; });
  useEffect(() => { if (mounted) cb.current?.(shown); }, [shown, mounted]);

  const dx = direction === 'left' ? -distance : direction === 'right' ? distance : 0;
  const dy = direction === 'up' ? distance : direction === 'down' ? -distance : 0;
  const vars = {
    '--ui-ac-x': dx + 'px', '--ui-ac-y': dy + 'px', '--ui-ac-s': scale, '--ui-ac-r': rotate + 'deg', '--ui-ac-b': blur + 'px',
    '--ui-ac-d': duration + 'ms', '--ui-ac-e': EASES[easing] ?? easing, ...style,
  } as CSSProperties;

  const items = stagger > 0 ? Children.toArray(children) : [children];
  return createElement(as, {
    ref, className: cx('ui-animated-content', blur > 0 && 'has-blur', className), style: vars,
    'data-shown': shown || reduced ? 'true' : 'false', 'data-instant': reduced ? 'true' : undefined,
  }, items.map((c, i) => (
    <div key={i} className="ui-animated-content-item" style={{ transitionDelay: `${delay + i * stagger}ms` }}>{c}</div>
  )));
}

const DIRS: RevealDirection[] = ['up', 'left', 'right', 'down'];

export function Demo() {
  const [dir, setDir] = useState<RevealDirection>('up');
  const [run, setRun] = useState(0);
  return (
    <div className="ui-animated-content-demo">
      <div className="ui-animated-content-bar" role="group" aria-label="Reveal direction">
        {DIRS.map((d) => (
          <button key={d} type="button" aria-pressed={dir === d} onClick={() => { setDir(d); setRun((n) => n + 1); }}>{d}</button>
        ))}
        <button type="button" className="ui-animated-content-replay" onClick={() => setRun((n) => n + 1)}>Replay</button>
      </div>
      <AnimatedContent key={run} direction={dir} distance={28} stagger={110} duration={700} blur={4} scale={0.97} threshold={0.1} className="ui-animated-content-stage">
        <div className="ui-animated-content-hero"><Art variant="peaks" /><span>Release 4.2</span></div>
        <h3>What changed this week</h3>
        <p>Faster builds, a calmer dashboard and fewer surprises.</p>
        <ul className="ui-animated-content-pills"><li>12 fixes</li><li>4 features</li><li>0 breaking</li></ul>
      </AnimatedContent>
    </div>
  );
}
