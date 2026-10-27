'use client';
import { useMemo, useState } from 'react';
import { AreaChart, Avatar, Button, Delta, Empty, Icon, Kpi, PageHeader, Panel, Pill, Preview, Progress, Shell, Table, cx, fmt, type Col, type NavEntry } from './_dash';
import { Board } from './_salesboard';
import { DEALS, EVENTS, INBOUND, REPS, TEAM_LOST, TEAM_QUOTA, TODAY_WEEK, WEEK_LABELS, csv, inOctober, money, prob, stageLabel, sum, summarize, weekly, type Deal, type Event, type StageId } from './_sales';

const NAV: NavEntry[] = [
  { id: 'pipeline', label: 'Pipeline', icon: 'layers' }, { id: 'deals', label: 'Deals', icon: 'dollar', badge: 24 }, { id: 'accounts', label: 'Accounts', icon: 'users' },
  { id: 'activity', label: 'Activity', icon: 'clock' }, { id: 'reports', label: 'Reports', icon: 'chart' }, { id: 'settings', label: 'Settings', icon: 'settings' },
];
const k$ = (v: number) => `$${fmt.k(v)}`;
interface Note { text: string; undo?: { id: string; from: StageId } }
interface RepRow { name: string; role: string; quota: number; won: number; open: number; forecast: number }

export default function SalesDashboard({ brand = 'Ferrum' }: { brand?: string }) {
  const [active, setActive] = useState('pipeline');
  const [deals, setDeals] = useState<Deal[]>(DEALS);
  const [events, setEvents] = useState<Event[]>(EVENTS);
  const [owner, setOwner] = useState('all'); const [q, setQ] = useState(''); const [month, setMonth] = useState(false);
  const [note, setNote] = useState<Note | null>(null); const [added, setAdded] = useState(0);

  const match = (d: Deal) => (owner === 'all' || d.owner === owner) && (!month || inOctober(d)) && (!q.trim() || `${d.company} ${d.title} ${d.owner}`.toLowerCase().includes(q.trim().toLowerCase()));
  const shown = useMemo(() => deals.filter(match), [deals, owner, q, month]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = owner !== 'all' || month || q.trim() !== '';
  const rep = REPS.find((r) => r.name === owner);
  const quota = rep ? rep.quota : TEAM_QUOTA; const lost = rep ? rep.lost : TEAM_LOST;
  const now = summarize(shown, lost);
  const base = useMemo(() => summarize(DEALS.filter(match), lost), [owner, q, month, lost]); // eslint-disable-line react-hooks/exhaustive-deps
  const chg = (cur: number, prev: number, f: number) => (prev ? (cur / (prev * f) - 1) * 100 : 0);
  const weeks = useMemo(() => weekly(shown, quota), [shown, quota]);
  const gap = quota - now.forecast, pct = quota ? now.forecast / quota : 0;

  const move = (id: string, to: StageId, undo = false) => {
    const d = deals.find((x) => x.id === id); if (!d || d.stage === to) return;
    const next = [{ ...d, stage: to, touch: 0 }, ...deals.filter((x) => x.id !== id)]; setDeals(next);
    const col = next.filter((x) => match(x) && x.stage === to);
    setNote({ text: `${d.company} ${undo ? 'moved back' : 'moved'} from ${stageLabel(d.stage)} to ${stageLabel(to)}. ${stageLabel(to)} now has ${col.length} ${col.length === 1 ? 'deal' : 'deals'}, ${money(sum(col))}.`, undo: undo ? undefined : { id, from: d.stage } });
    setEvents((ev) => [{ id: `m${ev.length}`, who: 'Dana Ortiz', verb: undo ? 'moved back' : 'moved', company: d.company, detail: `from ${stageLabel(d.stage)} to ${stageLabel(to)}.`, t: 'now' }, ...ev].slice(0, 12));
  };
  const addDeal = () => {
    const p = INBOUND[added]; if (!p) return; const o = rep ?? REPS[added % REPS.length]!; setAdded(added + 1);
    setDeals([{ id: `n${added}`, ...p, owner: o.name, stage: 'lead', adj: 0, touch: 0 }, ...deals]);
    setNote({ text: `${p.company} added to Lead, owned by ${o.name}. Lead now has ${shown.filter((x) => x.stage === 'lead').length + (match({ ...p, owner: o.name, stage: 'lead', id: '', adj: 0, touch: 0 }) ? 1 : 0)} deals.` });
    setEvents((ev) => [{ id: `a${added}`, who: 'Dana Ortiz', verb: 'added', company: p.company, detail: 'as a new lead.', t: 'now' }, ...ev].slice(0, 12));
  };
  const exportCsv = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv(shown)], { type: 'text/csv' })); a.download = 'pipeline-q4-2026.csv'; a.click(); URL.revokeObjectURL(a.href); setNote({ text: `Exported ${shown.length} deals to CSV.` }); };
  const clear = () => { setOwner('all'); setQ(''); setMonth(false); };

  const rows: RepRow[] = REPS.map((r) => { const mine = deals.filter((d) => d.owner === r.name), s = summarize(mine, r.lost); return { name: r.name, role: r.role, quota: r.quota, won: s.wonV, open: s.pipeline, forecast: s.forecast }; }).sort((a, b) => b.won / b.quota - a.won / a.quota);
  const cols: Array<Col<RepRow>> = [
    { id: 'rep', label: 'Rep', cell: (r) => <button type="button" className={cx('ts-rep', owner === r.name && 'is-on')} aria-pressed={owner === r.name} title={owner === r.name ? 'Showing this rep. Click to show everyone' : 'Filter the board to this rep'} onClick={() => setOwner(owner === r.name ? 'all' : r.name)}><Avatar name={r.name} size={24} /><span><b>{r.name}</b><small>{r.role}</small></span></button>, sort: (a, b) => a.name.localeCompare(b.name) },
    { id: 'won', label: 'Closed won', align: 'right', cell: (r) => money(r.won), sort: (a, b) => a.won - b.won },
    { id: 'open', label: 'Open pipeline', align: 'right', hideBelow: 'sm', cell: (r) => money(r.open), sort: (a, b) => a.open - b.open },
    { id: 'fc', label: 'Forecast', align: 'right', hideBelow: 'md', cell: (r) => <>{money(r.forecast)} <span className="td-muted">· {fmt.p(r.forecast / r.quota, 0)}</span></>, sort: (a, b) => a.forecast / a.quota - b.forecast / b.quota },
    { id: 'quota', label: 'Quota', align: 'right', hideBelow: 'md', cell: (r) => money(r.quota), sort: (a, b) => a.quota - b.quota },
    { id: 'att', label: 'Quota attainment', w: '26%', cell: (r) => <div className="ts-att"><b>{fmt.p(r.won / r.quota, 0)}</b><Progress value={r.won / r.quota} tone={r.won / r.quota >= 0.5 ? 'primary' : 'signal'} label={`${r.name} quota attainment`} /></div>, sort: (a, b) => a.won / a.quota - b.won / b.quota },
  ];

  return (
    <Shell brand={brand} nav={NAV} active={active} onNav={setActive} title="Pipeline" crumbs={[brand, 'Sales', 'Pipeline']} searchHint="Search deals">
      <PageHeader title="Pipeline" sub="Q4 2026 · 68 days left · amounts in USD">
        <Button icon="file" onClick={exportCsv}>Export CSV</Button>
        <Button variant="primary" icon="plus" onClick={addDeal} disabled={added >= INBOUND.length}>{added >= INBOUND.length ? 'No new leads' : 'Add deal'}</Button>
      </PageHeader>
      <div className="td-kpis">
        <Kpi label="Open pipeline" value={money(now.pipeline)} delta={chg(now.pipeline, base.pipeline, 0.9)} hint={`${now.openCount} open deals`} />
        <Kpi label="Weighted forecast" value={money(now.weighted)} delta={chg(now.weighted, base.weighted, 0.94)} hint="open deals × win probability" tone="signal" />
        <Kpi label="Win rate" value={fmt.p(now.winRate, 0)} delta={chg(now.winRate, base.winRate, 0.96)} hint={`${now.wonCount} won, ${lost} lost this quarter`} />
        <Kpi label="Average deal size" value={now.wonCount ? money(now.avg) : '—'} delta={now.wonCount ? chg(now.avg, base.avg, 0.88) : undefined} hint={now.wonCount ? `across ${now.wonCount} won deals` : 'no won deals in view'} tone="signal" />
        <div className="ts-target">
          <div className="ts-tt"><span className="td-kpi-l">Q4 forecast vs target{rep ? ` · ${rep.name}` : ''}</span><b>{money(now.forecast)}</b><span className="td-muted">of {money(quota)}</span><Pill tone={pct >= 1 ? 'ok' : pct >= 0.85 ? 'info' : 'warn'}>{fmt.p(pct, 0)}</Pill></div>
          <div className="ts-tbar"><Progress value={pct} tone={pct >= 1 ? 'ok' : 'primary'} label="Forecast against the quarterly target" /><i className="ts-won" style={{ width: `${Math.min(1, now.wonV / quota) * 100}%` }} aria-hidden="true" /></div>
          <div className="ts-tm"><span><i className="ts-key is-won" />Won {money(now.wonV)}</span><span><i className="ts-key" />Weighted open {money(now.weighted)}</span><span className={gap > 0 ? 'is-gap' : 'is-ahead'}>{gap > 0 ? `${money(gap)} to find` : `${money(-gap)} ahead`}</span></div>
        </div>
      </div>

      <div className="ts-bar">
        <div className="ts-filters" role="search" aria-label="Filter deals">
          <label className="ts-select"><span className="td-sr">Owner</span><Icon name="users" size={14} /><select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="all">All owners</option>{REPS.map((r) => <option key={r.name}>{r.name}</option>)}</select><Icon name="down" size={12} /></label>
          <label className="ts-search"><span className="td-sr">Search deals</span><Icon name="search" size={14} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company or deal" /></label>
          <button type="button" className="ts-toggle" aria-pressed={month} onClick={() => setMonth(!month)}><Icon name="calendar" size={14} />Closing this month</button>
          {filtered && <Button variant="ghost" small icon="x" onClick={clear}>Clear</Button>}
        </div>
        <p className="ts-count">{shown.length} of {deals.length} deals · {money(now.pipeline)} open</p>
      </div>
      <div className="ts-boardwrap">
        {shown.length === 0 ? <Panel id="ts-e" className="ts-emptyp"><Empty title="No deals match" text="Try a different owner or search, or clear the filters." /><Button onClick={clear}>Clear filters</Button></Panel> : <Board deals={shown} onMove={move} />}
        <div className="ts-help"><span><kbd>Shift</kbd> + <kbd>←</kbd> <kbd>→</kbd> moves a deal · <kbd>Enter</kbd> opens the menu · drag between columns</span>
          <span className="ts-note" role="status" aria-live="polite">{note && <>{note.text}{note.undo && <button type="button" onClick={() => move(note.undo!.id, note.undo!.from, true)}>Undo</button>}</>}</span></div>
      </div>

      <div className="ts-row">
        <Panel id="ts-f" title="Forecast vs target" sub="Cumulative closed-won plus weighted open deals, by week of Q4" actions={<span className="ts-legend"><i />Committed<i className="is-t" />Target</span>}>
          <AreaChart ariaLabel="Committed forecast against target by week, cumulative, in US dollars" labels={WEEK_LABELS} height={272} format={k$} tipFormat={money}
            series={[{ id: 'c', label: 'Committed', data: weeks.committed }, { id: 't', label: 'Target', data: weeks.target, color: 'color-mix(in srgb, var(--ink, #15130e) 42%, transparent)' }]} />
          <p className="ts-chartnote"><b>Today · week ending {WEEK_LABELS[TODAY_WEEK]}</b><span>Won so far {money(now.wonV)}</span><span>Projected {money(weeks.committed[weeks.committed.length - 1]!)} by Dec 31</span><span className={gap > 0 ? 'is-gap' : 'is-ahead'}>{gap > 0 ? `${money(gap)} short of target` : 'Target covered'}</span></p>
        </Panel>
        <Panel id="ts-a" title="Recent activity" sub="Across the team">
          <ol className="ts-feed">{events.slice(0, 6).map((e) => <li key={e.id} className={e.t === 'now' ? 'is-new' : undefined}><Avatar name={e.who} size={24} /><p><b>{e.who}</b> {e.verb} <b>{e.company}</b> {e.detail}</p><time>{e.t}</time></li>)}</ol>
        </Panel>
      </div>
      <Panel id="ts-l" title="Leaderboard" sub="Quota attainment is closed-won against Q4 quota. Click a rep to filter the board." flush>
        <Table caption="Rep leaderboard, sortable" cols={cols} rows={rows} rowKey={(r) => r.name} selected={owner} />
      </Panel>
    </Shell>
  );
}

export function Demo() { return <Preview w={1280} h={150}><SalesDashboard /></Preview>; }
