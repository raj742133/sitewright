'use client';
import type { CSSProperties } from 'react';
import { useCanvas2D } from './_bg-c-canvas';
import { sparkBadge, type BadgeText } from './_tu-bg-spark';

export interface SparkBadgeProps {
  /** Organisation line (default "Northfield Guild"). */
  org?: string;
  /** Holder name (default "Ada Marlowe"). */
  name?: string;
  /** Role / number line (default "Member No. 0427"). */
  role?: string;
  /** Ember amount multiplier, 0 to 3 (default 1). */
  embers?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * A credential badge made of particles (Canvas 2D). The badge is rasterised from its text, sampled into
 * grains that spring back to their place, scatter away from the pointer (read from the parent), burst on
 * click or tap, and shed embers on curl-noise currents. A light sweep and an occasional self-burst keep it
 * alive on touch screens. Fills the positioned parent, aria-hidden, pointer-events none. Reduced motion:
 * the assembled badge with a few resting embers.
 */
export default function SparkBadge({ org = 'Northfield Guild', name = 'Ada Marlowe', role = 'Member No. 0427', embers = 1, className, style }: SparkBadgeProps) {
  const t: BadgeText = { org, name, role };
  const { wrapRef, canvasRef } = useCanvas2D((f) => sparkBadge(f, t, Math.max(0, Math.min(3, embers))), { fps: 60, warm: 140 });
  return (
    <div ref={wrapRef} className={'ui-spark-badge' + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-spark-badge-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)', background: 'var(--surface, #fff)' }}>
      <SparkBadge />
      <p style={{ position: 'absolute', left: 12, right: 12, bottom: 10, margin: 0, textAlign: 'center', font: '600 clamp(11px, 1.6vw, 13px)/1.3 var(--font-body, system-ui)', color: 'var(--ink, #111)' }}>
        <span style={{ padding: '3px 10px', borderRadius: 999, background: 'color-mix(in srgb, var(--surface, #fff) 90%, transparent)', border: '1px solid var(--line, #d4d4d8)' }}>Move the pointer through the badge, or click it.</span>
      </p>
    </div>
  );
}
