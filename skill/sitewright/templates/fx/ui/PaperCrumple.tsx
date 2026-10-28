'use client';
import { useState, type CSSProperties, type ReactNode } from 'react';

export interface PaperCrumpleProps {
  /** Controlled crumpled state. */
  crumpled?: boolean;
  defaultCrumpled?: boolean;
  onChange?: (crumpled: boolean) => void;
  /** Note content; defaults to a short sample note. */
  children?: ReactNode;
  /** Button text for each state. */
  labels?: { crumple: string; restore: string };
  className?: string;
  style?: CSSProperties;
}

const FACETS = ['12,6 46,2 40,40', '46,2 88,10 62,44', '88,10 98,52 62,44', '98,52 84,92 56,66', '84,92 40,98 56,66', '40,98 6,84 30,60', '6,84 4,38 30,60', '4,38 12,6 40,40', '40,40 62,44 56,66 30,60'];

/** A sheet of paper that crumples into a ball when you discard it (and smooths back out on restore). The button is the keyboard and screen-reader path; clicking the paper does the same. */
export default function PaperCrumple({ crumpled, defaultCrumpled = false, onChange, children, labels = { crumple: 'Crumple note', restore: 'Smooth it out' }, className = '', style }: PaperCrumpleProps) {
  const [inner, setInner] = useState(defaultCrumpled);
  const on = crumpled ?? inner;
  const toggle = () => { const n = !on; if (crumpled === undefined) setInner(n); onChange?.(n); };
  return (
    <div className={`ui-paper-crumple ${className}`.trim()} style={style} data-on={on || undefined}>
      <div className="ui-paper-crumple-stage" onClick={toggle}>
        <span className="ui-paper-crumple-shadow" aria-hidden="true" />
        <div className="ui-paper-crumple-ball">
          <div className="ui-paper-crumple-sheet" aria-hidden={on || undefined}>
            <div className="ui-paper-crumple-note">{children ?? <><strong>Todo before launch</strong><span>Rewrite pricing intro</span><span>Ask legal about footer</span><span>Fix the favicon</span></>}</div>
            <svg className="ui-paper-crumple-facets" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              {FACETS.map((f, i) => <polygon key={i} points={f} style={{ ['--k' as string]: (i % 3) * 0.5 }} data-i={i % 3} />)}
            </svg>
          </div>
        </div>
      </div>
      <button type="button" className="ui-paper-crumple-btn" aria-pressed={on} onClick={toggle}>{on ? labels.restore : labels.crumple}</button>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-paper-crumple-stage-wrap">
      <PaperCrumple />
    </div>
  );
}
