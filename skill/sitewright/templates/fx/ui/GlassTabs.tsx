'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { TABS_DEFAULT_PARAMS, getGlassEngine } from './_tg-engine';
import { useGlass, type GlassOpticsProps } from './_tg-use';
import { GlassStage } from './_tg-stage';

export interface GlassTabItem { value: string; label: ReactNode; icon?: ReactNode; disabled?: boolean }

export interface GlassTabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: (GlassTabItem | string)[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  optics?: GlassOpticsProps;
}

/** A segmented control: a glass capsule with a molded glass indicator that slides to the chosen tab. Arrow keys, Home and End move between tabs. */
export default function GlassTabs({ items, value, defaultValue, onChange, optics, className = '', ...props }: GlassTabsProps) {
  const list = useMemo<GlassTabItem[]>(() => items.map((i) => (typeof i === 'string' ? { value: i, label: i } : i)), [items]);
  const [inner, setInner] = useState(defaultValue ?? list[0]?.value ?? '');
  const active = value !== undefined ? value : inner;
  const tabs = useRef(new Map<string, HTMLButtonElement>());
  const indRef = useRef<HTMLSpanElement | null>(null);
  const [ind, setInd] = useState({ left: 0, width: 0, ready: false });

  const place = useCallback(() => {
    const el = tabs.current.get(active);
    if (el) setInd((o) => (o.left === el.offsetLeft && o.width === el.offsetWidth && o.ready ? o : { left: el.offsetLeft, width: el.offsetWidth, ready: true }));
  }, [active]);

  const { rootRef, canvasRef, dataGlass } = useGlass<HTMLDivElement>({
    defaults: TABS_DEFAULT_PARAMS, optics, radius: 'pill', onResize: place,
    setup: (inst, root) => {
      inst.getSwitchThumb = () => {
        const ind = root.querySelector('.ui-glass-tabs-indicator');
        if (!ind) return null;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const br = root.getBoundingClientRect();
        const tr = ind.getBoundingClientRect();
        if (tr.width <= 0 || tr.height <= 0) return null;
        return [((tr.left + tr.width / 2) - (br.left + br.width / 2)) * dpr, ((br.top + br.height / 2) - (tr.top + tr.height / 2)) * dpr, (tr.width / 2) * dpr, (tr.height / 2) * dpr];
      };
    },
  });
  useEffect(() => {
    place();
    getGlassEngine().invalidate();
    const t = window.setTimeout(() => getGlassEngine().invalidate(), 280);
    return () => window.clearTimeout(t);
  }, [place, list]);

  const select = (v: string) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
  };
  const onKey = (e: KeyboardEvent) => {
    const ok = list.filter((i) => !i.disabled);
    if (ok.length < 2) return;
    const at = ok.findIndex((i) => i.value === active);
    let next: GlassTabItem | undefined;
    if (e.key === 'ArrowRight') next = ok[(at + 1) % ok.length];
    else if (e.key === 'ArrowLeft') next = ok[(at - 1 + ok.length) % ok.length];
    else if (e.key === 'Home') next = ok[0];
    else if (e.key === 'End') next = ok[ok.length - 1];
    if (!next) return;
    e.preventDefault();
    select(next.value);
    tabs.current.get(next.value)?.focus();
  };

  return (
    <div ref={rootRef} role="tablist" aria-label={props['aria-label'] ?? 'Tabs'} onKeyDown={onKey} data-glass={dataGlass} className={`ui-glass ui-glass-pane ui-glass-tabs ${className}`.trim()} {...props}>
      <canvas ref={canvasRef} className="ui-glass-canvas" aria-hidden="true" />
      <span ref={indRef} className="ui-glass-tabs-indicator" aria-hidden="true" style={{ transform: `translateX(${ind.left}px)`, width: ind.width, opacity: ind.ready ? 1 : 0 }} />
      {list.map((it) => {
        const on = it.value === active;
        return (
          <button key={it.value} type="button" role="tab" aria-selected={on} disabled={it.disabled} tabIndex={on ? 0 : -1} className="ui-glass-tab"
            ref={(el) => { if (el) tabs.current.set(it.value, el); else tabs.current.delete(it.value); }} onClick={() => select(it.value)}>
            {it.icon}<span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Demo() {
  return (
    <GlassStage>
      <GlassTabs aria-label="Product sections" items={['Overview', 'Specs', 'Pricing']} optics={{ refraction: 40, thickness: 40, bevelWidth: 10, frost: 20, sheen: 40, rim: 40 }} />
    </GlassStage>
  );
}
