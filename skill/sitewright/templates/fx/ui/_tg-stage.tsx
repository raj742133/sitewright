import type { CSSProperties, ReactNode } from 'react';

/** The backdrop every glass demo sits on: theme-aware colour, stripes, rings and two drifting orbs, so the glass has something to bend. */
export function GlassStage({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <div className="ui-glass-stage" style={style}>
      <i className="ui-glass-orb" aria-hidden="true" />
      <i className="ui-glass-orb" aria-hidden="true" />
      <i className="ui-glass-ring" aria-hidden="true" />
      <i className="ui-glass-ring" aria-hidden="true" />
      <div className="ui-glass-stage-in">{children}</div>
    </div>
  );
}
