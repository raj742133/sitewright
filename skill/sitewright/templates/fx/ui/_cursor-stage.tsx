import type { ReactNode } from 'react';

/* A backdrop with real content for the pointer-effect demos: soft brand gradients, a faint grid, a small heading block. Not part of any effect. */

export interface StageProps {
  eyebrow?: string;
  title?: string;
  text?: string;
  /** Force a deep, dark stage in both themes (for glowing effects). */
  dark?: boolean;
  /** Extra content under the text (buttons, cards). */
  children?: ReactNode;
  /** Put the text block at the top instead of the middle. */
  top?: boolean;
}

export function Stage({ eyebrow = 'Pointer lab', title = 'Move across this page', text = 'The effect lives in its own layer and never touches the system cursor.', dark, children, top }: StageProps) {
  return (
    <div className={`ui-cursor-stage-root${dark ? ' ui-cursor-stage-dark' : ''}${top ? ' ui-cursor-stage-top' : ''}`}>
      <div className="ui-cursor-stage-copy">
        <span className="ui-cursor-stage-eyebrow">{eyebrow}</span>
        <strong className="ui-cursor-stage-title">{title}</strong>
        <span className="ui-cursor-stage-text">{text}</span>
        {children}
      </div>
    </div>
  );
}
