'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Scene } from './_cards-art';
import { useSeen } from './_cards-use';

export interface BounceCardItem {
  id: string;
  title: string;
  subtitle?: string;
  /** Any visual for the card face; defaults to a drawn scene. */
  art?: ReactNode;
}

export interface BounceCardsProps {
  items?: BounceCardItem[];
  /** Fan rotation per card, in degrees. */
  tilt?: number;
  /** Delay between cards on the entrance, ms. */
  stagger?: number;
  onSelect?: (id: string) => void;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULTS: BounceCardItem[] = [
  { id: 'one', title: 'Sunrise', subtitle: 'Dune light' },
  { id: 'two', title: 'Orbit', subtitle: 'Ringed world' },
  { id: 'three', title: 'Ridge', subtitle: 'High peaks' },
  { id: 'four', title: 'Swell', subtitle: 'Low tide' },
  { id: 'five', title: 'Grid', subtitle: 'Night blocks' },
];

/** A hand of cards that bounces into a fan when scrolled into view. Hovering or focusing one lifts it and nudges its neighbours aside; clicking (or Enter) gives it a hop and reports the choice. */
export default function BounceCards({ items = DEFAULTS, tilt = 6, stagger = 90, onSelect, label = 'Cards', className, style }: BounceCardsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useSeen(ref);
  const [hot, setHot] = useState(-1);
  const [settled, setSettled] = useState(false);
  const [hop, setHop] = useState<string | null>(null);
  useEffect(() => {
    if (!seen) return;
    const t = window.setTimeout(() => setSettled(true), 900 + items.length * stagger);
    return () => window.clearTimeout(t);
  }, [seen, items.length, stagger]);
  useEffect(() => {
    if (!hop) return;
    const t = window.setTimeout(() => setHop(null), 520);
    return () => window.clearTimeout(t);
  }, [hop]);
  const mid = (items.length - 1) / 2;
  return (
    <div ref={ref} className={`ui-bounce-cards-root ${className ?? ''}`} style={style} role="group" aria-label={label} data-seen={seen ? 'true' : 'false'} data-settled={settled ? 'true' : 'false'}
      onPointerLeave={() => setHot(-1)}>
      <div className="ui-bounce-cards-fan">
        {items.map((it, i) => {
          const k = i - mid;
          const push = hot < 0 || hot === i ? 0 : Math.sign(i - hot) * 1;
          return (
            <button key={it.id} type="button" className="ui-bounce-cards-card" data-hot={hot === i ? 'true' : 'false'} data-hop={hop === it.id ? 'true' : 'false'}
              style={{ '--k': k, '--rot': tilt + 'deg', '--push': push, '--d': i * stagger + 'ms', zIndex: hot === i ? 20 : 10 - Math.abs(Math.round(k)) } as CSSProperties}
              onPointerEnter={() => setHot(i)} onFocus={() => setHot(i)} onBlur={() => setHot(-1)}
              onClick={() => { setHop(it.id); onSelect?.(it.id); }}>
              <span className="ui-bounce-cards-art">{it.art ?? <Scene index={i} />}</span>
              <span className="ui-bounce-cards-cap"><strong>{it.title}</strong>{it.subtitle ? <small>{it.subtitle}</small> : null}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Demo() {
  const [last, setLast] = useState('');
  return (
    <div className="ui-bounce-cards-demo">
      <BounceCards items={DEFAULTS.slice(0, 4)} onSelect={(id) => setLast(id)} />
      <p className="ui-bounce-cards-note" aria-live="polite">{last ? `Picked: ${last}` : 'Hover, focus or tap a card'}</p>
    </div>
  );
}
