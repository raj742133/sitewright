'use client';
import { useEffect, useState, type ButtonHTMLAttributes } from 'react';
import { SWITCH_OFF_DEFAULT_PARAMS, SWITCH_ON_DEFAULT_PARAMS, getGlassEngine } from './_tg-engine';
import { useGlass, type GlassOpticsProps } from './_tg-use';
import { GlassStage } from './_tg-stage';

export interface GlassSwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'role' | 'children'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  /** Accessible name when there is no visible label (use aria-labelledby when there is one). */
  label?: string;
  /** Glass settings for the on state. */
  optics?: GlassOpticsProps;
  /** Glass settings for the off state (defaults are a frostier, darker glass). */
  opticsOff?: GlassOpticsProps;
}

/** An on/off switch: a glass track with a molded glass thumb that refracts what is under it. A real button with role="switch"; Space and Enter toggle it. */
export default function GlassSwitch({ checked, defaultChecked = false, onChange, label = 'Toggle', optics, opticsOff, disabled, className = '', ...props }: GlassSwitchProps) {
  const [inner, setInner] = useState(defaultChecked);
  const on = checked !== undefined ? checked : inner;
  const { rootRef, canvasRef, dataGlass } = useGlass<HTMLButtonElement>({
    defaults: on ? SWITCH_ON_DEFAULT_PARAMS : SWITCH_OFF_DEFAULT_PARAMS,
    optics: on ? optics : opticsOff,
    radius: 'pill',
    setup: (inst, root) => {
      inst.getSwitchThumb = () => {
        const thumb = root.querySelector('.ui-glass-switch-thumb');
        if (!thumb) return null;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const br = root.getBoundingClientRect();
        const tr = thumb.getBoundingClientRect();
        if (tr.width <= 0 || tr.height <= 0) return null;
        return [((tr.left + tr.width / 2) - (br.left + br.width / 2)) * dpr, ((br.top + br.height / 2) - (tr.top + tr.height / 2)) * dpr, (tr.width / 2) * dpr, (tr.height / 2) * dpr];
      };
    },
  });
  // the optics differ per state: copy them in when the state changes, and redraw once (reduced motion draws only on request)
  useEffect(() => {
    getGlassEngine().invalidate();
    const t = window.setTimeout(() => getGlassEngine().invalidate(), 280);
    return () => window.clearTimeout(t);
  }, [on]);
  const toggle = () => {
    if (disabled) return;
    if (checked === undefined) setInner(!on);
    onChange?.(!on);
  };
  return (
    <button ref={rootRef} type="button" role="switch" aria-checked={on} aria-label={props['aria-labelledby'] ? undefined : label} disabled={disabled} onClick={toggle}
      data-glass={dataGlass} className={`ui-glass ui-glass-pane ui-glass-switch ${className}`.trim()} {...props}>
      <canvas ref={canvasRef} className="ui-glass-canvas" aria-hidden="true" />
      <span className="ui-glass-switch-thumb" aria-hidden="true" />
    </button>
  );
}

export function Demo() {
  const [a, setA] = useState(true);
  return (
    <GlassStage>
      <GlassSwitch label="Notifications" checked={a} onChange={setA} optics={{ refraction: 40, thickness: 40, bevelWidth: 10, frost: 20, sheen: 40, rim: 40 }} opticsOff={{ sheen: 30 }} />
    </GlassStage>
  );
}
