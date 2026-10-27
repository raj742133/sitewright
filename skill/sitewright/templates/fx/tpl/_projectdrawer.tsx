'use client';
// The task detail drawer: edit status, assignee, estimate and dates; check off subtasks; discuss in comments.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Avatar, Button, Glyph, Progress, cx } from './_dash';
import { CommentIcon, ESTIMATES, EPICS, LabelChip, PEOPLE, PRIS, STATUSES, StatusIcon, type Cmt, type Pri, type Status, type Sub, type Task } from './_project';
import { dn, range } from './_projectdata';
import type { Store } from './_projectstore';

const ME = 'Priya Raman';
const Field = ({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) => <label className={cx('tp-f', wide && 'is-wide')}><span>{label}</span>{children}</label>;

export function TaskDrawer({ s, host, opener }: { s: Store; host: HTMLElement | null; opener: React.RefObject<HTMLElement | null> }) {
  const t = s.data.all.find((x) => x.id === s.openId); const ref = useRef<HTMLDivElement>(null); const title = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(''); const [sub, setSub] = useState(''); const [cm, setCm] = useState(''); const [errs, setErrs] = useState<{ sub?: string; cm?: string; title?: string; date?: string }>({});
  const id = t?.id;
  useLayoutEffect(() => { const a = document.activeElement as HTMLElement | null; if (id && a && !ref.current?.contains(a)) opener.current = a; }, [id, opener]);
  useEffect(() => { setDraft(t?.title ?? ''); setSub(''); setCm(''); setErrs({}); if (id) title.current?.focus(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!t || !host) return null;
  const close = () => { s.setOpenId(null); setTimeout(() => opener.current?.focus(), 0); };
  const patch = (p: Partial<Task>, text: string) => s.patch(t.id, p, text, true);
  const trap = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return; const f = [...(ref.current?.querySelectorAll<HTMLElement>('button, input, select, textarea') ?? [])].filter((x) => !x.hasAttribute('disabled') && x.offsetParent !== null); if (!f.length) return;
    const first = f[0]!, last = f[f.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const saveTitle = () => { const v = draft.trim(); if (!v) { setErrs({ title: 'A task needs a title.' }); return; } setErrs({}); if (v !== t.title) patch({ title: v }, `${t.id} renamed`); };
  const subs = t.subs ?? [], cmts = t.cmts ?? [], done = subs.filter((x) => x.done).length;
  const setSubs = (n: Sub[], text: string) => patch({ subs: n }, text);
  const addSub = () => { const v = sub.trim(); if (!v) { setErrs({ sub: 'Write the subtask first.' }); return; } setErrs({}); setSub(''); setSubs([...subs, { id: `${t.id}-s${subs.length}${v.length}`, text: v, done: false }], `Subtask added to ${t.id}`); };
  const postCm = () => { const v = cm.trim(); if (!v) { setErrs({ cm: 'Write a comment first.' }); return; } setErrs({}); setCm(''); const c: Cmt = { id: `${t.id}-c${cmts.length}`, who: ME, at: 'Just now', text: v }; patch({ cmts: [...cmts, c] }, `Comment added to ${t.id}`); };
  const dates = (from: string, to: string) => { if (!from || !to) return; if (dn(to) < dn(from)) { setErrs({ date: 'The end date cannot be before the start date.' }); return; } setErrs({}); patch({ from, to }, `${t.id} scheduled ${range({ from, to })}`); };
  const idx = s.tasks.findIndex((x) => x.id === t.id);
  const step = (d: number) => { const n = s.tasks[idx + d]; if (n) s.setOpenId(n.id); };
  const epic = EPICS.find((e) => e.id === t.epic);

  return createPortal(
    <div className="tp-dw-layer">
      <div className="tp-scrim" onClick={close} aria-hidden="true" />
      <aside className="tp-dw" role="dialog" aria-modal="true" aria-labelledby="tp-dw-t" ref={ref} onKeyDown={trap}>
        <header className="tp-dw-h">
          <span className="tp-id">{t.id}</span><StatusIcon s={t.status} /><span className="tp-dw-st">{STATUSES.find((x) => x.id === t.status)!.label}</span>
          <span className="tp-dw-nav"><button type="button" className="td-iconbtn" aria-label="Previous task" disabled={idx <= 0} onClick={() => step(-1)}><Glyph name="up" size={15} /></button>
            <button type="button" className="td-iconbtn" aria-label="Next task" disabled={idx < 0 || idx >= s.tasks.length - 1} onClick={() => step(1)}><Glyph name="down" size={15} /></button>
            <button type="button" className="td-iconbtn" aria-label="Close task details" onClick={close}><Glyph name="x" size={16} /></button></span>
        </header>
        <div className="tp-dw-b">
          <input id="tp-dw-t" ref={title} className="tp-dw-title" value={draft} aria-label="Task title" aria-invalid={!!errs.title} aria-describedby={errs.title ? 'tp-dw-te' : undefined} maxLength={90} onChange={(e) => setDraft(e.target.value)} onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveTitle(); } else if (e.key === 'Escape' && draft !== t.title) { e.stopPropagation(); setDraft(t.title); } }} />
          {errs.title && <em id="tp-dw-te" className="tp-ferr" role="alert">{errs.title}</em>}
          <div className="tp-dw-labs">{t.labels.map((l) => <LabelChip key={l} name={l} />)}{epic && <span className="tp-dw-epic">{epic.name}</span>}</div>
          <div className="tp-dw-grid">
            <Field label="Status"><select value={t.status} onChange={(e) => s.move(t.id, e.target.value as Status, null)}>{STATUSES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
            <Field label="Assignee"><select value={t.who ?? ''} onChange={(e) => patch({ who: e.target.value || null }, `${t.id} assigned to ${e.target.value || 'nobody'}`)}><option value="">Unassigned</option>{PEOPLE.map((p) => <option key={p.name}>{p.name}</option>)}</select></Field>
            <Field label="Estimate"><select value={t.est} onChange={(e) => patch({ est: Number(e.target.value) }, `${t.id} estimate set to ${e.target.value} points`)}>{[...new Set([...ESTIMATES, t.est])].sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n} {n === 1 ? 'point' : 'points'}</option>)}</select></Field>
            <Field label="Priority"><select value={t.pri} onChange={(e) => patch({ pri: e.target.value as Pri }, `${t.id} priority ${e.target.value}`)}>{PRIS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
            <Field label="Start"><input type="date" value={t.from ?? ''} aria-invalid={!!errs.date} aria-describedby={errs.date ? 'tp-dw-de' : undefined} onChange={(e) => dates(e.target.value, t.to!)} /></Field>
            <Field label="End"><input type="date" value={t.to ?? ''} aria-invalid={!!errs.date} aria-describedby={errs.date ? 'tp-dw-de' : undefined} onChange={(e) => dates(t.from!, e.target.value)} /></Field>
          </div>
          {errs.date && <em id="tp-dw-de" className="tp-ferr" role="alert">{errs.date}</em>}
          {t.status !== 'done' && <div className="tp-dw-blk">{t.blocked ? <><span className="tp-blk"><Glyph name="x" size={10} />Blocked</span><span>{t.blocked}</span><Button small variant="ghost" onClick={() => patch({ blocked: undefined }, `${t.id} unblocked`)}>Clear</Button></> : <Button small icon="x" onClick={() => patch({ blocked: 'Flagged as blocked' }, `${t.id} flagged as blocked`)}>Flag as blocked</Button>}</div>}

          <section aria-labelledby="tp-dw-s"><div className="tp-dw-sh"><h3 id="tp-dw-s">Subtasks</h3><span>{done} of {subs.length}</span></div>
            {subs.length > 0 && <Progress value={done / subs.length} tone="ok" label="Subtasks completed" />}
            <ul className="tp-subs">{subs.map((x) => (
              <li key={x.id} className={cx(x.done && 'is-done')}>
                <button type="button" role="checkbox" aria-checked={x.done} className="tp-ck" aria-label={x.text} onClick={() => setSubs(subs.map((y) => (y.id === x.id ? { ...y, done: !y.done } : y)), `Subtask ${x.done ? 'reopened' : 'completed'}: ${x.text}`)}>{x.done && <Glyph name="check" size={12} />}</button>
                <span>{x.text}</span><button type="button" className="td-iconbtn" aria-label={`Delete subtask ${x.text}`} onClick={() => setSubs(subs.filter((y) => y.id !== x.id), `Subtask removed from ${t.id}`)}><Glyph name="x" size={13} /></button></li>))}</ul>
            <div className="tp-addrow"><input value={sub} placeholder="Add a subtask" aria-label="New subtask" aria-invalid={!!errs.sub} aria-describedby={errs.sub ? 'tp-dw-se' : undefined} onChange={(e) => setSub(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }} /><Button small icon="plus" onClick={addSub}>Add</Button></div>
            {errs.sub && <em id="tp-dw-se" className="tp-ferr" role="alert">{errs.sub}</em>}
          </section>

          <section aria-labelledby="tp-dw-c"><div className="tp-dw-sh"><h3 id="tp-dw-c">Comments</h3><span>{cmts.length}</span></div>
            {cmts.length === 0 && <p className="tp-dw-none"><CommentIcon /> No comments yet. Start the conversation.</p>}
            <ul className="tp-cmts">{cmts.map((c) => <li key={c.id}><Avatar name={c.who} size={24} /><div><b>{c.who}</b><time>{c.at}</time><p>{c.text}</p></div></li>)}</ul>
            <div className="tp-cmt-new"><Avatar name={ME} size={24} /><div>
              <textarea value={cm} rows={3} placeholder="Write a comment" aria-label="New comment" aria-invalid={!!errs.cm} aria-describedby={errs.cm ? 'tp-dw-ce' : 'tp-dw-ch'} onChange={(e) => setCm(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); postCm(); } }} />
              <div className="tp-cmt-a"><small id="tp-dw-ch"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> to post</small><Button small variant="primary" onClick={postCm}>Comment</Button></div>
              {errs.cm && <em id="tp-dw-ce" className="tp-ferr" role="alert">{errs.cm}</em>}</div></div>
          </section>
        </div>
        <footer className="tp-dw-f"><Button variant="ghost" icon="x" onClick={() => { s.remove(t.id); close(); }}>Delete task</Button><span>{t.sprint === 14 ? 'Sprint 14' : `Sprint ${t.sprint}`} · {range(t)}</span></footer>
      </aside>
    </div>, host);
}
