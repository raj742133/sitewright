'use client';
import { useCallback, useId, useRef, type CSSProperties } from 'react';
import { Icon, Stage, useControlled, useDismiss } from './_menus-kit';

export interface CardNavLink { label: string; href?: string }
export interface CardNavCard { title: string; blurb?: string; links: CardNavLink[] }
export interface CardNavProps {
  /** Wordmark text shown at the left of the bar. */
  brand?: string;
  cards?: CardNavCard[];
  /** Call-to-action in the bar. Omit label to hide it. */
  cta?: { label: string; href?: string };
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  style?: CSSProperties;
}
const CARDS: CardNavCard[] = [
  { title: 'Product', blurb: 'What you can build.', links: [{ label: 'Overview' }, { label: 'Templates' }, { label: 'Pricing' }] },
  { title: 'Learn', blurb: 'Guides and answers.', links: [{ label: 'Documentation' }, { label: 'Tutorials' }, { label: 'Community' }] },
  { title: 'Company', blurb: 'Who we are.', links: [{ label: 'About' }, { label: 'Careers' }, { label: 'Contact' }] },
];

/** A top bar (brand, menu button, call to action) that grows downward into a row of link cards. The expanded panel pushes within the component box,
 *  the button has aria-expanded, Escape closes and returns focus, and the cards' links leave the tab order while closed. */
export default function CardNav({ brand = 'Studio', cards = CARDS, cta = { label: 'Get started' }, open, defaultOpen = false, onOpenChange, className = '', style }: CardNavProps) {
  const [isOpen, setOpen] = useControlled<boolean>(open, defaultOpen, onOpenChange);
  const id = useId();
  const root = useRef<HTMLElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const close = useCallback((ret: boolean) => { setOpen(false); if (ret) btn.current?.focus(); }, [setOpen]);
  useDismiss(isOpen, close, root);
  return (
    <header className={`ui-card-nav-root ${isOpen ? 'is-open' : ''} ${className}`} style={style}>
      <nav ref={root} className="ui-card-nav-shell" aria-label="Main">
        <div className="ui-card-nav-bar">
          <button ref={btn} type="button" className="ui-card-nav-btn" aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(!isOpen)}>
            <span className="ui-card-nav-lines" aria-hidden="true"><i /><i /></span>
            <span className="ui-card-nav-btn-text">{isOpen ? 'Close' : 'Menu'}</span>
          </button>
          <span className="ui-card-nav-brand"><Icon name="bolt" size={18} />{brand}</span>
          {cta?.label ? <a className="ui-card-nav-cta" href={cta.href ?? '#'} onClick={(e) => { if (!cta.href) e.preventDefault(); }}>{cta.label}</a> : <span />}
        </div>
        <div className="ui-card-nav-drawer" id={id} aria-hidden={!isOpen} {...(!isOpen ? { inert: true } : {})}>
          <ul className="ui-card-nav-cards">
            {cards.map((c, i) => (
              <li key={c.title} className="ui-card-nav-card" style={{ ['--i' as string]: i, ['--tone' as string]: i % 3 === 0 ? 'var(--primary, #2563eb)' : i % 3 === 1 ? 'var(--signal, #f59e0b)' : 'var(--ink, #18181b)' }}>
                <h3 className="ui-card-nav-title">{c.title}</h3>
                {c.blurb ? <p className="ui-card-nav-blurb">{c.blurb}</p> : null}
                <ul className="ui-card-nav-links">
                  {c.links.map((l) => (
                    <li key={l.label}><a className="ui-card-nav-link" href={l.href ?? '#'} onClick={(e) => { if (!l.href) e.preventDefault(); close(true); }}><Icon name="arrow" size={14} />{l.label}</a></li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}

export function Demo() {
  return <Stage align="top"><CardNav /></Stage>;
}
