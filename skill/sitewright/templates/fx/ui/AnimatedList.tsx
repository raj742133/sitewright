'use client';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { useReducedMotion } from './_t2';
import { useControlled, useLive, useSeen } from './_cards-use';

export interface AnimatedListItem {
  id: string;
  title: string;
  detail?: string;
  /** Right-aligned meta, e.g. a time. */
  meta?: string;
  /** Small visual at the start of the row. */
  icon?: ReactNode;
  /** Colour hint for the default icon: 'primary' | 'signal' | 'muted'. */
  tone?: 'primary' | 'signal' | 'muted';
}

export interface AnimatedListProps {
  items?: AnimatedListItem[];
  /** Selected id (controlled). */
  selected?: string;
  onSelect?: (id: string) => void;
  /** Called after a row has finished its exit animation (Delete / Backspace, or the dismiss button). Omit to make rows non-dismissable. */
  onRemove?: (id: string) => void;
  /** Custom row content. */
  renderItem?: (item: AnimatedListItem) => ReactNode;
  /** Delay between rows on the first reveal, ms. */
  stagger?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const SEED: AnimatedListItem[] = [
  { id: 'a', title: 'Invoice 1042 paid', detail: 'Northwind Studio', meta: 'now', tone: 'primary' },
  { id: 'b', title: 'New comment on Launch plan', detail: 'Mara: can we move this up?', meta: '2m', tone: 'signal' },
  { id: 'c', title: 'Deploy finished', detail: 'Production, 41 seconds', meta: '9m', tone: 'primary' },
  { id: 'd', title: 'Storage at 80%', detail: 'Consider archiving old exports', meta: '1h', tone: 'muted' },
  { id: 'e', title: 'Teammate joined', detail: 'Jun accepted your invite', meta: '3h', tone: 'signal' },
];

/** A list whose rows rise in one after another, slide in when added and fold away when dismissed. Arrow keys move through rows, Enter selects, Delete dismisses. */
export default function AnimatedList({ items = SEED, selected, onSelect, onRemove, renderItem, stagger = 70, label = 'Activity', className, style }: AnimatedListProps) {
  const rootRef = useRef<HTMLUListElement>(null);
  const seen = useSeen(rootRef);
  const reduced = useReducedMotion();
  const [sel, setSel] = useControlled<string | null>(selected, null, (v) => { if (v) onSelect?.(v); });
  const [leaving, setLeaving] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const first = useRef<Set<string> | null>(null);
  if (first.current === null) first.current = new Set(items.map((i) => i.id));
  const btns = useRef(new Map<string, HTMLButtonElement>());
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); }, []);

  const dismiss = (id: string) => {
    if (!onRemove || leaving.includes(id)) return;
    const i = items.findIndex((x) => x.id === id);
    const next = items[i + 1] ?? items[i - 1];
    if (reduced) { onRemove(id); } else {
      setLeaving((l) => [...l, id]);
      timers.current.push(window.setTimeout(() => { onRemove(id); setLeaving((l) => l.filter((x) => x !== id)); }, 320));
    }
    if (next) { setFocusId(next.id); btns.current.get(next.id)?.focus(); }
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const go = (to: number) => { const it = items[Math.max(0, Math.min(items.length - 1, to))]; if (it) { e.preventDefault(); setFocusId(it.id); btns.current.get(it.id)?.focus(); } };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
    else if ((e.key === 'Delete' || e.key === 'Backspace') && onRemove) { e.preventDefault(); const it = items[i]; if (it) dismiss(it.id); }
  };
  const tabbable = items.find((i) => i.id === focusId)?.id ?? items.find((i) => i.id === sel)?.id ?? items[0]?.id;

  return (
    <ul ref={rootRef} className={`ui-animated-list-root ${className ?? ''}`} style={style} data-seen={seen ? 'true' : 'false'} aria-label={label}>
      {items.map((it, i) => {
        const initial = first.current?.has(it.id);
        const out = leaving.includes(it.id);
        return (
          <li key={it.id} className="ui-animated-list-row" data-out={out ? 'true' : 'false'} data-initial={initial ? 'true' : 'false'} style={{ '--i': initial ? i : 0, '--st': stagger + 'ms' } as CSSProperties}>
            <div className="ui-animated-list-wrap">
              <div className="ui-animated-list-item" data-selected={sel === it.id ? 'true' : 'false'}>
                <button type="button" ref={(el) => { if (el) btns.current.set(it.id, el); else btns.current.delete(it.id); }} className="ui-animated-list-main"
                  tabIndex={it.id === tabbable ? 0 : -1} aria-current={sel === it.id ? 'true' : undefined}
                  onFocus={() => setFocusId(it.id)} onClick={() => setSel(it.id)} onKeyDown={(e) => onKey(e, i)}>
                  {renderItem ? renderItem(it) : (
                    <>
                      <span className="ui-animated-list-icon" data-tone={it.tone ?? 'primary'} aria-hidden="true">{it.icon ?? it.title.slice(0, 1)}</span>
                      <span className="ui-animated-list-text"><strong>{it.title}</strong>{it.detail ? <span>{it.detail}</span> : null}</span>
                      {it.meta ? <span className="ui-animated-list-meta">{it.meta}</span> : null}
                    </>
                  )}
                </button>
                {onRemove ? <button type="button" tabIndex={-1} className="ui-animated-list-x" aria-label={`Dismiss ${it.title}`} onClick={() => dismiss(it.id)}><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const FEED: Omit<AnimatedListItem, 'id'>[] = [
  { title: 'Order #2291 shipped', detail: 'Arrives Thursday', tone: 'primary' },
  { title: 'Review requested', detail: 'Pricing page copy', tone: 'signal' },
  { title: 'Backup complete', detail: '2.4 GB archived', tone: 'muted' },
  { title: 'New subscriber', detail: 'Plan: Studio', tone: 'primary' },
  { title: 'Build passed', detail: '212 checks', tone: 'signal' },
];

export function Demo() {
  const [items, setItems] = useState<AnimatedListItem[]>(SEED.slice(0, 4));
  const n = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const live = useLive(box);
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!live || reduced || paused) return;
    const t = window.setInterval(() => {
      const f = FEED[n.current % FEED.length];
      if (!f) return;
      const id = 'n' + n.current++;
      setItems((l) => [{ ...f, id, meta: 'now' }, ...l].slice(0, 6));
    }, 2200);
    return () => window.clearInterval(t);
  }, [live, reduced, paused]);
  return (
    <div ref={box} className="ui-animated-list-demo" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <AnimatedList items={items} onRemove={(id) => setItems((l) => l.filter((x) => x.id !== id))} />
    </div>
  );
}
