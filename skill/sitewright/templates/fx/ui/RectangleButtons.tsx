'use client';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

export type RectangleVariant = 'glass' | 'gradient-border' | 'keycap' | 'dotted' | 'technical' | 'arrow-pill' | 'halftone' | 'chip' | 'stamp' | 'sweep';
export const RECTANGLE_VARIANTS: RectangleVariant[] = ['glass', 'gradient-border', 'keycap', 'dotted', 'technical', 'arrow-pill', 'halftone', 'chip', 'stamp', 'sweep'];

interface Common {
  /** One of ten pure-CSS treatments. */
  variant?: RectangleVariant;
  /** `md` is 44px tall, `sm` is 34px (still 44px on touch screens). */
  size?: 'sm' | 'md';
  children?: ReactNode;
}
export type RectangleButtonProps = Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { href?: undefined };
export type RectangleLinkProps = Common & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & { href: string };

const Arrow = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

function Inner({ variant, children }: { variant: RectangleVariant; children: ReactNode }) {
  return (
    <>
      {variant === 'technical' && <span className="ui-rectangle-buttons-ticks" aria-hidden="true"><i /><i /><i /><i /></span>}
      <span className="ui-rectangle-buttons-label">{children}</span>
      {(variant === 'arrow-pill' || variant === 'chip') && <span className="ui-rectangle-buttons-arrow" aria-hidden="true"><Arrow /></span>}
    </>
  );
}

/** A rectangular call to action in one of ten CSS-only treatments. Renders an <a> when `href` is given, otherwise a <button>. Every state (hover, focus-visible, press, disabled) is styled; light and dark follow the host tokens. */
export default function RectangleButton(props: RectangleButtonProps | RectangleLinkProps) {
  const { variant = 'glass', size = 'md', children = 'Get started', className, ...rest } = props;
  const cls = `ui-rectangle-buttons-b ui-rectangle-buttons-${variant} ui-rectangle-buttons-${size} ${className ?? ''}`;
  if ('href' in props && props.href !== undefined) {
    const { href, ...a } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return <a {...a} href={href} className={cls}><Inner variant={variant}>{children}</Inner></a>;
  }
  const b = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return <button type="button" {...b} className={cls}><Inner variant={variant}>{children}</Inner></button>;
}

const LABELS: Record<RectangleVariant, string> = {
  glass: 'Glass', 'gradient-border': 'Gradient', keycap: 'Enter', dotted: 'Dotted', technical: 'Specs', 'arrow-pill': 'Start', halftone: 'Halftone', chip: 'Continue', stamp: 'Stamp', sweep: 'Sweep',
};

export function Demo() {
  return (
    <div className="ui-rectangle-buttons-demo">
      <span className="ui-rectangle-buttons-blob ui-rectangle-buttons-blob-a" aria-hidden="true" />
      <span className="ui-rectangle-buttons-blob ui-rectangle-buttons-blob-b" aria-hidden="true" />
      <div className="ui-rectangle-buttons-grid">
        {RECTANGLE_VARIANTS.map((v) => <RectangleButton key={v} variant={v} size="sm">{LABELS[v]}</RectangleButton>)}
      </div>
    </div>
  );
}
