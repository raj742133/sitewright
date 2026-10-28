'use client';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from 'react';
import { Stage, useControlled, useReducedMotion } from './_menus-kit';

export interface LineSidebarItem { id: string; label: string }
export interface LineSidebarProps {
  items?: LineSidebarItem[];
  /** Controlled active id. */
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** Scroll container holding elements whose ids match the items. When given, the sidebar follows the scroll position and scrolls to a section when chosen. */
  scrollRef?: RefObject<HTMLElement | null>;
  side?: 'left' | 'right';
  label?: string;
  className?: string;
  style?: CSSProperties;
}
const ITEMS: LineSidebarItem[] = [{ id: 'intro', label: 'Introduction' }, { id: 'design', label: 'Design' }, { id: 'build', label: 'Build' }, { id: 'launch', label: 'Launch' }, { id: 'learn', label: 'Learnings' }, { id: 'next', label: 'What is next' }];

/** A slim rail of tick lines, one per section. Lines stretch toward the pointer like a wave, the active one is accented, and hovering or focusing the rail
 *  unfolds the labels. Optionally tracks the scroll position of `scrollRef` (IntersectionObserver) and scrolls to a section on selection.
 *  Links carry aria-current="location"; the label column is real text so screen readers always read it. */
export default function LineSidebar({ items = ITEMS, value, defaultValue, onChange, scrollRef, side = 'left', label = 'On this page', className = '', style }: LineSidebarProps) {
  const [active, setActive] = useControlled<string>(value, defaultValue ?? items[0]?.id ?? '', onChange);
  const reduced = useReducedMotion();
  const ul = useRef<HTMLUListElement>(null);
  const lock = useRef(0);
  const setRef = useRef(setActive);
  useEffect(() => { setRef.current = setActive; });
  const [near, setNear] = useState<number | null>(null);

  useEffect(() => {
    const root = scrollRef?.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((es) => {
      if (performance.now() < lock.current) return;
      const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setRef.current(vis.target.id);
    }, { root, rootMargin: '-10% 0px -70% 0px' });
    items.forEach((it) => { const el = root.querySelector('#' + CSS.escape(it.id)); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [scrollRef, items]);

  const choose = (id: string) => {
    setActive(id);
    const el = scrollRef?.current?.querySelector('#' + CSS.escape(id));
    if (el) { lock.current = performance.now() + 700; el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const u = ul.current; if (!u) return;
    const r = u.getBoundingClientRect();
    setNear(((e.clientY - r.top) / r.height) * items.length - 0.5);
  };
  return (
    <nav className={`ui-line-sidebar-root is-${side} ${className}`} style={style} aria-label={label}>
      <ul ref={ul} className="ui-line-sidebar-list" onPointerMove={onMove} onPointerLeave={() => setNear(null)}>
        {items.map((it, i) => {
          const d = near == null || reduced ? 9 : Math.abs(near - i);
          const k = Math.max(0, 1 - d / 2.2);
          return (
            <li key={it.id} className="ui-line-sidebar-li" style={{ ['--k' as string]: (k * k).toFixed(3) }}>
              <a className={`ui-line-sidebar-link${active === it.id ? ' is-active' : ''}`} href={'#' + it.id} aria-current={active === it.id ? 'location' : undefined}
                onClick={(e) => { e.preventDefault(); choose(it.id); }}>
                <span className="ui-line-sidebar-tick" aria-hidden="true" />
                <span className="ui-line-sidebar-text">{it.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Demo() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Stage align="stretch">
      <div className="ui-line-sidebar-demo">
        <LineSidebar scrollRef={ref} />
        <div className="ui-line-sidebar-scroll" ref={ref} tabIndex={0} role="region" aria-label="Article">
          {ITEMS.map((it, i) => (
            <section key={it.id} id={it.id} className="ui-line-sidebar-sec">
              <h3>{it.label}</h3>
              <p>{['Start with the question people are really asking.', 'Sketch quickly, then pick one direction and refine it.', 'Ship the smallest version that holds together.', 'Release to a few people first and watch what they do.', 'Write down what surprised you while it is fresh.', 'Choose the next experiment and set a date.'][i]}</p>
            </section>
          ))}
        </div>
      </div>
    </Stage>
  );
}
