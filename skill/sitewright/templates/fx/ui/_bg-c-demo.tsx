import type { ReactNode } from 'react';

/** Shared demo frame for the bg-c backgrounds: a positioned stage plus a solid foreground card (>= 4.5:1 text). */
export function BgcDemo({ children, title, sub }: { children: ReactNode; title: string; sub: string }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)', background: 'var(--surface, #fff)' }}>
      {children}
      <div style={{ position: 'relative', display: 'grid', placeItems: 'center', height: '100%', minHeight: 150, padding: 16, boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', padding: '12px 20px', borderRadius: 'var(--radius, 12px)', background: 'color-mix(in srgb, var(--surface, #fff) 92%, transparent)', border: '1px solid var(--line-strong, var(--line, #d4d4d8))', color: 'var(--ink, #111)', maxWidth: 'min(92%, 420px)', boxSizing: 'border-box' }}>
          <strong style={{ display: 'block', font: '700 clamp(15px, 3vw, 26px)/1.15 var(--font-body, system-ui)' }}>{title}</strong>
          <span style={{ display: 'block', marginTop: 4, font: '500 clamp(12px, 1.7vw, 14px)/1.4 var(--font-body, system-ui)' }}>{sub}</span>
        </div>
      </div>
    </div>
  );
}
