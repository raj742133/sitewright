'use client';
// Small shared pieces of the Sales views: the focusable page heading, the stage pill, a labelled field, the toast and the deal drawer.
import { forwardRef, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Avatar, Button, Glyph, Pill, Tabs, cx } from './_dash';
import { REPS, daysTo, dateLabel, health, prob, stageLabel, type Deal, type StageId } from './_sales';
import { OPENED, TYPE_LABEL, ageDays, clock, dayKey, dayLabel, fill, ago, useCfg, type Act, type ActType } from './_sales-store';

export interface Ops {
  deals: Deal[]; log: Act[];
  moveDeals: (ids: string[], to: StageId) => void; reassign: (ids: string[], owner: string) => void; addNote: (deal: string, text: string) => void;
  logAct: (a: { type: ActType; deal: string; who: string; text: string; date: string }) => void;
  openDeal: (id: string) => void; goAccount: (company: string) => void; goActivity: (deal?: string) => void; announce: (t: string) => void;
}

export const ViewHead = forwardRef<HTMLHeadingElement, { title: string; sub?: string; children?: ReactNode }>(function ViewHead({ title, sub, children }, ref) {
  return <div className="td-ph"><div><h1 ref={ref} tabIndex={-1} className="tv-h1">{title}</h1>{sub && <p>{sub}</p>}</div><div className="td-ph-a">{children}</div></div>;
});

export function StagePill({ id }: { id: StageId }) { const { cfg } = useCfg(); return <span className="tv-stage"><i className={`ts-sd is-${id}`} aria-hidden="true" />{stageLabel(id, cfg.stages)}</span>; }
export function HealthDot({ d }: { d: Deal }) { const h = health(d); return <span className="tv-health" title={h.why}><i className={`ts-health is-${h.level}`} aria-hidden="true" /><span className="td-sr">{h.why}</span></span>; }

export function Field({ label, error, hint, children, id }: { label: string; error?: string; hint?: string; children: (p: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode; id?: string }) {
  const auto = useId(); const fid = id ?? auto; const dby = error ? `${fid}-e` : hint ? `${fid}-h` : undefined;
  return <div className={cx('tv-field', error && 'is-bad')}><label htmlFor={fid}>{label}</label>{children({ id: fid, 'aria-invalid': error ? true : undefined, 'aria-describedby': dby })}{error ? <p id={`${fid}-e`} className="tv-err">{error}</p> : hint ? <p id={`${fid}-h`} className="tv-hint">{hint}</p> : null}</div>;
}

export function Toast({ toast, onUndo, onClose }: { toast: { text: string; undo?: boolean } | null; onUndo: () => void; onClose: () => void }) {
  useEffect(() => { if (!toast) return; const t = setTimeout(onClose, 8000); return () => clearTimeout(t); }, [toast, onClose]);
  return <div className="tv-toastwrap">{toast && <div className="tv-toast"><span>{toast.text}</span>{toast.undo && <button type="button" onClick={onUndo}>Undo</button>}<button type="button" className="tv-x" aria-label="Dismiss" onClick={onClose}><Glyph name="x" size={14} /></button></div>}</div>;
}

/** A modal drawer from the right: Escape and the scrim close it, Tab stays inside, focus goes back to where it came from. */
export function Drawer({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const from = document.activeElement as HTMLElement | null; ref.current?.querySelector<HTMLElement>('[data-first]')?.focus(); return () => { if (from?.isConnected) from.focus(); }; }, []);
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab') return; const f = [...ref.current!.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]; if (!f.length) return;
    const first = f[0]!, last = f[f.length - 1]!; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  return <div className="tv-layer" onKeyDown={key}><div className="tv-scrim" onClick={onClose} aria-hidden="true" /><aside className="tv-drawer" ref={ref} role="dialog" aria-modal="true" aria-label={label}>{children}</aside></div>;
}

export function DealDrawer({ id, ops, onClose }: { id: string; ops: Ops; onClose: () => void }) {
  const { cfg, fm } = useCfg(); const d = ops.deals.find((x) => x.id === id); const [tab, setTab] = useState<'notes' | 'history'>('notes'); const [text, setText] = useState(''); const [err, setErr] = useState('');
  if (!d) return null;
  const mine = ops.log.filter((e) => e.deal === id); const notes = mine.filter((e) => e.type === 'note'); const h = health(d); const p = prob(d, cfg.stages); const dt = daysTo(d.close);
  const hist = [...mine.map((e) => ({ key: e.id, ts: e.ts, who: e.who, type: e.type as ActType | 'open', line: `${e.verb} ${d.company} ${fill(e.text, cfg, fm, d)}` })), { key: 'open', ts: -1, who: d.owner, type: 'open' as const, line: `opened this deal on ${dateLabel(OPENED[id] ?? d.close)}.` }];
  const submit = () => { const t = text.trim(); if (t.length < 3) { setErr('Write at least 3 characters.'); return; } if (t.length > 500) { setErr('Keep notes under 500 characters.'); return; } setErr(''); setText(''); ops.addNote(id, t); };
  const facts: Array<[string, ReactNode]> = [['Amount', fm.m(d.amount)], ['Win probability', d.stage === 'won' ? 'Won' : `${p}% · ${fm.m((d.amount * p) / 100)} weighted`], ['Close date', `${dateLabel(d.close)}${d.stage === 'won' ? '' : dt < 0 ? ` · ${-dt}d overdue` : ` · in ${dt}d`}`], ['Deal age', `${ageDays(d)} days`], ['Health', <span key="h" className="tv-hl"><i className={`ts-health is-${h.level}`} aria-hidden="true" />{h.why}</span>], ['Last activity', d.touch === 0 ? 'Today' : `${d.touch} ${d.touch === 1 ? 'day' : 'days'} ago`]];
  return (
    <Drawer label={`${d.company}, deal details`} onClose={onClose}>
      <header className="tv-dh">
        <div><h2 data-first tabIndex={-1}>{d.company}</h2><p>{d.title}</p></div>
        <button type="button" className="tv-x" aria-label="Close deal details" onClick={onClose}><Glyph name="x" size={16} /></button>
      </header>
      <div className="tv-dc">
        <div className="tv-dsel">
          <label>Stage<select value={d.stage} onChange={(e) => ops.moveDeals([id], e.target.value as StageId)}>{cfg.stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <label>Owner<select value={d.owner} onChange={(e) => ops.reassign([id], e.target.value)}>{REPS.map((r) => <option key={r.name}>{r.name}</option>)}</select></label>
        </div>
        <dl className="tv-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        <div className="tv-links"><Button small icon="users" onClick={() => ops.goAccount(d.company)}>Open account</Button><Button small icon="clock" onClick={() => ops.goActivity(id)}>Log activity</Button></div>
        <Tabs label="Deal detail" value={tab} onChange={setTab} tabs={[{ id: 'notes', label: 'Notes', count: notes.length }, { id: 'history', label: 'History', count: hist.length }]} />
        {tab === 'notes' ? (
          <div role="tabpanel" className="tv-pane">
            <form className="tv-noteform" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
              <Field label="Add a note" error={err} hint={`${text.length}/500`}>{(a) => <textarea {...a} rows={3} value={text} placeholder="What happened, what is next?" onChange={(e) => { setText(e.target.value); if (err) setErr(''); }} />}</Field>
              <Button variant="primary" type="submit" small>Add note</Button>
            </form>
            {notes.length === 0 ? <p className="tv-quiet">No notes yet. Notes are shared with the team and show in the history.</p> : <ul className="tv-notes">{notes.map((n) => <li key={n.id}><Avatar name={n.who} size={24} /><div><p><b>{n.who}</b><time>{dayLabel(dayKey(n.ts)).replace(/^(Today|Yesterday) · /, '$1, ')} · {clock(n.ts)}</time></p><p>{fill(n.text, cfg, fm, d)}</p></div></li>)}</ul>}
          </div>
        ) : (
          <ol role="tabpanel" className="tv-hist">{hist.map((e) => <li key={e.key}><i className="tv-hd" aria-hidden="true"><Glyph name={e.type === 'call' ? 'send' : e.type === 'email' ? 'inbox' : e.type === 'meeting' ? 'calendar' : e.type === 'note' ? 'file' : 'layers'} size={12} /></i><p><b>{e.who}</b> {e.line}</p><time>{e.ts < 0 ? OPENED[id] ? dateLabel(OPENED[id]!) : '' : ago(e.ts)}</time></li>)}</ol>
        )}
        <span className="td-sr" aria-live="polite">{TYPE_LABEL.note}s: {notes.length}</span>
      </div>
    </Drawer>
  );
}
export { Pill };
