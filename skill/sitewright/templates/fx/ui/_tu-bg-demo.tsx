'use client';
import { useState, type ReactNode } from 'react';
import { useCoarsePointer } from './_t2';

/** Demo frame with a foreground card (solid enough for >= 4.5:1 text) and an optional variant picker. */
export function TuDemo<V extends string>({ title, sub, variants, labels, initial, dock, children }: {
  title: string; sub: string; /** `bottom` keeps the card out of the middle so the scene stays visible */ dock?: 'center' | 'bottom'; variants?: readonly V[]; labels?: Record<V, string>; initial?: V; children: (v: V | undefined) => ReactNode;
}) {
  const [v, setV] = useState<V | undefined>(initial ?? variants?.[0]);
  const coarse = useCoarsePointer();
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)', background: 'var(--surface, #fff)' }}>
      {children(v)}
      <div style={{ position: 'relative', display: 'grid', placeItems: 'center', alignContent: dock === 'bottom' ? 'end' : 'center', gap: 8, height: '100%', minHeight: 150, padding: 12, boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', padding: dock === 'bottom' ? '6px 14px' : '10px 18px', borderRadius: 'var(--radius, 12px)', background: 'color-mix(in srgb, var(--surface, #fff) 92%, transparent)', border: '1px solid var(--line-strong, var(--line, #d4d4d8))', color: 'var(--ink, #111)', maxWidth: 'min(92%, 420px)', boxSizing: 'border-box' }}>
          <strong style={{ display: 'block', font: '700 clamp(15px, 3vw, 24px)/1.15 var(--font-body, system-ui)' }}>{title}</strong>
          <span style={{ display: 'block', marginTop: 4, font: '500 clamp(12px, 1.7vw, 14px)/1.4 var(--font-body, system-ui)' }}>{sub}</span>
        </div>
        {variants && variants.length > 1 ? (
          <div role="group" aria-label="Variant" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4, padding: 4, borderRadius: 999, background: 'color-mix(in srgb, var(--surface, #fff) 92%, transparent)', border: '1px solid var(--line, #d4d4d8)' }}>
            {variants.map((x) => (
              <button key={x} type="button" aria-pressed={v === x} onClick={() => setV(x)}
                style={{ minHeight: coarse ? 44 : 28, minWidth: coarse ? 44 : 28, padding: '0 10px', borderRadius: 999, border: 0, cursor: 'pointer', font: '600 12px var(--font-body, system-ui)', background: v === x ? 'var(--primary, #2563eb)' : 'transparent', color: v === x ? 'var(--on-primary, #fff)' : 'var(--ink, #111)' }}>
                {labels ? labels[x] : x}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
