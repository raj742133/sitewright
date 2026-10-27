'use client';
import { useMemo, useState } from 'react';
import { Avatar, Button, Panel, Pill, Progress, Table, cx, fmt, type Col } from './_dash';
import { Ico, channelName, fmtDur, frtOf, localTime, money } from './_inbox';
import { agoText, healthBand, type CustRow, type Note } from './_inbox-store';
import { Field, SearchField, SelectField, ViewHead } from './_inbox-views-ui';

const PLAN_TONE = { Trial: 'neutral', Starter: 'neutral', Team: 'ok', Business: 'info', Enterprise: 'accent' } as const;
const ST_TONE = { open: 'info', pending: 'warn', resolved: 'ok' } as const;
const PLANS = [{ id: 'all', label: 'All plans' }, ...(['Enterprise', 'Business', 'Team', 'Starter', 'Trial'] as const).map((p) => ({ id: p, label: p }))];
const HEALTH = [{ id: 'all', label: 'Any health' }, { id: 'risk', label: 'At risk' }, { id: 'watch', label: 'Watch' }, { id: 'ok', label: 'Healthy' }];

function Health({ h }: { h: number }) { const b = healthBand(h); return <span className={cx('tv-health', `is-${b.tone}`)}><b>{h}</b><Pill tone={b.tone}>{b.label}</Pill></span>; }

export interface CustomersProps {
  rows: CustRow[]; sel: string | null; onSel: (key: string | null) => void; notes: Record<string, Note[]>;
  onAddNote: (email: string, text: string) => void; onDelNote: (email: string, id: string) => void; onTags: (email: string, tags: string[]) => void; onOpenConv: (convId: string) => void;
}

export default function Customers(p: CustomersProps) {
  const [q, setQ] = useState(''); const [plan, setPlan] = useState('all'); const [health, setHealth] = useState('all'); const [onlyOpen, setOnlyOpen] = useState(false);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return p.rows.filter((r) => (plan === 'all' || r.cust.plan === plan) && (health === 'all' || healthBand(r.health).tone === (health === 'risk' ? 'bad' : health)) && (!onlyOpen || r.open > 0)
      && (!s || [r.cust.name, r.cust.company, r.cust.email, ...r.cust.tags].some((t) => t.toLowerCase().includes(s)))).sort((a, b) => b.cust.mrr - a.cust.mrr);
  }, [p.rows, q, plan, health, onlyOpen]);
  const cur = p.sel ? p.rows.find((r) => r.key === p.sel) : null;
  if (cur) return <Detail row={cur} {...p} />;

  const cols: Array<Col<CustRow>> = [
    { id: 'name', label: 'Customer', sort: (a, b) => a.cust.name.localeCompare(b.cust.name), cell: (r) => <div className="td-cellmain"><Avatar name={r.cust.name} size={28} /><div><button type="button" className="tv-link" onClick={(e) => { e.stopPropagation(); p.onSel(r.key); }}>{r.cust.name}</button><small>{r.cust.company}</small></div></div> },
    { id: 'plan', label: 'Plan', sort: (a, b) => a.cust.plan.localeCompare(b.cust.plan), cell: (r) => <Pill tone={PLAN_TONE[r.cust.plan]}>{r.cust.plan}</Pill> },
    { id: 'mrr', label: 'MRR', align: 'right', sort: (a, b) => a.cust.mrr - b.cust.mrr, cell: (r) => (r.cust.mrr ? money(r.cust.mrr) : <span className="td-muted">—</span>) },
    { id: 'health', label: 'Health', sort: (a, b) => a.health - b.health, cell: (r) => <Health h={r.health} /> },
    { id: 'open', label: 'Open tickets', align: 'right', sort: (a, b) => a.open - b.open, cell: (r) => (r.open ? <b>{r.open}</b> : <span className="td-muted">0</span>) },
    { id: 'last', label: 'Last contact', hideBelow: 'md', sort: (a, b) => b.last - a.last, cell: (r) => <span className="td-muted">{agoText(r.last)}</span> },
    { id: 'tags', label: 'Tags', hideBelow: 'sm', cell: (r) => <span className="tv-tagrow">{r.cust.tags.slice(0, 2).map((t) => <span key={t} className="ti-chip">{t}</span>)}{r.cust.tags.length > 2 && <span className="td-muted">+{r.cust.tags.length - 2}</span>}</span> },
  ];
  const mrr = shown.reduce((a, r) => a + r.cust.mrr, 0), tickets = shown.reduce((a, r) => a + r.open, 0);
  const filtered = q || plan !== 'all' || health !== 'all' || onlyOpen;
  return (
    <>
      <ViewHead title="Customers" sub="Every account that has written in, with the plan they pay for and how the relationship is going." />
      <Panel flush id="cu">
        <div className="tv-bar">
          <SearchField value={q} onChange={setQ} label="Search customers" placeholder="Search name, company, email or tag" />
          <SelectField value={plan} onChange={setPlan} options={PLANS} label="Filter by plan" />
          <SelectField value={health} onChange={setHealth} options={HEALTH} label="Filter by health" />
          <label className="tv-check"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />Has open tickets</label>
          <span className="tv-sum" role="status">{shown.length} {shown.length === 1 ? 'customer' : 'customers'} · {money(mrr)} MRR · {tickets} open {tickets === 1 ? 'ticket' : 'tickets'}</span>
          {filtered && <Button small variant="ghost" onClick={() => { setQ(''); setPlan('all'); setHealth('all'); setOnlyOpen(false); }}>Clear filters</Button>}
        </div>
        <Table cols={cols} rows={shown} rowKey={(r) => r.key} onRow={(r) => p.onSel(r.key)} caption="Customers" empty="No customers match these filters." />
      </Panel>
    </>
  );
}

/* ---------------------------------------------------------------- one customer */
function Detail({ row, notes, onSel, onAddNote, onDelNote, onTags, onOpenConv }: CustomersProps & { row: CustRow }) {
  const c = row.cust; const mine = notes[c.email] ?? [];
  const [text, setText] = useState(''); const [err, setErr] = useState(''); const [tag, setTag] = useState(''); const [tagErr, setTagErr] = useState('');
  const active = row.convs.filter((x) => x.status !== 'resolved').sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1))[0] ?? row.convs[0];
  const addNote = () => { const t = text.trim(); if (!t) return setErr('Write something before saving the note.'); if (t.length > 400) return setErr(`Notes are limited to 400 characters (${t.length} now).`); setErr(''); onAddNote(c.email, t); setText(''); };
  const addTag = () => { const t = tag.trim().toLowerCase().replace(/\s+/g, '-'); if (!t) return setTagErr('Type a tag name.'); if (!/^[a-z0-9-]{2,20}$/.test(t)) return setTagErr('Use 2–20 letters, numbers or dashes.'); if (c.tags.includes(t)) return setTagErr('That tag is already on this customer.'); setTagErr(''); onTags(c.email, [...c.tags, t]); setTag(''); };
  const b = healthBand(row.health);
  return (
    <>
      <ViewHead key={c.email} title={c.name} sub={`${c.company} · ${c.email}`} back={{ label: 'All customers', onClick: () => onSel(null) }}>
        <Button variant="primary" icon="inbox" disabled={!active} onClick={() => active && onOpenConv(active.id)}>{active ? `Open conversation #${active.num}` : 'No conversations yet'}</Button>
      </ViewHead>
      <div className="td-kpis tv-kpis">
        <div className="td-kpi"><span className="td-kpi-l">Plan</span><div className="td-kpi-v"><b>{c.plan}</b></div><div className="td-kpi-f"><small>Customer since {c.since}</small></div></div>
        <div className="td-kpi"><span className="td-kpi-l">MRR</span><div className="td-kpi-v"><b>{c.mrr ? money(c.mrr) : '—'}</b></div><div className="td-kpi-f"><small>{c.mrr ? `${money(c.mrr * 12)} a year` : 'On a free trial'}</small></div></div>
        <div className="td-kpi"><span className="td-kpi-l">Health</span><div className="td-kpi-v"><b>{row.health}</b><Pill tone={b.tone}>{b.label}</Pill></div><div className="td-kpi-f"><Progress value={row.health / 100} tone={b.tone === 'ok' ? 'ok' : b.tone === 'bad' ? 'bad' : 'primary'} label={`Health score ${row.health} of 100`} /></div></div>
        <div className="td-kpi"><span className="td-kpi-l">Satisfaction</span><div className="td-kpi-v"><b>{c.csat === null ? '—' : fmt.p(c.csat, 0)}</b></div><div className="td-kpi-f"><small>{c.csat === null ? 'No ratings yet' : `${c.ratings} ${c.ratings === 1 ? 'rating' : 'ratings'}`}</small></div></div>
      </div>
      <div className="tv-split">
        <div className="tv-col">
          <Panel title="Conversations" sub={`${row.convs.length} in the inbox · ${c.prev.length} earlier`} id="cv" flush>
            {row.convs.length === 0 && <p className="tv-quiet">Nothing in the inbox right now.</p>}
            <ul className="tv-convs">
              {row.convs.map((x) => { const f = frtOf(x); return (
                <li key={x.id}>
                  <div className="tv-conv-m"><b>{x.subject}</b><small>#{x.num} · {channelName[x.channel]} · {x.assignee ?? 'Unassigned'}{f !== null ? ` · first reply ${fmtDur(f)}` : ''}</small></div>
                  <Pill tone={ST_TONE[x.status]}>{x.status[0]!.toUpperCase() + x.status.slice(1)}</Pill>
                  <Button small onClick={() => onOpenConv(x.id)} label={`Open conversation ${x.num}`}>Open</Button>
                </li>); })}
              {c.prev.map((x) => <li key={x.s} className="is-past"><div className="tv-conv-m"><b>{x.s}</b><small>{x.d}</small></div><Pill tone="ok">{x.st}</Pill></li>)}
            </ul>
          </Panel>
          <Panel title="Notes" sub="Private to your team. Newest first." id="nt">
            <form className="tv-note-f" onSubmit={(e) => { e.preventDefault(); addNote(); }} noValidate>
              <Field label="Add a note" error={err}>{(a) => <textarea {...a} rows={2} value={text} placeholder="Context the next person should know…" onChange={(e) => { setText(e.target.value); if (err) setErr(''); }} />}</Field>
              <Button type="submit" small variant="primary" icon="plus">Save note</Button>
            </form>
            {mine.length ? <ul className="tv-notes">{mine.map((n) => (
              <li key={n.id}><Avatar name={n.by} size={24} /><div><div className="tv-note-h"><b>{n.by}</b><span>{agoText(n.ago)}</span></div><p>{n.text}</p></div>
                <button type="button" className="tv-x" aria-label={`Delete note by ${n.by}`} onClick={() => onDelNote(c.email, n.id)}><Ico name="x" size={13} /></button></li>))}</ul>
              : <p className="tv-quiet">No notes yet.</p>}
          </Panel>
        </div>
        <div className="tv-col">
          <Panel title="Profile" id="pf">
            <dl className="ti-kv">
              <div><dt>Company</dt><dd>{c.company}</dd></div><div><dt>Email</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd></div>
              <div><dt>Location</dt><dd>{c.location}</dd></div><div><dt>Local time</dt><dd>{localTime(c.tz)}</dd></div>
              <div><dt>Open tickets</dt><dd>{row.open}</dd></div><div><dt>Last contact</dt><dd>{agoText(row.last)}</dd></div>
            </dl>
          </Panel>
          <Panel title="Tags" id="tg">
            <div className="ti-tags">{c.tags.length === 0 && <span className="tv-quiet">No tags.</span>}
              {c.tags.map((t) => <span key={t} className="ti-chip">{t}<button type="button" aria-label={`Remove tag ${t}`} onClick={() => onTags(c.email, c.tags.filter((x) => x !== t))}><Ico name="x" size={11} /></button></span>)}</div>
            <form className="tv-tag-f" onSubmit={(e) => { e.preventDefault(); addTag(); }} noValidate>
              <Field label="New tag" error={tagErr}>{(a) => <input {...a} value={tag} placeholder="e.g. renewal" onChange={(e) => { setTag(e.target.value); if (tagErr) setTagErr(''); }} />}</Field>
              <Button type="submit" small>Add tag</Button>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
