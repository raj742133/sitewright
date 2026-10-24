'use client';
import type { ReactNode } from 'react';

export interface RotatingButtonProps {
  label?: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function RotatingButton({ label = 'Book a table', icon, onClick, disabled, className = '' }: RotatingButtonProps) {
  return (
    <button type="button" className={`ui-rotating-button ${className}`.trim()} onClick={onClick} disabled={disabled}>
      <span className="ui-rotating-button-label">{label}</span>
      <span className="ui-rotating-button-icon" aria-hidden="true">
        {icon ?? (
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12M11 5l5 5-5 5" /></svg>
        )}
      </span>
    </button>
  );
}

export function Demo() {
  return <div style={{ display: 'grid', placeItems: 'center', minHeight: 150 }}><RotatingButton /></div>;
}
