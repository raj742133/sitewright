'use client';
import type { CSSProperties, ReactNode } from 'react';

export interface GlassIconItem {
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  /** CSS colour for the tile; defaults cycle through the brand tokens. */
  color?: string;
}
export interface GlassIconsProps { items?: GlassIconItem[]; className?: string; style?: CSSProperties }

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const ICONS: Record<string, ReactNode> = {
  Docs: <svg viewBox="0 0 24 24" {...S}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></svg>,
  Layers: <svg viewBox="0 0 24 24" {...S}><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></svg>,
  Stats: <svg viewBox="0 0 24 24" {...S}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  Saved: <svg viewBox="0 0 24 24" {...S}><path d="M6 3h12v18l-6-4-6 4z" /></svg>,
  Alerts: <svg viewBox="0 0 24 24" {...S}><path d="M6 17V11a6 6 0 0112 0v6l2 2H4z" /><path d="M10 21h4" /></svg>,
  Setup: <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>,
};
const TONES = ['var(--primary, #2563eb)', 'var(--signal, #f59e0b)', 'color-mix(in srgb, var(--primary, #2563eb) 50%, var(--signal, #f59e0b))'];
const DEFAULT: GlassIconItem[] = Object.keys(ICONS).map((k) => ({ label: k, icon: ICONS[k], href: '#' + k.toLowerCase() }));

/** A row of frosted-glass icon tiles. Each tile sits on a tilted colour card; hover or focus fans the card out and reveals the label. */
export default function GlassIcons({ items = DEFAULT, className, style }: GlassIconsProps) {
  return (
    <ul className={`ui-glass-icons-root ${className ?? ''}`} style={style}>
      {items.map((it, i) => {
        const tone = it.color ?? (TONES[i % TONES.length] as string);
        const inner = (
          <>
            <span className="ui-glass-icons-back" aria-hidden="true" />
            <span className="ui-glass-icons-front" aria-hidden="true">{it.icon}</span>
            <span className="ui-glass-icons-label">{it.label}</span>
          </>
        );
        return (
          <li key={it.label + i}>
            {it.href !== undefined
              ? <a className="ui-glass-icons-tile" href={it.href} style={{ ['--tone' as string]: tone }} onClick={it.onClick}>{inner}</a>
              : <button type="button" className="ui-glass-icons-tile" style={{ ['--tone' as string]: tone }} onClick={it.onClick}>{inner}</button>}
          </li>
        );
      })}
    </ul>
  );
}

export function Demo() {
  return <div className="ui-glass-icons-demo"><GlassIcons /></div>;
}
