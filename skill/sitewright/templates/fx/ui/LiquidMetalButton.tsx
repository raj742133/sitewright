'use client';
import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type FocusEvent, type PointerEvent, type ReactNode } from 'react';
import { fullscreenScene, useGL } from './_t1';
import { LIQUID_FRAG } from './_tu-liquid-metal';
import { damp } from './_tu-ui-kit';

export interface LiquidMetalButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** `pill` is a wide label button, `orb` a round icon button. */
  shape?: 'pill' | 'orb';
  /** Label text (pill) or an extra visually-hidden name (orb). */
  children?: ReactNode;
  /** Glyph drawn on the face. Orbs default to `play`, pills to none. */
  icon?: 'none' | 'play' | 'plus';
  /** `mono` is pure chrome, `tint` washes the metal with the host primary colour. */
  tone?: 'mono' | 'tint';
  /** Height of the pill / diameter of the orb in px (default 56 / 88). */
  size?: number;
  /** Strength of the rainbow edge dispersion, 0 to 1 (default 0.7). */
  dispersion?: number;
}

/** A button drawn as liquid chrome in a WebGL shader: a bevelled rim that reflects a moving studio environment, a dark liquid face, hover bloom and a ripple on click. Falls back to a CSS chrome gradient without WebGL; reduced motion freezes it on one frame. */
export default function LiquidMetalButton({ shape = 'pill', children, icon, tone = 'mono', size, dispersion = 0.7, className, style, type = 'button', onPointerEnter, onPointerLeave, onPointerDown, onPointerUp, onPointerCancel, onFocus, onBlur, onClick, disabled, ...rest }: LiquidMetalButtonProps) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [press, setPress] = useState(false);
  const live = useRef({ h: false, p: false, tone, disp: dispersion, shape, rip: false, rx: 0.5, ry: 0.5 });
  live.current.h = (hover || focus) && !disabled; live.current.p = press && !disabled; live.current.tone = tone; live.current.disp = dispersion; live.current.shape = shape;
  const glyph = icon ?? (shape === 'orb' ? 'play' : 'none');
  const { wrapRef, canvasRef, status, invalidate } = useGL((env) => {
    const s = { h: 0, p: 0, px: 0.5, py: 0.5, rt: -99, amt: 0 };
    return fullscreenScene(env.gl, LIQUID_FRAG, (prog) => (t, dt, e) => {
      const L = live.current, gl = e.gl, snap = e.reduced ? 0 : dt;
      s.h = damp(s.h, L.h ? 1 : 0, snap, 6);
      s.p = damp(s.p, L.p ? 1 : 0, snap, 18);
      const hot = e.ptr.inside && !e.coarse;
      s.px = damp(s.px, hot ? e.ptr.x : 0.5, snap, 8);
      s.py = damp(s.py, hot ? e.ptr.y : 0.5, snap, 8);
      s.amt = damp(s.amt, L.tone === 'tint' ? 0.55 : 0, snap, 8);
      if (L.rip) { L.rip = false; s.rt = e.reduced ? -99 : t; }
      gl.uniform1f(prog.u('uShape'), L.shape === 'orb' ? 1 : 0);
      gl.uniform1f(prog.u('uH'), s.h); gl.uniform1f(prog.u('uP'), s.p);
      gl.uniform1f(prog.u('uRipT'), s.rt); gl.uniform1f(prog.u('uDisp'), L.disp);
      gl.uniform1f(prog.u('uTintAmt'), s.amt);
      gl.uniform2f(prog.u('uPtr'), s.px, s.py); gl.uniform2f(prog.u('uRipPos'), L.rx, L.ry);
      gl.uniform3fv(prog.u('uTint'), e.pal.primary);
    });
  }, { dpr: 2, maxPixels: 1.2e6, pointer: true });
  useEffect(() => { invalidate(); }, [hover, focus, press, tone, dispersion, shape, invalidate]);
  const ok = status === 'on';
  const fix = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    live.current.rx = (e.clientX - r.left) / Math.max(1, r.width); live.current.ry = 1 - (e.clientY - r.top) / Math.max(1, r.height);
  }, []);
  const dim: CSSProperties = size ? (shape === 'orb' ? { width: size, height: size } : { height: size }) : {};
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-label={rest['aria-label'] ?? (shape === 'orb' && typeof children !== 'string' ? (glyph === 'plus' ? 'Add' : 'Play') : undefined)}
      className={`ui-liquid-metal-button-b ui-liquid-metal-button-${shape} ui-liquid-metal-button-${tone} ${ok ? 'ui-liquid-metal-button-gl' : ''} ${className ?? ''}`}
      style={{ ...dim, ...style }}
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') setHover(true); onPointerEnter?.(e); }}
      onPointerLeave={(e) => { setHover(false); setPress(false); onPointerLeave?.(e); }}
      onPointerDown={(e) => { setPress(true); fix(e); onPointerDown?.(e); }}
      onPointerUp={(e) => { setPress(false); onPointerUp?.(e); }}
      onPointerCancel={(e) => { setPress(false); onPointerCancel?.(e); }}
      onFocus={(e: FocusEvent<HTMLButtonElement>) => { if (e.currentTarget.matches(':focus-visible')) setFocus(true); onFocus?.(e); }}
      onBlur={(e) => { setFocus(false); onBlur?.(e); }}
      onClick={(e) => {
        if (e.detail === 0) { live.current.rx = 0.5; live.current.ry = 0.5; }
        live.current.rip = true; invalidate();
        onClick?.(e);
      }}
    >
      <span className="ui-liquid-metal-button-css" aria-hidden="true" />
      <span ref={wrapRef} className="ui-liquid-metal-button-cv" aria-hidden="true"><canvas ref={canvasRef} /></span>
      {glyph === 'play' && <svg className="ui-liquid-metal-button-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.5 5.6v12.8a.8.8 0 0 0 1.2.7l10-6.4a.8.8 0 0 0 0-1.4l-10-6.4a.8.8 0 0 0-1.2.7z" fill="currentColor" /></svg>}
      {glyph === 'plus' && <svg className="ui-liquid-metal-button-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>}
      {children !== undefined && (shape === 'pill' ? <span className="ui-liquid-metal-button-label">{children}</span> : <span className="ui-liquid-metal-button-sr">{children}</span>)}
    </button>
  );
}

export function Demo() {
  return (
    <div className="ui-liquid-metal-button-demo">
      <div className="ui-liquid-metal-button-row">
        <LiquidMetalButton shape="pill">Get started</LiquidMetalButton>
        <LiquidMetalButton shape="orb" icon="play" aria-label="Play the film" />
      </div>
      <div className="ui-liquid-metal-button-row">
        <LiquidMetalButton shape="pill" tone="tint" icon="plus" size={48}>New project</LiquidMetalButton>
        <LiquidMetalButton shape="orb" icon="plus" tone="tint" size={64} aria-label="Add" />
      </div>
    </div>
  );
}
