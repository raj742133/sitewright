'use client';
import { useCallback, useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Icon, Stage, useControlled, useDismiss, useProximity, useReducedMotion, useRoving } from './_menus-kit';

export interface TopDockItem { id: string; label: string; icon?: string; href?: string }
export interface AnimatedTopDockProps {
  items?: TopDockItem[];
  /** Layout fit: a centred floating icon dock, a full-width modern bar, or a chunky pixel / retro bar. */
  variant?: 'dock' | 'bar' | 'retro';
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** Wordmark next to the mark (the mark is a plain geometric glyph). */
  brand?: string;
  /** Call-to-action; omit the label to hide it. */
  cta?: { label: string; href?: string };
  label?: string;
  className?: string;
  style?: CSSProperties;
}
const ITEMS: TopDockItem[] = [
  { id: 'home', label: 'Home', icon: 'home' }, { id: 'work', label: 'Work', icon: 'folder' }, { id: 'services', label: 'Services', icon: 'bolt' },
  { id: 'journal', label: 'Journal', icon: 'chat' }, { id: 'about', label: 'About', icon: 'user' },
];
const FIT = { dock: { peak: 1.6, radius: 110 }, bar: { peak: 1.14, radius: 120 }, retro: { peak: 1.25, radius: 110 } };

/** A top navigation with a proximity spring: items swell toward the pointer (or keyboard focus) on a damped spring and push neighbours aside, in three fits.
 *  `dock` is a centred glass icon dock whose icons hang and grow downward; `bar` is a full-width bar with a gliding highlight; `retro` quantises everything
 *  to chunky pixel steps with a dithered backdrop. One tab stop with arrow-key roving; bar and retro fold into a menu button (aria-expanded, Escape, focus return)
 *  when their own box is narrower than ~560px. Touch skips the magnification. Reduced motion jumps straight to the end state. */
export default function AnimatedTopDock({ items = ITEMS, variant = 'dock', value, defaultValue, onChange, brand = 'Studio', cta = { label: 'Get started' }, label = 'Primary', className = '', style }: AnimatedTopDockProps) {
  const [active, setActive] = useControlled<string>(value, defaultValue ?? items[0]?.id ?? '', onChange);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const uid = useId();
  const root = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLUListElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const glow = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const rov = useRoving(items.length, 'horizontal');
  const close = useCallback((ret: boolean) => { setOpen(false); if (ret) btn.current?.focus(); }, []);
  useDismiss(open, close, root);
  const fit = FIT[variant];
  const prox = useProximity(row, {
    items: els, radius: fit.radius, peak: fit.peak, instant: reduced, stiffness: variant === 'retro' ? 420 : 240, damping: variant === 'retro' ? 34 : 19,
    apply: (i, s, dx) => {
      const el = els.current[i]; if (!el) return;
      const q = variant === 'retro' ? Math.round(s * 8) / 8 : s;
      el.style.setProperty('--s', q.toFixed(3));
      el.style.setProperty('--dx', (variant === 'retro' ? Math.round(dx / 2) * 2 : dx).toFixed(1) + 'px');
      el.style.setProperty('--lift', (variant === 'dock' ? 0 : Math.max(0, q - 1) * (variant === 'bar' ? 14 : 24)).toFixed(1) + 'px');
    },
  });
  const aim = (i: number | null) => {
    const g = glow.current, el = i == null ? null : els.current[i];
    if (!g) return;
    if (!el) { g.style.opacity = '0'; return; }
    g.style.opacity = '1'; g.style.width = el.offsetWidth + 'px'; g.style.transform = `translateX(${el.offsetLeft}px)`;
  };
  const move = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || !row.current) return;
    prox.point(e.clientX - row.current.getBoundingClientRect().left);
    const hit = els.current.findIndex((el) => el && e.clientX >= el.getBoundingClientRect().left && e.clientX <= el.getBoundingClientRect().right);
    aim(hit < 0 ? null : hit);
  };
  const pick = (it: TopDockItem, e: { preventDefault(): void }, menu: boolean) => { if (!it.href || it.href === '#') e.preventDefault(); setActive(it.id); if (menu) close(true); };

  return (
    <div ref={root} className={`ui-animated-top-dock-root is-${variant}${open ? ' is-open' : ''} ${className}`} style={style}>
      <div className="ui-animated-top-dock-bar">
        <a className="ui-animated-top-dock-brand" href="#" onClick={(e) => e.preventDefault()} aria-label={`${brand} home`}>
          <span className="ui-animated-top-dock-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="ui-animated-top-dock-name">{brand}</span>
        </a>
        <nav className="ui-animated-top-dock-nav" aria-label={label}>
          <ul ref={row} className="ui-animated-top-dock-row" onPointerMove={move} onPointerLeave={() => { prox.point(null); aim(null); }} onKeyDown={rov.onKeyDown}>
            <span ref={glow} className="ui-animated-top-dock-glow" aria-hidden="true" />
            {items.map((it, i) => (
              <li key={it.id} ref={(el) => { els.current[i] = el; }} className="ui-animated-top-dock-cell">
                <a {...rov.item(i)} className={`ui-animated-top-dock-link${active === it.id ? ' is-active' : ''}`} href={it.href ?? '#'} aria-current={active === it.id ? 'page' : undefined}
                  aria-label={variant === 'dock' ? it.label : undefined} onClick={(e) => pick(it, e, false)}
                  onFocus={(e) => { rov.item(i).onFocus(); if (e.currentTarget.matches(':focus-visible')) { prox.focus(i); aim(i); } }} onBlur={() => { prox.focus(null); aim(null); }}>
                  {variant === 'dock' ? <Icon name={it.icon ?? 'star'} size={20} /> : <span className="ui-animated-top-dock-text">{it.label}</span>}
                </a>
                {variant === 'dock' ? <span className="ui-animated-top-dock-tip" aria-hidden="true">{it.label}</span> : null}
              </li>
            ))}
          </ul>
        </nav>
        {cta?.label ? <a className="ui-animated-top-dock-cta" href={cta.href ?? '#'} onClick={(e) => { if (!cta.href) e.preventDefault(); }}>{cta.label}</a> : <span />}
        <button ref={btn} type="button" className="ui-animated-top-dock-burger" aria-expanded={open} aria-controls={uid + 'm'} aria-label="Menu" onClick={() => setOpen(!open)}>
          <span aria-hidden="true"><i /><i /><i /></span>
        </button>
      </div>
      <ul id={uid + 'm'} className="ui-animated-top-dock-drop" aria-label={label + ' (menu)'} {...(!open ? { inert: true } : {})}>
        {items.map((it) => (
          <li key={it.id}><a className={`ui-animated-top-dock-dlink${active === it.id ? ' is-active' : ''}`} href={it.href ?? '#'} aria-current={active === it.id ? 'page' : undefined} onClick={(e) => pick(it, e, true)}>{it.label}</a></li>
        ))}
      </ul>
    </div>
  );
}

export function Demo() {
  const [v, setV] = useState<'dock' | 'bar' | 'retro'>('dock');
  return (
    <Stage align="top">
      <div className="ui-animated-top-dock-demo">
        <AnimatedTopDock key={v} variant={v} />
        <div className="ui-animated-top-dock-pick" role="group" aria-label="Fit">
          {(['dock', 'bar', 'retro'] as const).map((k) => <button key={k} type="button" aria-pressed={v === k} className={v === k ? 'on' : ''} onClick={() => setV(k)}>{k}</button>)}
        </div>
      </div>
    </Stage>
  );
}
