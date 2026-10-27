'use client';
// The Ask view's own pieces: the empty state (greeting, suggestions by topic, recent questions), the workspace panel shown before the
// first answer, the steps list, and the row of actions under an answer (feedback, copy, save).
import { Glyph, cx, fmt } from './_dash';
import { SCHEMA } from './_txschema';
import { GROUPS, RECENT, dateLabel, resOf, type Saved } from './_txstore';
import { Ic } from './_txui';

export function Steps({ steps, step, live }: { steps: string[]; step: number; live: boolean }) {
  const done = step >= steps.length;
  if (!live) return <details className="tx-ran"><summary><Glyph name="check" size={12} />Ran {steps.length} step{steps.length === 1 ? '' : 's'}</summary><ol className="tx-steps">{steps.map((s) => <li key={s} className="is-done"><Glyph name="check" size={12} />{s}</li>)}</ol></details>;
  return (
    <ol className="tx-steps" aria-label="What the assistant is doing">
      {steps.map((s, i) => <li key={s} className={i < step ? 'is-done' : i === step ? 'is-run' : ''}>{i < step ? <Glyph name="check" size={12} /> : i === step ? <i className="tx-spin" /> : <i className="tx-pend" />}{s}{i === step && !done && <span className="tx-dots" aria-hidden="true"><b /><b /><b /></span>}</li>)}
    </ol>
  );
}

export function AskEmpty({ onAsk, onTables }: { onAsk: (q: string) => void; onTables: () => void }) {
  return (
    <div className="tx-hello">
      <div className="tx-hi">
        <span className="tx-mark is-lg"><Glyph name="sparkle" size={18} /></span>
        <div><h2>Welcome back, Dana</h2><p>Ask about Meridian Goods in plain words. Every answer comes with a chart, a table, a summary and the query behind it.</p></div>
      </div>
      {GROUPS.map((g) => (
        <section key={g.title} className="tx-grp" aria-label={g.title}>
          <h3><Glyph name={g.icon} size={13} />{g.title}</h3>
          <ul>{g.ids.map((id) => { const r = resOf(id); return <li key={id}><button type="button" onClick={() => onAsk(r.q)}><span>{r.q}</span><small>{r.period.split(' (')[0]!.split(',')[0]}</small><Glyph name="chevron" size={13} /></button></li>; })}</ul>
        </section>
      ))}
      <section className="tx-grp" aria-label="Recent questions">
        <h3><Glyph name="clock" size={13} />Recent</h3>
        <ul>{RECENT.map((r) => <li key={r.rid}><button type="button" onClick={() => onAsk(resOf(r.rid).q)}><span>{resOf(r.rid).q}</span><small>{r.when}</small><Glyph name="chevron" size={13} /></button></li>)}</ul>
      </section>
      <p className="tx-tip"><Ic name="table" size={13} /><span>You can also ask about the data itself, like “Tell me about the orders table”, or <button type="button" onClick={onTables}>browse all tables</button>.</span></p>
    </div>
  );
}

const INCLUDES: Array<[string, string, string]> = [['file', 'Summary', 'Plain-language readout with the three things to notice'], ['chart', 'Chart', 'Hover or use arrow keys for exact values'], ['grid', 'Table', 'Sortable rows that add up to the chart, export as CSV'], ['layers', 'Query', 'The SQL that ran, ready to copy']];
export function Workspace({ saved, busy, onOpenResult, onOpenTable, onAll }: { saved: Saved[]; busy: boolean; onOpenResult: (rid: string) => void; onOpenTable: (t: string) => void; onAll: (v: 'results' | 'tables') => void }) {
  const tbl = [...SCHEMA].sort((a, b) => b.rows - a.rows).slice(0, 5);
  const list = [...saved].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at.localeCompare(a.at)).slice(0, 4);
  return (
    <div className="tx-rv tx-cat">
      <header className="tx-rh"><div><h2>Your answers will appear here</h2><p>Pick a suggestion on the left, or type a question. The result opens in this panel while the assistant explains it.</p></div></header>
      <ul className="tx-inc" aria-label="What every answer includes">{INCLUDES.map(([ic, t, d]) => <li key={t}><Glyph name={ic} size={15} /><b>{t}</b><span>{d}</span></li>)}</ul>
      <section className="tx-sec"><div className="tx-sh"><h3>Saved results</h3><button type="button" className="tx-more" onClick={() => onAll('results')}>All {saved.length}</button></div>
        {list.length ? <ul className="tx-rows">{list.map((s) => { const r = resOf(s.rid); return <li key={s.rid}><button type="button" disabled={busy} onClick={() => onOpenResult(s.rid)}><Glyph name={r.icon} size={14} /><span>{s.name}</span><em>{r.headline.value}</em><small>{dateLabel(s.at)}</small></button></li>; })}</ul> : <p className="tx-none">Nothing saved yet. Use “Save to Results” under any answer.</p>}
      </section>
      <section className="tx-sec"><div className="tx-sh"><h3>Connected tables</h3><button type="button" className="tx-more" onClick={() => onAll('tables')}>All {SCHEMA.length}</button></div>
        <ul className="tx-rows">{tbl.map((t) => <li key={t.name}><button type="button" onClick={() => onOpenTable(t.name)}><Ic name="table" size={14} /><code>{t.name}</code><span>{t.desc.split('.')[0]}</span><em>{fmt.n(t.rows)}</em></button></li>)}</ul>
      </section>
    </div>
  );
}

export type Feedback = { v: 'up' | 'down'; reason?: string };
const REASONS = ['Numbers look wrong', 'Not what I asked', 'Too vague'];
export function MsgActions({ fb, onFb, onCopy, copied, saved, onSave }: { fb?: Feedback; onFb: (v: 'up' | 'down' | null, reason?: string) => void; onCopy: () => void; copied: boolean; saved: boolean; onSave: () => void }) {
  return (
    <div className="tx-acts">
      <div className="tx-acts-r" role="group" aria-label="Rate this answer">
        <button type="button" className="tx-ib" aria-pressed={fb?.v === 'up'} aria-label="Good answer" title="Good answer" onClick={() => onFb(fb?.v === 'up' ? null : 'up')}><Ic name="thumbup" size={14} fill={fb?.v === 'up'} /></button>
        <button type="button" className="tx-ib" aria-pressed={fb?.v === 'down'} aria-label="Bad answer" title="Bad answer" onClick={() => onFb(fb?.v === 'down' ? null : 'down')}><Ic name="thumbdown" size={14} fill={fb?.v === 'down'} /></button>
        <button type="button" className="tx-ib" aria-label={copied ? 'Copied' : 'Copy answer'} title="Copy answer" onClick={onCopy}><Ic name={copied ? 'check' : 'copy'} size={14} /></button>
      </div>
      <button type="button" className={cx('tx-sv', saved && 'is-on')} aria-pressed={saved} onClick={onSave}><Ic name="bookmark" size={13} fill={saved} />{saved ? 'Saved to Results' : 'Save to Results'}</button>
      {fb?.v === 'up' && <span className="tx-fb">Thanks, that helps.</span>}
      {fb?.v === 'down' && (
        <div className="tx-fb-r" role="group" aria-label="What was wrong?"><span>What was wrong?</span>{REASONS.map((r) => <button key={r} type="button" className="tx-chip is-sm" aria-pressed={fb.reason === r} onClick={() => onFb('down', r)}>{r}</button>)}</div>
      )}
    </div>
  );
}
