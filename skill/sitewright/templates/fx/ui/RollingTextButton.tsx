'use client';

export interface RollingTextButtonProps {
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** stagger between letters in ms */
  stagger?: number;
  className?: string;
}

export default function RollingTextButton({ label = 'Explore the menu', onClick, disabled, stagger = 22, className = '' }: RollingTextButtonProps) {
  const chars = Array.from(label);
  return (
    <button type="button" className={`ui-rolling-text-button ${className}`.trim()} onClick={onClick} disabled={disabled} aria-label={label}>
      <span className="ui-rolling-text-button-text" aria-hidden="true">
        {chars.map((c, i) => (
          <span key={i} className="ui-rolling-text-button-ch" style={{ transitionDelay: `${i * stagger}ms` }}>
            <span data-c={c === ' ' ? ' ' : c}>{c === ' ' ? ' ' : c}</span>
          </span>
        ))}
      </span>
    </button>
  );
}

export function Demo() {
  return <div style={{ display: 'grid', placeItems: 'center', minHeight: 150 }}><RollingTextButton /></div>;
}
