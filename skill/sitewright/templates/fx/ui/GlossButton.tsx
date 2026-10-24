'use client';

import { useRef, useState, useEffect, type ReactNode, type PointerEvent } from 'react';

export interface GlossButtonProps {
  children?: ReactNode;
  variant?: 'dark' | 'accent';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

export default function GlossButton({
  children = 'Continue',
  variant = 'dark',
  onClick,
  disabled = false,
  loading = false,
  type = 'button',
  className = '',
}: GlossButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!fine || !el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / Math.max(1, r.width)));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / Math.max(1, r.height)));
    el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.removeProperty('--gx');
    el.style.removeProperty('--gy');
  };

  const inactive = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      className={`ui-gloss-button ui-gloss-button-${variant} ${className}`.trim()}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={inactive || undefined}
      onClick={inactive ? undefined : onClick}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <span className="ui-gloss-button-sheen" aria-hidden="true" />
      <span className="ui-gloss-button-band" aria-hidden="true" />
      <span className="ui-gloss-button-label">
        {loading && <span className="ui-gloss-button-spin" role="status" aria-label="Loading" />}
        <span>{children}</span>
      </span>
    </button>
  );
}

export function Demo() {
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const go = () => {
    setBusy(true);
    timer.current = setTimeout(() => setBusy(false), 1800);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', padding: 8 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <GlossButton>Dark</GlossButton>
        <GlossButton variant="accent">Accent</GlossButton>
      </div>
      <GlossButton variant="accent" loading={busy} onClick={go}>
        {busy ? 'Saving' : 'Save changes'}
      </GlossButton>
    </div>
  );
}
