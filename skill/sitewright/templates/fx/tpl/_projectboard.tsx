'use client';
// Board pieces: the task card, its status/assignee menu, the new-task form and the share popover.
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent as RKey, type ReactNode } from 'react';
import { Avatar, Button, Glyph, cx } from './_dash';
import type { Draft } from './_projectstore';
import { CommentIcon, ESTIMATES, LABELS, LabelChip, PEOPLE, PRIS, PriIcon, STATUSES, StatusIcon, type Pri, type Status, type Task } from './_project';

/** Closes on outside pointer-down. */
export function useOutside(ref: React.RefObject<HTMLElement | null>, on: boolean, close: () => void) {
  useEffect(() => { if (!on) return; const f = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); }; document.addEventListener('pointerdown', f); return () => document.removeEventListener('pointerdown', f); }, [on, ref, close]);
}
const menuKeys = (e: RKey<HTMLElement>, close: (back: boolean) => void) => {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
  if (e.key === 'Tab') { close(false); return; }
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
  e.preventDefault(); const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]')]; const i = items.indexOf(document.activeElement as HTMLElement);
  items[e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
};

function CardMenu({ t, close, onStatus, onAssign, onBlock }: { t: Task; close: (back: boolean) => void; onStatus: (s: Status) => void; onAssign: (w: string | null) => void; onBlock: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(); }, []);
  const pick = (f: () => void) => () => { f(); close(true); };
  return (
    <div className="tp-menu" role="menu" aria-label={`Actions for ${t.id}`} ref={ref} onKeyDown={(e) => menuKeys(e, close)}>
      <div className="tp-mh" role="presentation">Move to</div>
      {STATUSES.map((s) => <button key={s.id} type="button" role="menuitemradio" aria-checked={t.status === s.id} tabIndex={-1} onClick={pick(() => onStatus(s.id))}><StatusIcon s={s.id} />{s.label}{t.status === s.id && <Glyph name="check" size={13} />}</button>)}
      {t.status !== 'done' && <><div className="tp-msep" role="separator" /><button type="button" role="menuitem" tabIndex={-1} onClick={pick(onBlock)}><Glyph name="x" size={14} />{t.blocked ? 'Clear blocked flag' : 'Flag as blocked'}</button></>}
      <div className="tp-msep" role="separator" /><div className="tp-mh" role="presentation">Assignee</div>
      {[...PEOPLE.map((p) => p.name), null].map((n) => <button key={n ?? 'none'} type="button" role="menuitemradio" aria-checked={t.who === n} tabIndex={-1} onClick={pick(() => onAssign(n))}>{n ? <Avatar name={n} size={18} /> : <span className="tp-unas is-sm"><Glyph name="users" size={11} /></span>}{n ?? 'Unassigned'}{t.who === n && <Glyph name="check" size={13} />}</button>)}
    </div>
  );
}

export interface CardProps { t: Task; active: boolean; dragging: boolean; dropBefore: boolean; menuOpen: boolean; onFocus: () => void; onKey: (e: RKey<HTMLElement>) => void; onMenu: (open: boolean, back?: boolean) => void; onStatus: (s: Status) => void; onAssign: (w: string | null) => void; onBlock: () => void; onOpen: () => void; onDragStart: (e: DragEvent) => void; onDragEnd: () => void }
export function Card(p: CardProps) {
  const { t } = p; const wrap = useRef<HTMLLIElement>(null);
  useOutside(wrap, p.menuOpen, () => p.onMenu(false));
  const st = STATUSES.find((s) => s.id === t.status)!.label;
  return (
    <li ref={wrap} className={cx('tp-li', p.dropBefore && 'is-drop', p.dragging && 'is-drag', p.menuOpen && 'is-menu')} draggable onDragStart={p.onDragStart} onDragEnd={p.onDragEnd}>
      <div className={cx('tp-card', t.status === 'done' && 'is-done', t.blocked && 'is-blocked', t.fresh && 'is-new')} data-tid={t.id} role="group" tabIndex={p.active ? 0 : -1} aria-describedby="tp-kbd"
        aria-label={`${t.id}, ${t.title}. ${st}. ${PRIS.find((x) => x.id === t.pri)!.label} priority. ${t.who ?? 'Unassigned'}. ${t.est} points.${t.blocked ? ` Blocked: ${t.blocked}.` : ''}`} onFocus={p.onFocus} onKeyDown={p.onKey} onClick={p.onOpen}>
        <div className="tp-c1"><span className="tp-id">{t.id}</span>{t.blocked && <span className="tp-blk" title={t.blocked}><Glyph name="x" size={10} />Blocked</span>}
          <button type="button" className="tp-dots" tabIndex={-1} aria-label={`Actions for ${t.id}`} aria-haspopup="menu" aria-expanded={p.menuOpen} onClick={(e) => { e.stopPropagation(); p.onMenu(!p.menuOpen); }}><Glyph name="more" size={16} /></button></div>
        <div className="tp-title">{t.title}</div>
        {t.blocked && <div className="tp-why">{t.blocked}</div>}
        <div className="tp-c3"><span className="tp-labs">{t.labels.map((l) => <LabelChip key={l} name={l} />)}</span>{t.subs && t.subs.length > 0 && <span className="tp-ind" title="Subtasks done"><Glyph name="check" size={12} />{t.subs.filter((x) => x.done).length}/{t.subs.length}</span>}{t.cmts && t.cmts.length > 0 && <span className="tp-ind" title="Comments"><CommentIcon />{t.cmts.length}</span>}<PriIcon pri={t.pri} /><span className="tp-est" title={`${t.est} story points`}>{t.est}</span>{t.who ? <span title={t.who}><Avatar name={t.who} size={22} /></span> : <span className="tp-unas" title="Unassigned"><Glyph name="users" size={12} /></span>}</div>
      </div>
      {p.menuOpen && <CardMenu t={t} close={(back) => p.onMenu(false, back)} onStatus={p.onStatus} onAssign={p.onAssign} onBlock={p.onBlock} />}
    </li>
  );
}

export function NewTask({ initial, nextId, onAdd, onCancel }: { initial: Status; nextId: string; onAdd: (d: Draft) => void; onCancel: () => void }) {
  const [d, setD] = useState<Draft>({ title: '', status: initial, who: null, pri: 'med', label: 'Frontend', est: 3 }); const [touched, setTouched] = useState(false);
  useEffect(() => setD((x) => ({ ...x, status: initial })), [initial]);
  const bad = !d.title.trim(); const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const sel = (label: string, el: ReactNode) => <label className="tp-f"><span>{label}</span>{el}</label>;
  return (
    <form className="td-panel tp-form" aria-label="New task" noValidate onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }} onSubmit={(e) => { e.preventDefault(); setTouched(true); if (!bad) onAdd({ ...d, title: d.title.trim() }); }}>
      <div className="tp-fh"><b>New task</b><span className="tp-id">{nextId}</span><button type="button" className="td-iconbtn" aria-label="Close form" onClick={onCancel}><Glyph name="x" size={15} /></button></div>
      <label className="tp-f is-wide"><span>Title</span><input autoFocus value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="What needs to happen?" aria-invalid={touched && bad} aria-describedby="tp-ferr" maxLength={90} />
        <em id="tp-ferr" className="tp-ferr" role={touched && bad ? 'alert' : undefined}>{touched && bad ? 'Give the task a title first.' : ''}</em></label>
      <div className="tp-fgrid">
        {sel('Status', <select value={d.status} onChange={(e) => set('status', e.target.value as Status)}>{STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>)}
        {sel('Assignee', <select value={d.who ?? ''} onChange={(e) => set('who', e.target.value || null)}><option value="">Unassigned</option>{PEOPLE.map((p) => <option key={p.name}>{p.name}</option>)}</select>)}
        {sel('Priority', <select value={d.pri} onChange={(e) => set('pri', e.target.value as Pri)}>{PRIS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>)}
        {sel('Label', <select value={d.label} onChange={(e) => set('label', e.target.value)}>{LABELS.map((l) => <option key={l}>{l}</option>)}</select>)}
        {sel('Estimate', <select value={d.est} onChange={(e) => set('est', Number(e.target.value))}>{ESTIMATES.map((n) => <option key={n} value={n}>{n} {n === 1 ? 'point' : 'points'}</option>)}</select>)}
      </div>
      <div className="tp-fa"><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit" icon="plus">Create task</Button></div>
    </form>
  );
}

export function Share({ onCopied }: { onCopied: (ok: boolean) => void }) {
  const [open, setOpen] = useState(false); const [copied, setCopied] = useState(false); const ref = useRef<HTMLDivElement>(null); const btn = useRef<HTMLButtonElement>(null);
  useOutside(ref, open, () => setOpen(false));
  const url = 'https://northwind.example/p/web-relaunch';
  const copy = async () => { let ok = true; try { await navigator.clipboard.writeText(url); } catch { ok = false; } setCopied(true); onCopied(ok); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="tp-share" ref={ref} onKeyDown={(e) => { if (e.key === 'Escape' && open) { setOpen(false); btn.current?.focus(); } }}>
      <button ref={btn} type="button" className="td-btn" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}><Glyph name="link" size={15} />Share</button>
      {open && <div className="tp-pop" role="dialog" aria-label="Share project"><b>Share Storefront relaunch</b><p>Anyone at Northwind with the link can view the board. Only members can edit.</p>
        <div className="tp-copy"><input readOnly value={url} aria-label="Project link" onFocus={(e) => e.currentTarget.select()} /><Button variant="primary" small icon={copied ? 'check' : 'link'} onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button></div></div>}
    </div>
  );
}
