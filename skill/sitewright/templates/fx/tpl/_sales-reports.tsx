'use client';
// Reports: forecast by month against target, rep leaderboard, stage funnel with sales-cycle length, and win/loss reasons.
// Everything derives from the live deals and the saved settings, so a bulk move or a new target shows up here at once.
import { useMemo, useState } from 'react';
import { Avatar, BarChart, Button, Delta, Empty, Kpi, Panel, Pill, Progress, RankList, Segmented, Table, Tabs, fmt, type Col } from './_dash';
import { REPS, prob, sum, type Deal } from './_sales';
import { CYCLE_PRIOR, LOST, MONTHS, WIN_WHY, cycleDays, monthOf, teamQuota, useCfg } from './_sales-store';
import { ViewHead } from './_sales-ui';

type Tab = 'forecast' | 'leaderboard' | 'funnel' | 'winloss';
export const REPORT_TABS: Tab[] = ['forecast', 'leaderboard', 'funnel', 'winloss'];
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const add = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);
const days = (v: number) => `${Math.round(v)} days`;

export function ReportsView({ deals, headRef, initTab, announce }: { deals: Deal[]; headRef: React.Ref<HTMLHeadingElement>; initTab?: string; announce: (t: string) => void }) {
  const { cfg, fm } = useCfg(); const [tab, setTab] = useState<Tab>(REPORT_TABS.includes(initTab as Tab) ? (initTab as Tab) : 'forecast'); const [scope, setScope] = useState('all');
  const [fun, setFun] = useState<'count' | 'value'>('count'); const [wl, setWl] = useState<'lost' | 'won'>('lost');
  const mine = useMemo(() => deals.filter((d) => scope === 'all' || d.owner === scope), [deals, scope]); const lost = LOST.filter((l) => scope === 'all' || l.owner === scope);
  const quota = scope === 'all' ? teamQuota(cfg) : cfg.quotas[scope] ?? 0; const open = mine.filter((d) => d.stage !== 'won'); const won = mine.filter((d) => d.stage === 'won');
  const w = (d: Deal) => (d.amount * prob(d, cfg.stages)) / 100;
  const months = MONTHS.map((m, i) => { const wonV = sum(won.filter((d) => monthOf(d) === i)), wt = sum(open.filter((d) => monthOf(d) === i), w), target = (quota * cfg.phasing[i]!) / 100; return { m, wonV, wt, target, fc: wonV + wt }; });
  const fc = add(months, (x) => x.fc), gap = quota - fc; const winRate = won.length + lost.length ? won.length / (won.length + lost.length) : 0;
  const worst = months.reduce((a, b) => (b.fc - b.target < a.fc - a.target ? b : a)); const cyc = won.map(cycleDays);
  const scopeNote = scope === 'all' ? 'whole team' : scope;
  // funnel: who reached each stage = deals now at or past it + lost deals that got that far
  const order = cfg.stages.map((s) => s.id); const reached = cfg.stages.map((s, i) => { const a = mine.filter((d) => order.indexOf(d.stage) >= i), b = lost.filter((l) => order.indexOf(l.at) >= i); return { s, n: a.length + b.length, v: sum(a) + sum(b) }; });
  const bands = [{ l: 'Under $40k', f: (d: Deal) => d.amount < 40000 }, { l: '$40k to $80k', f: (d: Deal) => d.amount >= 40000 && d.amount < 80000 }, { l: '$80k and over', f: (d: Deal) => d.amount >= 80000 }].map((b) => ({ ...b, ds: won.filter(b.f) }));
  const reps = REPS.map((r) => { const ds = deals.filter((d) => d.owner === r.name), wn = ds.filter((d) => d.stage === 'won'), op = ds.filter((d) => d.stage !== 'won'), ls = LOST.filter((l) => l.owner === r.name).length, q = cfg.quotas[r.name] ?? r.quota;
    const f = sum(wn) + sum(op, w); return { name: r.name, role: r.role, q, won: sum(wn), fc: f, cov: (q - sum(wn)) > 0 ? sum(op) / (q - sum(wn)) : 0, rate: wn.length + ls ? wn.length / (wn.length + ls) : 0, cycle: avg(wn.map(cycleDays)) }; }).sort((a, b) => b.won / b.q - a.won / a.q);

  const mcols: Array<Col<(typeof months)[0]>> = [
    { id: 'm', label: 'Month', cell: (r) => <b>{r.m === 'Quarter' ? 'Q4 total' : `${r.m} 2026`}</b> }, { id: 't', label: 'Target', align: 'right', cell: (r) => fm.m(r.target) }, { id: 'w', label: 'Closed won', align: 'right', hideBelow: 'sm', cell: (r) => fm.m(r.wonV) },
    { id: 'o', label: 'Weighted open', align: 'right', hideBelow: 'sm', cell: (r) => fm.m(r.wt) }, { id: 'f', label: 'Forecast', align: 'right', cell: (r) => <b>{fm.m(r.fc)}</b> },
    { id: 'd', label: 'vs target', align: 'right', cell: (r) => <Pill tone={r.fc >= r.target ? 'ok' : r.fc >= r.target * 0.85 ? 'info' : 'warn'}>{fmt.p(r.target ? r.fc / r.target : 0, 0)}</Pill> },
  ];
  const rcols: Array<Col<(typeof reps)[0]>> = [
    { id: 'rep', label: 'Rep', cell: (r) => <span className="td-cellmain"><Avatar name={r.name} size={24} /><span><b>{r.name}</b><small>{r.role}</small></span></span>, sort: (a, b) => a.name.localeCompare(b.name) },
    { id: 'won', label: 'Closed won', align: 'right', cell: (r) => fm.m(r.won), sort: (a, b) => a.won - b.won }, { id: 'q', label: 'Quota', align: 'right', hideBelow: 'sm', cell: (r) => fm.m(r.q), sort: (a, b) => a.q - b.q },
    { id: 'att', label: 'Attainment', w: '24%', cell: (r) => <div className="ts-att"><b>{fmt.p(r.won / r.q, 0)}</b><Progress value={r.won / r.q} tone={r.won / r.q >= 0.5 ? 'primary' : 'signal'} label={`${r.name} quota attainment`} /></div>, sort: (a, b) => a.won / a.q - b.won / b.q },
    { id: 'fc', label: 'Forecast', align: 'right', hideBelow: 'md', cell: (r) => <>{fm.m(r.fc)} <span className="td-muted">· {fmt.p(r.fc / r.q, 0)}</span></>, sort: (a, b) => a.fc / a.q - b.fc / b.q },
    { id: 'cov', label: 'Coverage', align: 'right', hideBelow: 'md', cell: (r) => (r.cov ? `${r.cov.toFixed(1)}×` : 'Met'), sort: (a, b) => a.cov - b.cov }, { id: 'rate', label: 'Win rate', align: 'right', hideBelow: 'sm', cell: (r) => fmt.p(r.rate, 0), sort: (a, b) => a.rate - b.rate },
    { id: 'cy', label: 'Cycle', align: 'right', hideBelow: 'md', cell: (r) => (r.cycle ? `${Math.round(r.cycle)}d` : '—'), sort: (a, b) => a.cycle - b.cycle },
  ];
  const reasons = (wl === 'lost' ? lost.map((l) => ({ why: l.why, v: l.amount })) : won.map((d) => ({ why: WIN_WHY[d.id] ?? 'Other', v: d.amount })));
  const rank = [...new Set(reasons.map((r) => r.why))].map((why) => ({ label: why, value: reasons.filter((r) => r.why === why).length, sub: fm.k(add(reasons.filter((r) => r.why === why), (x) => x.v)) })).sort((a, b) => b.value - a.value);
  const lcols: Array<Col<(typeof lost)[0]>> = [{ id: 'c', label: 'Company', cell: (r) => <b>{r.company}</b> }, { id: 'o', label: 'Owner', hideBelow: 'sm', cell: (r) => r.owner }, { id: 's', label: 'Lost at', hideBelow: 'sm', cell: (r) => cfg.stages.find((s) => s.id === r.at)?.label ?? r.at }, { id: 'a', label: 'Amount', align: 'right', cell: (r) => fm.m(r.amount), sort: (a, b) => a.amount - b.amount }, { id: 'w', label: 'Reason', cell: (r) => r.why }];
  const wcols: Array<Col<Deal>> = [{ id: 'c', label: 'Company', cell: (r) => <b>{r.company}</b> }, { id: 'o', label: 'Owner', hideBelow: 'sm', cell: (r) => r.owner }, { id: 'y', label: 'Cycle', hideBelow: 'sm', align: 'right', cell: (r) => `${cycleDays(r)}d` }, { id: 'a', label: 'Amount', align: 'right', cell: (r) => fm.m(r.amount), sort: (a, b) => a.amount - b.amount }, { id: 'w', label: 'Reason', cell: (r) => WIN_WHY[r.id] ?? 'Other' }];

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = tab === 'forecast' ? [['Month', 'Target', 'Closed won', 'Weighted open', 'Forecast'], ...months.map((m) => [m.m, m.target, m.wonV, Math.round(m.wt), Math.round(m.fc)])]
      : tab === 'leaderboard' ? [['Rep', 'Closed won', 'Quota', 'Attainment', 'Forecast'], ...reps.map((r) => [r.name, r.won, r.q, fmt.p(r.won / r.q, 0), Math.round(r.fc)])]
      : tab === 'funnel' ? [['Stage', 'Deals reached', 'Value reached'], ...reached.map((r) => [r.s.label, r.n, r.v])] : [['Reason', wl === 'lost' ? 'Lost deals' : 'Won deals'], ...rank.map((r) => [r.label, r.value])];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')], { type: 'text/csv' })); a.download = `report-${tab}.csv`; a.click(); URL.revokeObjectURL(a.href); announce(`Exported the ${tab} report to CSV`);
  };
  const q4 = avg(cyc); const q3 = CYCLE_PRIOR[2]!.avg;
  return (
    <>
      <ViewHead ref={headRef} title="Reports" sub={`Q4 2026 · ${scopeNote} · amounts in ${cfg.cur}`}>
        <label className="ts-select"><span className="td-sr">Report scope</span><select value={scope} onChange={(e) => { setScope(e.target.value); announce(`Report scope: ${e.target.value === 'all' ? 'whole team' : e.target.value}`); }}><option value="all">Whole team</option>{REPS.map((r) => <option key={r.name}>{r.name}</option>)}</select><svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" className="td-icon"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.75" /></svg></label>
        <Button icon="file" onClick={exportCsv}>Export CSV</Button>
      </ViewHead>
      <Tabs<Tab> label="Report" value={tab} onChange={setTab} tabs={[{ id: 'forecast', label: 'Forecast' }, { id: 'leaderboard', label: 'Leaderboard' }, { id: 'funnel', label: 'Funnel and cycle' }, { id: 'winloss', label: 'Win and loss' }]} />
      {tab === 'forecast' && <>
        <div className="td-kpis">
          <Kpi label="Q4 forecast" value={fm.m(fc)} hint={`${fmt.p(quota ? fc / quota : 0, 0)} of target`} tone="signal" /><Kpi label="Q4 target" value={fm.m(quota)} hint={cfg.phasing.join(' / ') + '% by month'} />
          <Kpi label={gap > 0 ? 'Gap to target' : 'Ahead of target'} value={fm.m(Math.abs(gap))} hint={gap > 0 ? `${(sum(open) / gap).toFixed(1)}× covered by open pipeline` : 'target covered'} /><Kpi label="Win rate" value={fmt.p(winRate, 0)} hint={`${won.length} won, ${lost.length} lost`} tone="signal" />
        </div>
        <Panel id="tv-rf" title="Forecast by month" sub="Closed won plus open deals weighted by win probability, grouped by close date" actions={<span className="ts-legend"><i />Won<i className="is-w" />Weighted open<i className="is-t" />Target</span>}>
          <BarChart ariaLabel="Forecast by month against target, in US dollars" labels={[...MONTHS]} height={240} format={fm.k}
            series={[{ id: 'w', label: 'Closed won', data: months.map((m) => m.wonV) }, { id: 'o', label: 'Weighted open', data: months.map((m) => Math.round(m.wt)), color: 'var(--signal, #0f766e)' }, { id: 't', label: 'Target', data: months.map((m) => Math.round(m.target)), color: 'color-mix(in srgb, var(--ink, #15130e) 42%, transparent)' }]} />
          <p className="ts-chartnote"><b>{worst.fc < worst.target ? `${worst.m} is the gap` : 'Every month is on target'}</b>{worst.fc < worst.target && <span>{fm.m(worst.target - worst.fc)} short in {worst.m}: add pipeline that closes then</span>}<span>{open.length} open deals, {fm.m(sum(open))} unweighted</span></p>
        </Panel>
        <Panel id="tv-rm" title="Month by month" flush><Table caption="Forecast by month" cols={mcols} rows={[...months, { m: 'Quarter' as (typeof MONTHS)[number], wonV: sum(won), wt: sum(open, w), target: quota, fc }]} rowKey={(r) => r.m} /></Panel>
      </>}
      {tab === 'leaderboard' && <Panel id="tv-rl" title="Rep leaderboard" sub="Quota attainment is closed won against Q4 quota. Coverage is open pipeline against the quota left to win." flush>
        <Table caption="Rep leaderboard, sortable" cols={rcols} rows={reps} rowKey={(r) => r.name} selected={scope} />
        <p className="tv-foot">Team: {fm.m(add(reps, (r) => r.won))} won of {fm.m(teamQuota(cfg))} quota ({fmt.p(add(reps, (r) => r.won) / teamQuota(cfg), 0)}). Quotas are set in Settings.</p>
      </Panel>}
      {tab === 'funnel' && <div className="tv-two-col">
        <Panel id="tv-rfu" title="Stage conversion" sub="Deals that reached each stage, including lost ones" actions={<Segmented label="Funnel measure" value={fun} onChange={setFun} options={[{ id: 'count', label: 'Deals' }, { id: 'value', label: 'Value' }]} />}>
          <ol className="tv-funnel">{reached.map((r, i) => { const n = fun === 'count' ? r.n : r.v, top = fun === 'count' ? reached[0]!.n : reached[0]!.v, prev = i ? (fun === 'count' ? reached[i - 1]!.n : reached[i - 1]!.v) : n;
            return <li key={r.s.id}><span className="tv-fl">{r.s.label}</span><span className="tv-fbar"><i style={{ width: `${top ? (n / top) * 100 : 0}%` }} /></span><b>{fun === 'count' ? n : fm.k(n)}</b><small>{i ? `${fmt.p(prev ? n / prev : 0, 0)} of ${reached[i - 1]!.s.label}` : 'All deals'}</small></li>; })}</ol>
          <p className="ts-chartnote"><b>Lead to won: {fmt.p(reached[0]!.n ? reached[reached.length - 1]!.n / reached[0]!.n : 0, 0)}</b><span>Biggest drop: {(() => { let b = 1, bi = 1; reached.forEach((r, i) => { if (i && r.n / (reached[i - 1]!.n || 1) < b) { b = r.n / (reached[i - 1]!.n || 1); bi = i; } }); return `${reached[bi - 1]!.s.label} to ${reached[bi]!.s.label} (${fmt.p(1 - b, 0)} lost)`; })()}</span></p>
        </Panel>
        <Panel id="tv-rc" title="Sales cycle length" sub="Average days from first contact to close, won deals" actions={<span className="ts-chartnote tv-nobr"><b>{q4 ? days(q4) : '—'}</b>{q4 ? <Delta value={q4 - q3} good="down" suffix=" days" /> : null}</span>}>
          <BarChart ariaLabel="Average sales cycle in days by quarter" labels={[...CYCLE_PRIOR.map((c) => c.q), 'Q4']} height={170} format={(v) => `${Math.round(v)}d`} series={[{ id: 'c', label: 'Average cycle', data: [...CYCLE_PRIOR.map((c) => c.avg), Math.round(q4)] }]} />
          <h3 className="tv-sub">By deal size, Q4</h3>
          <RankList tone="signal" format={(v) => `${Math.round(v)}d`} rows={bands.filter((b) => b.ds.length).map((b) => ({ label: b.l, value: avg(b.ds.map(cycleDays)), sub: `${b.ds.length} won` }))} />
          {won.length === 0 && <Empty title="No won deals" text="Nothing has closed in this scope yet." />}
        </Panel>
      </div>}
      {tab === 'winloss' && <div className="tv-two-col">
        <Panel id="tv-rw" title={wl === 'lost' ? 'Why we lose' : 'Why we win'} sub={`${wl === 'lost' ? lost.length : won.length} deals, ${fm.m(add(reasons, (x) => x.v))}`} actions={<Segmented label="Outcome" value={wl} onChange={setWl} options={[{ id: 'lost', label: 'Lost' }, { id: 'won', label: 'Won' }]} />}>
          {rank.length ? <RankList tone={wl === 'won' ? 'signal' : 'primary'} rows={rank} format={(v) => `${v} ${v === 1 ? 'deal' : 'deals'}`} /> : <Empty title="Nothing to show" text="No deals in this scope." />}
        </Panel>
        <Panel id="tv-rd" title={wl === 'lost' ? 'Lost deals' : 'Won deals'} flush>
          {wl === 'lost' ? <Table caption="Lost deals" cols={lcols} rows={lost} rowKey={(r) => r.id} empty="No lost deals in this scope." /> : <Table caption="Won deals" cols={wcols} rows={won} rowKey={(r) => r.id} empty="No won deals in this scope." />}
        </Panel>
      </div>}
    </>
  );
}
