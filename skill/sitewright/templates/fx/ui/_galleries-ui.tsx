'use client';

/* Small controls shared by the gallery components. They carry no styles of their own: the caller passes class names from its own css file. */

const Chevron = ({ dir }: { dir: 'prev' | 'next' | 'up' | 'down' }) => {
  const d = { prev: 'M15 5l-7 7 7 7', next: 'M9 5l7 7-7 7', up: 'M5 15l7-7 7 7', down: 'M5 9l7 7 7-7' }[dir];
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d={d} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
};

export function ArrowButton({ dir, label, onClick, disabled, className }: { dir: 'prev' | 'next' | 'up' | 'down'; label: string; onClick: () => void; disabled?: boolean; className?: string }) {
  return <button type="button" className={className} aria-label={label} onClick={onClick} disabled={disabled} data-nodrag=""><Chevron dir={dir} /></button>;
}

export function PlayPauseButton({ playing, onToggle, className }: { playing: boolean; onToggle: () => void; className?: string }) {
  return (
    <button type="button" className={className} aria-label={playing ? 'Pause automatic movement' : 'Start automatic movement'} aria-pressed={!playing} onClick={onToggle} data-nodrag="">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        {playing ? <path d="M8 5v14M16 5v14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" /> : <path d="M7 4.5v15l12-7.5z" fill="currentColor" />}
      </svg>
    </button>
  );
}

export function Dots({ count, index, onSelect, className, dotClass, label = 'Go to item' }: { count: number; index: number; onSelect: (i: number) => void; className?: string; dotClass?: string; label?: string }) {
  return (
    <div className={className} data-nodrag="">
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" className={dotClass} aria-label={`${label} ${i + 1} of ${count}`} aria-current={i === index ? 'true' : undefined} onClick={() => onSelect(i)} />
      ))}
    </div>
  );
}
