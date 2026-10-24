'use client';
import { Scene, type PaletteName } from './_d5';

export interface CaptionItem { title: string; caption: string; tag?: string; palette?: PaletteName }
export interface CaptionRevealProps {
  items?: CaptionItem[];
  /** slide: caption rises from the bottom; wipe: it sweeps in from the left. */
  variant?: 'slide' | 'wipe';
  className?: string;
}

const DEFAULTS: CaptionItem[] = [
  { title: 'Pine Ridge', caption: 'Quiet trails, four hours from the city.', tag: 'Hike', palette: 'day' },
  { title: 'Lantern Bay', caption: 'Dusk swims and a late ferry home.', tag: 'Coast', palette: 'dusk' },
];

/** Pictures whose caption slides or wipes in on hover and keyboard focus; always visible on touch screens. */
export default function CaptionReveal({ items = DEFAULTS, variant = 'slide', className }: CaptionRevealProps) {
  return (
    <div className={`ui-caption-reveal-grid ${className ?? ''}`}>
      {items.map((it, i) => (
        <figure key={i} className="ui-caption-reveal-card" data-variant={variant} tabIndex={0}>
          <div className="ui-caption-reveal-pic"><Scene palette={it.palette ?? 'day'} /></div>
          {it.tag && <span className="ui-caption-reveal-tag">{it.tag}</span>}
          <figcaption className="ui-caption-reveal-cap">
            <strong>{it.title}</strong>
            <span>{it.caption}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function Demo() {
  return <CaptionReveal />;
}
