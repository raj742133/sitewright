'use client';
import { Fragment, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import GlassWord, { type GlassWordProps } from './GlassWord';
import { GlassStage } from './_tg-stage';

export interface GlassHeadingProps extends Omit<HTMLAttributes<HTMLHeadingElement>, 'title'> {
  /** The tag: h2 by default so a page keeps one h1 of its own. */
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'div';
  size?: 'sm' | 'md' | 'lg' | 'hero';
  align?: 'left' | 'center' | 'right';
  /** The heading text; used with `highlight`. */
  title?: string;
  /** Word(s) inside `title` drawn as liquid glass. */
  highlight?: string | string[];
  /** Words the highlighted word cycles through when clicked. */
  highlightCycle?: string[];
  subtitle?: ReactNode;
  badge?: ReactNode;
  /** Props for the glass word (optics, ...). */
  wordProps?: Partial<GlassWordProps>;
  children?: ReactNode;
}

const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Display typography with glass lettering: give a title and the word(s) to highlight, or compose your own children with <GlassWord>. */
export default function GlassHeading({ level = 'h2', size = 'hero', align = 'center', title, highlight, highlightCycle, subtitle, badge, wordProps, className = '', children, ...props }: GlassHeadingProps) {
  const Tag = level as ElementType;
  const targets = [...(Array.isArray(highlight) ? highlight : highlight ? [highlight] : [])];
  if (highlightCycle?.length && !targets.includes(highlightCycle[0]!)) targets.push(highlightCycle[0]!);
  let body: ReactNode = title ?? null;
  if (title && targets.length) {
    const parts = title.split(new RegExp(`(${targets.map(esc).join('|')})`, 'gi'));
    body = parts.map((part, i) =>
      targets.some((t) => t.toLowerCase() === part.toLowerCase())
        ? <GlassWord key={i} cycleWords={highlightCycle?.length ? highlightCycle : undefined} {...wordProps}>{part}</GlassWord>
        : <Fragment key={i}>{part}</Fragment>);
  }
  const items = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  return (
    <div data-size={size} className={`ui-glass ui-glass-heading ${className}`.trim()} style={{ alignItems: items, textAlign: align }}>
      {badge && <div className="ui-glass-heading-badge">{badge}</div>}
      <Tag className="ui-glass-heading-title" style={{ textAlign: align }} {...props}>{children ?? body}</Tag>
      {subtitle && <p className="ui-glass-heading-sub" style={{ textAlign: align }}>{subtitle}</p>}
    </div>
  );
}

export function Demo() {
  return (
    <GlassStage>
      <GlassHeading title="Engineered for Tactile precision" highlight="Tactile" size="md" wordProps={{ optics: { refraction: 40, thickness: 40, bevelWidth: 10, frost: 20, sheen: 40, rim: 40 } }} />
    </GlassStage>
  );
}
