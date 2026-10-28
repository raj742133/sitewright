'use client';
import { useRef, type CSSProperties, type ElementType, type PointerEvent, type ReactNode } from 'react';
import { setPointerVars } from './_cards-use';

export interface BorderGlowProps {
  children?: ReactNode;
  /** Element to render (default 'div'; use 'a' or 'article' as needed). */
  as?: ElementType;
  /** Glow radius around the pointer in px. */
  spread?: number;
  /** Border thickness in px. */
  thickness?: number;
  /** Corner radius in px (default: the theme radius). */
  radius?: number;
  /** Strength of the soft halo outside the border, 0 to 1. */
  halo?: number;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
}

/** A surface with a glowing border. The glow follows the pointer along the edge (and leaks a soft halo); when nothing points at it a slow light circles the border. Keyboard focus lights the whole edge. */
export default function BorderGlow({ children, as, spread = 220, thickness = 1.5, radius, halo = 0.5, className, style, ...rest }: BorderGlowProps) {
  const Tag = (as ?? 'div') as ElementType;
  const ref = useRef<HTMLElement>(null);
  const onMove = (e: PointerEvent<HTMLElement>) => { if (ref.current) setPointerVars(ref.current, e.clientX, e.clientY); };
  const vars = { '--bg-spread': spread + 'px', '--bg-t': thickness + 'px', '--bg-halo': halo, ...(radius !== undefined ? { '--bg-r': radius + 'px' } : null), ...style } as CSSProperties;
  return (
    <Tag ref={ref} className={`ui-border-glow-root ${className ?? ''}`} style={vars} onPointerMove={onMove} onPointerEnter={onMove} {...rest}>
      <span className="ui-border-glow-halo" aria-hidden="true" />
      <span className="ui-border-glow-edge ui-border-glow-idle" aria-hidden="true" />
      <span className="ui-border-glow-edge ui-border-glow-spot" aria-hidden="true" />
      <div className="ui-border-glow-body">{children}</div>
    </Tag>
  );
}

export function Demo() {
  return (
    <div className="ui-border-glow-demo">
      <BorderGlow tabIndex={0} aria-label="Studio plan card">
        <span className="ui-border-glow-kicker">Studio plan</span>
        <strong className="ui-border-glow-price">$24<small>/mo</small></strong>
        <p className="ui-border-glow-copy">Unlimited projects, shared libraries and priority export.</p>
        <ul className="ui-border-glow-list"><li>10 seats</li><li>Version history</li><li>Custom domains</li></ul>
      </BorderGlow>
    </div>
  );
}
