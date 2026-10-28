'use client';
import { useId, type CSSProperties, type ReactNode } from 'react';
import { useControlled } from './_cards-use';

export interface FolderPaper {
  id: string;
  title: string;
  /** Short text on the paper, or any content (links are only focusable while the folder is open). */
  body?: ReactNode;
}

export interface FolderProps {
  /** Folder name, printed on the front. */
  label?: string;
  papers?: FolderPaper[];
  /** Open state (controlled). */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Any CSS colour for the folder; defaults to the theme primary. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULTS: FolderPaper[] = [
  { id: 'p1', title: 'Quarter summary', body: 'Revenue up 14% on the previous quarter.' },
  { id: 'p2', title: 'Brand kit', body: 'Logos, colours and type scale, v3.' },
  { id: 'p3', title: 'Contract draft', body: 'Awaiting a final read from legal.' },
];

/** A drawn manila-style folder. Click, Enter or Space opens it and fans out the papers inside; hovering gives a peek. Paper content is real DOM (text, links) and is inert while the folder is shut. */
export default function Folder({ label = 'Projects', papers = DEFAULTS, open, defaultOpen = false, onOpenChange, color, className, style }: FolderProps) {
  const [isOpen, setOpen] = useControlled<boolean>(open, defaultOpen, onOpenChange);
  const uid = useId();
  const mid = (papers.length - 1) / 2;
  return (
    <div className={`ui-folder-root ${className ?? ''}`} style={{ ...(color ? { '--fo-c': color, '--fo-on': '#fff' } : null), ...style } as CSSProperties} data-open={isOpen ? 'true' : 'false'}>
      <div className="ui-folder-stage">
        <div className="ui-folder-back" aria-hidden="true" />
        <div id={uid} className="ui-folder-papers" role="list" aria-label={`${label} contents`} inert={!isOpen}>
          {papers.map((p, i) => {
            const k = i - mid;
            return (
              <article key={p.id} role="listitem" className="ui-folder-paper" style={{ '--k': k, '--i': i } as CSSProperties}>
                <h4>{p.title}</h4>
                <div className="ui-folder-body">{p.body}</div>
                <span className="ui-folder-lines" aria-hidden="true" />
              </article>
            );
          })}
        </div>
        <button type="button" className="ui-folder-front" aria-expanded={isOpen} aria-controls={uid} onClick={() => setOpen(!isOpen)}>
          <span className="ui-folder-label">{label}</span>
          <span className="ui-folder-count">{papers.length} {papers.length === 1 ? 'file' : 'files'}</span>
          <span className="ui-folder-hint" aria-hidden="true">{isOpen ? 'Close' : 'Open'}</span>
        </button>
      </div>
    </div>
  );
}

export function Demo() {
  return <div className="ui-folder-demo"><Folder /></div>;
}
