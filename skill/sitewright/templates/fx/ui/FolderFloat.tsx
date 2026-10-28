'use client';
import { useId, type CSSProperties, type KeyboardEvent } from 'react';
import { cx, useControlled } from './_micro-a';

export interface FolderFile { id: string; name: string; meta?: string }
export interface FolderFloatProps {
  /** Folder title. */
  label?: string;
  files?: FolderFile[];
  onOpenFile?: (file: FolderFile) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  style?: CSSProperties;
}

const FILES: FolderFile[] = [
  { id: 'brief', name: 'Brief', meta: 'PDF · 12 KB' },
  { id: 'moods', name: 'Moodboard', meta: 'Images · 14' },
  { id: 'budget', name: 'Budget', meta: 'Sheet · v3' },
];
const FAN = [-9, 0, 9];

/** A folder that bobs gently, opens its flap on click, Enter or Space, and floats its files up into a fan you can pick from. Escape closes it. Closed files are out of the tab order. */
export default function FolderFloat({ label = 'Project files', files = FILES, onOpenFile, open, defaultOpen = false, onOpenChange, className, style }: FolderFloatProps) {
  const [on, setOn] = useControlled(open, defaultOpen, onOpenChange);
  const id = useId();
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && on) { e.stopPropagation(); setOn(false); (e.currentTarget as HTMLElement).querySelector<HTMLElement>('.ui-folder-float-btn')?.focus(); } };
  const n = files.length;
  return (
    <div className={cx('ui-folder-float', on && 'is-open', className)} style={style} onKeyDown={onKey}>
      <div className="ui-folder-float-stage">
        <div className="ui-folder-float-back" aria-hidden="true"><span className="ui-folder-float-tab" /></div>
        <button type="button" className="ui-folder-float-btn" aria-expanded={on} aria-controls={`${id}-files`} onClick={() => setOn(!on)}>
          <span className="ui-folder-float-front" aria-hidden="true" />
          <span className="ui-folder-float-title"><strong>{label}</strong><span>{n} files</span></span>
        </button>
        <ul id={`${id}-files`} className="ui-folder-float-files" aria-label={`${label} contents`} aria-hidden={!on || undefined}>
          {files.map((f, i) => {
            const mid = (n - 1) / 2;
            const rot = n === 3 ? (FAN[i] ?? 0) : (i - mid) * 9;
            const x = (i - mid) * 92;
            return (
              <li key={f.id} className="ui-folder-float-slot" style={{ '--x': `${x}px`, '--r': `${rot}deg`, '--i': i, '--lift': `${-62 - Math.abs(i - mid) * -6}px` } as CSSProperties}>
                <button type="button" className="ui-folder-float-file" tabIndex={on ? 0 : -1} onClick={() => onOpenFile?.(f)}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" /></svg>
                  <strong>{f.name}</strong>
                  {f.meta && <span>{f.meta}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-folder-float-demo">
      <FolderFloat defaultOpen />
    </div>
  );
}
