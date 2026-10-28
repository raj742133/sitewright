'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * Hosts one component demo. Most demos size themselves, but a demo whose root is a plain block holding only absolutely positioned layers
 * (a canvas, a stage) has no intrinsic width in the centred grid and collapses to nothing. When the first child is collapsed this marks the
 * frame `data-fill`, which makes that root fill the frame. It only ever turns on, so it cannot flip back and forth.
 */
export function DemoFrame({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (el.dataset.fill) return;
      const c = el.firstElementChild as HTMLElement | null;
      if (!c) return;
      const r = c.getBoundingClientRect();
      if (r.width < 48 || r.height < 24) el.dataset.fill = '1';
    };
    check();
    const t = window.setTimeout(check, 350);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
    ro?.observe(el);
    return () => { window.clearTimeout(t); ro?.disconnect(); };
  }, []);
  return <span ref={ref} className={className}>{children}</span>;
}
