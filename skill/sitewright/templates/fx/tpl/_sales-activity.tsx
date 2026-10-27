'use client';
// Activity: the team's chronological feed grouped by day, filtered by type, owner and search, with a 14-day volume chart
// and a form to log a call, email, meeting or note. Logging updates the deal's last activity, so its health changes too.
import { useMemo, useState } from 'react';
import { Avatar, BarChart, Button, Empty, Glyph, Panel, Segmented, Tabs, cx } from './_dash';
import { REPS } from './_sales';
import { NOW_TS, T, TODAY_KEY, TYPE_LABEL, ago, clock, dayKey, dayLabel, fill, useCfg, type ActType } from './_sales-store';
import { Field, ViewHead, type Ops } from './_sales-ui';

const ICON: Record<ActType, string> = { call: 'send', email: 'inbox', meeting: 'calendar', stage: 'layers', note: 'file' };
const SERIES: Array<{ id: ActType; label: string }> = [{ id: 'call', label: 'Calls' }, { id: 'email', label: 'Emails' }, { id: 'meeting', label: 'Meetings' }, { id: 'stage', label: 'Stage changes' }, { id: 'note', label: 'Notes' }];
const PEOPLE = ['Dana Ortiz', ...REPS.map((r) => r.name)];
type LogType = 'call' | 'email' | 'meeting' | 'note';

export function ActivityView({ ops, headRef, initDeal }: { ops: Ops; headRef: React.Ref<HTMLHeadingElement>; initDeal?: string }) {
  const { cfg, fm } = useCfg(); const { log, deals } = ops;
  const [type, setType] = useState<'all' | ActType>('all'); const [who, setWho] = useState('all'); const [q, setQ] = useState(''); const [fresh, setFresh] = useState(''); const [formOpen, setFormOpen] = useState(!!initDeal);
  const co = (id: string) => deals.find((d) => d.id === id);
  const base = useMemo(() => log.filter((e) => (who === 'all' || e.who === who) && (!q.trim() || `${e.who} ${co(e.deal)?.company ?? ''} ${e.text}`.toLowerCase().includes(q.trim().toLowerCase()))), [log, who, q, deals]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = type === 'all' ? base : base.filter((e) => e.type === type);
  const groups = useMemo(() => { const m = new Map<string, typeof rows>(); for (const e of rows) { const k = dayKey(e.ts); m.set(k, [...(m.get(k) ?? []), e]); } return [...m]; }, [rows]);
  const cnt = (t: ActType) => base.filter((e) => e.type === t).length;
  const days = Array.from({ length: 14 }, (_, i) => dayKey(NOW_TS - (13 - i) * 1440));
  const filtered = type !== 'all' || who !== 'all' || q.trim() !== '';
  return (
    <>
      <ViewHead ref={headRef} title="Activity" sub={`${log.length} activities logged this quarter · team feed, newest first`}>
        <span className="tv-logtoggle"><Button variant="primary" icon="plus" onClick={() => setFormOpen((o) => !o)}>{formOpen ? 'Hide form' : 'Log activity'}</Button></span>
      </ViewHead>
      <div className="tv-act">
        <div className="tv-actmain">
          <Panel id="tv-av" title="Last 14 days" sub="Activities per day by type" flush>
            <div className="tv-chartpad"><BarChart ariaLabel="Activities per day for the last 14 days, stacked by type" stacked height={168} format={(v) => String(Math.round(v))} labels={days.map((k) => k.slice(8).replace(/^0/, ''))}
              series={SERIES.map((s) => ({ id: s.id, label: s.label, data: days.map((k) => base.filter((e) => e.type === s.id && dayKey(e.ts) === k).length) }))} /></div>
          </Panel>
          <Panel id="tv-af" flush>
            <div className="tv-tabs"><Tabs label="Filter by type" value={type} onChange={setType} tabs={[{ id: 'all', label: 'All', count: base.length }, { id: 'call', label: 'Calls', count: cnt('call') }, { id: 'email', label: 'Emails', count: cnt('email') }, { id: 'meeting', label: 'Meetings', count: cnt('meeting') }, { id: 'stage', label: 'Stage changes', count: cnt('stage') }, { id: 'note', label: 'Notes', count: cnt('note') }]} /></div>
            <div className="tv-tools" role="search" aria-label="Filter activity">
              <label className="ts-search"><span className="td-sr">Search activity</span><Glyph name="search" size={14} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, companies, notes" /></label>
              <label className="ts-select"><span className="td-sr">Person</span><Glyph name="users" size={14} /><select value={who} onChange={(e) => setWho(e.target.value)}><option value="all">Everyone</option>{PEOPLE.map((p) => <option key={p}>{p}</option>)}</select><Glyph name="down" size={12} /></label>
              {filtered && <Button variant="ghost" small icon="x" onClick={() => { setType('all'); setWho('all'); setQ(''); }}>Clear</Button>}
              <span className="tv-grow" /><span className="ts-count" role="status" aria-live="polite">{rows.length} {rows.length === 1 ? 'activity' : 'activities'}</span>
            </div>
            {groups.length === 0 ? <Empty title="No activity matches" text="Try another type or person, or clear the filters." /> : groups.map(([k, es]) => (
              <section key={k} className="tv-day" aria-label={dayLabel(k)}>
                <h3><span>{dayLabel(k)}</span><small>{es.length}</small></h3>
                <ol>{es.map((e) => { const d = co(e.deal); return (
                  <li key={e.id} className={cx(fresh === e.id && 'is-new')}>
                    <span className={cx('tv-ti', `is-${e.type}`)} title={TYPE_LABEL[e.type]}><Glyph name={ICON[e.type]} size={13} /><span className="td-sr">{TYPE_LABEL[e.type]}</span></span>
                    <p><Avatar name={e.who} size={18} /> <b>{e.who}</b> {e.verb} {d ? <button type="button" className="tv-link" onClick={() => ops.openDeal(d.id)}>{d.company}</button> : null} <span className="tv-etext">{fill(e.text, cfg, fm, d)}</span></p>
                    <time title={`${dayKey(e.ts)} ${clock(e.ts)}`}>{e.ts >= T(24, 0) ? ago(e.ts) === 'now' ? 'now' : clock(e.ts) : clock(e.ts)}</time>
                  </li>); })}</ol>
              </section>))}
          </Panel>
        </div>
        <LogForm ops={ops} open={formOpen} initDeal={initDeal} onDone={(id) => { setFresh(id); setType('all'); setWho('all'); setQ(''); }} />
      </div>
    </>
  );
}

function LogForm({ ops, open, initDeal, onDone }: { ops: Ops; open: boolean; initDeal?: string; onDone: (id: string) => void }) {
  const [type, setType] = useState<LogType>('call'); const [deal, setDeal] = useState(initDeal ?? ''); const [who, setWho] = useState('Dana Ortiz'); const [date, setDate] = useState(TODAY_KEY); const [text, setText] = useState('');
  const [errs, setErrs] = useState<Partial<Record<'deal' | 'date' | 'text', string>>>({});
  const submit = () => {
    const e: typeof errs = {}; const t = text.trim();
    if (!deal) e.deal = 'Choose the deal this relates to.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) e.date = 'Enter a date.'; else if (date > TODAY_KEY) e.date = 'The date cannot be in the future.'; else if (date < '2026-10-01') e.date = 'Use a date in this quarter (from 1 Oct).';
    if (t.length < 3) e.text = 'Write at least 3 characters.'; else if (t.length > 300) e.text = 'Keep it under 300 characters.';
    setErrs(e); if (Object.keys(e).length) { requestAnimationFrame(() => document.querySelector<HTMLElement>('.tv-logform [aria-invalid="true"]')?.focus()); return; }
    ops.logAct({ type, deal, who, text: t, date }); onDone(`n${ops.log.length}`); setText(''); setErrs({});
  };
  return (
    <aside className={cx('tv-logform', open && 'is-open')} aria-label="Log an activity">
      <Panel id="tv-lf" title="Log activity" sub="Adds to the feed and resets the deal's last activity">
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
          <Segmented<LogType> label="Activity type" value={type} onChange={setType} options={[{ id: 'call', label: 'Call' }, { id: 'email', label: 'Email' }, { id: 'meeting', label: 'Meeting' }, { id: 'note', label: 'Note' }]} />
          <Field label="Deal" error={errs.deal}>{(a) => <select {...a} value={deal} onChange={(e) => { setDeal(e.target.value); setErrs((x) => ({ ...x, deal: undefined })); }}><option value="">Choose a deal…</option>{ops.deals.map((d) => <option key={d.id} value={d.id}>{d.company} · {d.title}</option>)}</select>}</Field>
          <div className="tv-two">
            <Field label="Logged by">{(a) => <select {...a} value={who} onChange={(e) => setWho(e.target.value)}>{PEOPLE.map((p) => <option key={p}>{p}</option>)}</select>}</Field>
            <Field label="Date" error={errs.date}>{(a) => <input {...a} type="date" value={date} min="2026-10-01" max={TODAY_KEY} onChange={(e) => { setDate(e.target.value); setErrs((x) => ({ ...x, date: undefined })); }} />}</Field>
          </div>
          <Field label={type === 'note' ? 'Note' : 'What happened'} error={errs.text} hint={`${text.length}/300`}>{(a) => <textarea {...a} rows={4} value={text} placeholder={type === 'call' ? 'Who you spoke to and what was agreed' : type === 'email' ? 'What you sent or received' : type === 'meeting' ? 'Attendees, outcome, next step' : 'Context the team should know'} onChange={(e) => { setText(e.target.value); setErrs((x) => ({ ...x, text: undefined })); }} />}</Field>
          <Button variant="primary" type="submit">Log {type}</Button>
        </form>
      </Panel>
    </aside>
  );
}
