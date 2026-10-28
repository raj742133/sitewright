'use client';
import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { useCoarsePointer, useReducedMotion } from './_t2';

export interface BentoCell { id: string; title: string; body?: string; icon?: ReactNode; /** Grid span: 'wide' = 2 columns, 'tall' = 2 rows, 'big' = both. */ size?: 'small' | 'wide' | 'tall' | 'big'; content?: ReactNode }
export interface MagicBentoProps {
  cells?: BentoCell[];
  /** Radius of the pointer spotlight in px. */
  spotlight?: number;
  /** Maximum cell tilt in degrees (0 disables). */
  tilt?: number;
  className?: string;
  style?: CSSProperties;
}

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const DEFAULT: BentoCell[] = [
  { id: 'a', title: 'Live metrics', body: 'Every number updates as it happens.', size: 'big', icon: <svg viewBox="0 0 24 24" {...S}><path d="M3 17l5-6 4 3 8-9" /><path d="M3 21h18" /></svg> },
  { id: 'b', title: 'Teams', body: 'Invite anyone.', icon: <svg viewBox="0 0 24 24" {...S}><circle cx="9" cy="9" r="3" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 6a3 3 0 010 6M21 20c0-2.5-1.5-4.5-3.5-5.4" /></svg> },
  { id: 'd', title: 'Private', body: 'Encrypted at rest.', icon: <svg viewBox="0 0 24 24" {...S}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg> },
  { id: 'c', title: 'Fast search', body: 'Find anything in a keystroke.', size: 'wide', icon: <svg viewBox="0 0 24 24" {...S}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg> },
  { id: 'e', title: 'Automations', body: 'Let routine work run itself.', size: 'wide', icon: <svg viewBox="0 0 24 24" {...S}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg> },
  { id: 'f', title: 'Exports', body: 'CSV, PDF or API.', icon: <svg viewBox="0 0 24 24" {...S}><path d="M12 3v12M7 10l5 5 5-5M4 20h16" /></svg> },
  { id: 'g', title: 'Themes', body: 'Light, dark, yours.', icon: <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="8" /><path d="M12 4v16" /></svg> },
];

/** A bento grid of cards. A soft spotlight follows the pointer across the whole grid, lighting card borders as it passes, and the hovered card tilts toward the pointer. Touch taps move the light. */
export default function MagicBento({ cells = DEFAULT, spotlight = 220, tilt = 5, className, style }: MagicBentoProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = root.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>('.ui-magic-bento-cell').forEach((c) => {
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      c.style.setProperty('--mx', x + 'px');
      c.style.setProperty('--my', y + 'px');
      c.style.setProperty('--lit', '1');
      if (tilt > 0 && !reduced && e.pointerType !== 'touch') {
        const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
        c.style.setProperty('--rx', inside ? (-(y / r.height - 0.5) * 2 * tilt).toFixed(2) + 'deg' : '0deg');
        c.style.setProperty('--ry', inside ? ((x / r.width - 0.5) * 2 * tilt).toFixed(2) + 'deg' : '0deg');
      }
    });
  };
  const leave = () => {
    root.current?.querySelectorAll<HTMLElement>('.ui-magic-bento-cell').forEach((c) => { c.style.setProperty('--lit', '0'); c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
  };
  return (
    <div ref={root} className={`ui-magic-bento-root ${className ?? ''}`} data-coarse={coarse || undefined} style={{ ...style, ['--r' as string]: spotlight + 'px' }}
      onPointerMove={move} onPointerDown={move} onPointerLeave={leave}>
      {cells.map((c) => (
        <article key={c.id} className="ui-magic-bento-cell" data-size={c.size ?? 'small'}>
          <div className="ui-magic-bento-body">
            {c.icon && <span className="ui-magic-bento-icon" aria-hidden="true">{c.icon}</span>}
            <h3>{c.title}</h3>
            {c.content ?? (c.body && <p>{c.body}</p>)}
          </div>
        </article>
      ))}
    </div>
  );
}

export function Demo() {
  return <div className="ui-magic-bento-demo"><MagicBento /></div>;
}
