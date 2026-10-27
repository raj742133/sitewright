'use client';
import type { HTMLAttributes, ReactNode } from 'react';
import { BUTTON_DEFAULT_PARAMS } from './_tg-engine';
import { useGlass, type GlassOpticsProps } from './_tg-use';
import { GlassStage } from './_tg-stage';

export interface GlassFxProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  optics?: GlassOpticsProps;
  /** The glass is drawn over the children; raise it if they have their own stacking (default 2). */
  overlayZIndex?: number;
}

/** A wrapper that puts the glass finish on anything: it takes the wrapper's border-radius, draws the rim light and caustics over the content, and follows a switch thumb or tab indicator inside it. */
export default function GlassFx({ children, optics, overlayZIndex = 2, className = '', style, ...props }: GlassFxProps) {
  const { rootRef, canvasRef, dataGlass } = useGlass<HTMLDivElement>({
    defaults: BUTTON_DEFAULT_PARAMS, optics, radius: 'css',
    setup: (inst, root) => {
      inst.getSwitchThumb = () => {
        const thumb = root.querySelector('.ui-glass-switch-thumb, [data-switch-thumb], .ui-glass-tabs-indicator, [data-tabs-indicator]');
        if (!thumb) return null;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const br = root.getBoundingClientRect();
        const tr = thumb.getBoundingClientRect();
        if (tr.width <= 0 || tr.height <= 0) return null;
        return [((tr.left + tr.width / 2) - (br.left + br.width / 2)) * dpr, ((br.top + br.height / 2) - (tr.top + tr.height / 2)) * dpr, (tr.width / 2) * dpr, (tr.height / 2) * dpr];
      };
    },
  });
  return (
    <div ref={rootRef} data-glass={dataGlass} className={`ui-glass ui-glass-pane ui-glass-fx ${className}`.trim()} style={style} {...props}>
      <canvas ref={canvasRef} className="ui-glass-canvas" aria-hidden="true" style={{ zIndex: overlayZIndex }} />
      <div className="ui-glass-fx-in" style={{ zIndex: overlayZIndex + 1 }}>{children}</div>
    </div>
  );
}

export function Demo() {
  return (
    <GlassStage>
      <GlassFx optics={{ refraction: 40, thickness: 40, bevelWidth: 10, frost: 20, sheen: 40, rim: 40 }} style={{ padding: '26px 34px', font: '600 20px/1.2 var(--font-body, system-ui)' }}>Any element, glass</GlassFx>
    </GlassStage>
  );
}
