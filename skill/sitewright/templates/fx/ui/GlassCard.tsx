'use client';
import type { HTMLAttributes, ReactNode } from 'react';
import { CARD_DEFAULT_PARAMS } from './_tg-engine';
import { attachTilt, useGlass, type GlassOpticsProps, type GlassVariant } from './_tg-use';
import { GlassStage } from './_tg-stage';

export interface GlassCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Replaces the card face. */
  children?: ReactNode;
  cardNumber?: string;
  cardHolder?: string;
  validThru?: string;
  bankName?: string;
  tier?: string;
  showContactless?: boolean;
  /** Tilt toward the pointer (not with reduced motion). */
  tilt3d?: boolean;
  /** Maximum tilt in degrees. */
  maxTilt?: number;
  /** 'optical' (default) bends what is behind it with WebGL2; 'frosted' is pure CSS frosted glass: blur, grain and a soft pointer-following sheen. */
  variant?: GlassVariant;
  optics?: GlassOpticsProps;
}

/** A payment card in liquid glass (ISO ID-1 proportions, always a dark face so the text keeps its contrast). Tilts toward the pointer and the glass refracts the tilted surface. */
export default function GlassCard({ children, cardNumber = '••••  ••••  ••••  8042', cardHolder = 'AMELIA ROSS', validThru = '08 / 29', bankName = 'NORTHWIND', tier = '', showContactless = true, tilt3d = true, maxTilt = 12, variant, optics, className = '', ...props }: GlassCardProps) {
  const { rootRef, canvasRef, dataGlass } = useGlass<HTMLDivElement>({
    defaults: CARD_DEFAULT_PARAMS, optics, variant, radius: 'css', deps: [tilt3d, maxTilt],
    onResize: (root) => root.style.setProperty('--s', Math.min(1, root.offsetWidth / 444).toFixed(4)),
    setup: (inst, root) => (tilt3d ? attachTilt(root, inst, { max: maxTilt, kx: 1.08, ky: 0.92, scale: 1.03, easeIn: 0.12, easeOut: 0.08 }) : undefined),
  });
  const groups = cardNumber.trim().split(/\s+/);
  const last4 = (cardNumber.match(/\d{4}\s*$/) ?? [''])[0].trim();
  return (
    <div ref={rootRef} role="group" aria-label={`Payment card${last4 ? ` ending ${last4}` : ''}, ${bankName}`} data-glass={dataGlass} className={`ui-glass ui-glass-dark ui-glass-pane ui-glass-card ${className}`.trim()} {...props}>
      <canvas ref={canvasRef} className="ui-glass-canvas" aria-hidden="true" />
      <div className="ui-glass-card-inner">
        {children ?? (
          <>
            <div className="ui-glass-card-top">
              {showContactless ? (
                <svg className="ui-glass-card-contactless" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" role="img" aria-label="Contactless payment">
                  <path d="M7 7a7 7 0 0 1 0 10" /><path d="M11 4a11 11 0 0 1 0 16" /><path d="M15 1a15 15 0 0 1 0 22" />
                </svg>
              ) : <span />}
              <div className="ui-glass-card-brand">
                <span className="ui-glass-card-bank">{bankName}</span>
                {tier && <span className="ui-glass-card-tier">{tier}</span>}
              </div>
            </div>
            <div className="ui-glass-card-number">{groups.map((g, i) => <span key={i}>{g}</span>)}</div>
            <div className="ui-glass-card-bottom">
              <span className="ui-glass-card-value">{cardHolder}</span>
              <span className="ui-glass-card-value">{validThru}</span>
              <span className="ui-glass-card-net" aria-hidden="true"><i /><i /></span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <GlassStage>
      <GlassCard tier="Platinum" optics={{ refraction: 40, thickness: 40, bevelWidth: 10, frost: 20, sheen: 40, rim: 40 }} style={{ width: 'min(100%, 340px)' }} />
    </GlassStage>
  );
}
