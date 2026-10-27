'use client';
import { useMemo, useState } from 'react';
import { AreaChart, BarChart, Button, Kpi, Panel, Pill, Segmented, Table, fmt, type Col, type Series } from './_dash';
import { channelName, fmtDur, type Conv, type Priority } from './_inbox';
import { CHANNELS, DAYS, HIST, PAST_BREACHES, PERIODS, PRIORITIES, dayName, median, share, slaMinutes, total, volumeTotal, type Period, type Settings } from './_inbox-store';
import { Heatmap, TrendLine } from './_inbox-views-charts';
import { SelectField, ViewHead } from './_inbox-views-ui';

const AGENTS = [{ name: 'Dana Ortiz', w: 37, frt: 0.88, res: 1.05, cs: 1 }, { name: 'Marcus Lee', w: 33, frt: 1, res: 0.95, cs: 0 }, { name: 'Priya Nair', w: 30, frt: 1.12, res: 1, cs: -1 }];
const PRI_TONE: Record<Priority, 'bad' | 'warn' | 'neutral'> = { urgent: 'bad', high: 'warn', normal: 'neutral', low: 'neutral' };
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
const mean = (a: number[]) => total(a) / (a.length || 1);

interface Breach { key: string; ago: number; num: number; subject: string; who: string; pri: Priority; over: number; agent: string; convId?: string }
interface AgentRow { name: string; n: number; frt: number; res: number; csat: number; open: number }

export default function Reports({ convs, settings, onOpenConv }: { convs: Conv[]; settings: Settings; onOpenConv: (id: string) => void }) {
  const [period, setPeriod] = useState<Period>('30'); const [pri, setPri] = useState('all');
  const n = Number(period), from = DAYS - n, pFrom = DAYS - 2 * n;
  const d = useMemo(() => {
    const labels = Array.from({ length: n }, (_, i) => dayName(from + i));
    const frt = HIST.frt.slice(from), res = HIST.res.slice(from);
    // CSAT as a 7-day rolling mean so the trend reads
    const roll = HIST.csat.map((_, i, a) => Math.round(mean(a.slice(Math.max(0, i - 6), i + 1)))); const csat = roll.slice(from);
    const bucket = n === 90 ? 6 : 1; const groups = Math.ceil(n / bucket);
    const vol: Series[] = CHANNELS.map((c, k) => ({ id: c, label: channelName[c], color: ['var(--primary, #c2410c)', 'var(--signal, #0f766e)', 'color-mix(in srgb, var(--ink, #15130e) 55%, transparent)'][k], data: Array.from({ length: groups }, (_, g) => total(HIST.vol[c].slice(from + g * bucket, from + (g + 1) * bucket))) }));
    const vLabels = Array.from({ length: groups }, (_, g) => dayName(from + g * bucket));
    const vTotal = volumeTotal(from, DAYS), vPrev = volumeTotal(pFrom, from);
    const past = PAST_BREACHES.filter((b) => b.ago < n);
    const live = convs.filter((c) => c.status === 'open' && c.slaLeft !== null && c.slaLeft <= 0);
    const breaches: Breach[] = [...live.map((c) => ({ key: c.id, ago: 0, num: c.num, subject: c.subject, who: c.cust.name, pri: c.priority, over: -c.slaLeft!, agent: c.assignee ?? 'Unassigned', convId: c.id })), ...past.map((b) => ({ key: `p${b.num}`, ...b }))];
    const prevBreaches = PAST_BREACHES.filter((b) => b.ago >= n && b.ago < 2 * n).length;
    const open = (a: string) => convs.filter((c) => c.status === 'open' && c.assignee === a).length;
    const split = share(vTotal, AGENTS.map((a) => a.w)); const f = median(frt), r = median(res), cs = mean(csat);
    const agents: AgentRow[] = AGENTS.map((a, i) => ({ name: a.name, n: split[i]!, frt: Math.round(f * a.frt), res: Math.round(r * a.res * 10) / 10, csat: Math.min(99, Math.round(cs) + a.cs), open: open(a.name) }));
    // hour x weekday: a working-day curve, scaled so every cell adds up to the period's volume
    const w: number[] = []; for (let dw = 0; dw < 7; dw++) for (let h = 0; h < 24; h++) w.push((dw > 4 ? 0.3 : 1) * (0.05 + Math.exp(-((h - 10) ** 2) / 8) + 0.8 * Math.exp(-((h - 15) ** 2) / 6) + 0.2 * Math.exp(-((h - 20) ** 2) / 10)));
    const flat = share(vTotal, w); const cells = Array.from({ length: 7 }, (_, dw) => flat.slice(dw * 24, dw * 24 + 24));
    return { labels, frt, res, csat, vol, vLabels, vTotal, vPrev, breaches, prevBreaches, agents, cells, f, r, cs, pf: median(HIST.frt.slice(pFrom, from)), pr: median(HIST.res.slice(pFrom, from)), pcs: mean(HIST.csat.slice(pFrom, from)) };
  }, [n, from, pFrom, convs]);
  const met = 1 - d.breaches.length / Math.max(1, d.vTotal), metPrev = 1 - d.prevBreaches / Math.max(1, d.vPrev);
  const shownBreaches = d.breaches.filter((b) => pri === 'all' || b.pri === pri);

  const agentCols: Array<Col<AgentRow>> = [
    { id: 'name', label: 'Agent', sort: (a, b) => a.name.localeCompare(b.name), cell: (r) => <b>{r.name}</b> },
    { id: 'n', label: 'Conversations', align: 'right', sort: (a, b) => a.n - b.n, cell: (r) => fmt.n(r.n) },
    { id: 'frt', label: 'First response', align: 'right', sort: (a, b) => a.frt - b.frt, cell: (r) => fmtDur(r.frt) },
    { id: 'res', label: 'Resolution', align: 'right', hideBelow: 'sm', sort: (a, b) => a.res - b.res, cell: (r) => `${r.res}h` },
    { id: 'csat', label: 'CSAT', align: 'right', sort: (a, b) => a.csat - b.csat, cell: (r) => `${r.csat}%` },
    { id: 'open', label: 'Open now', align: 'right', sort: (a, b) => a.open - b.open, cell: (r) => (r.open ? <b>{r.open}</b> : <span className="td-muted">0</span>) },
  ];
  const breachCols: Array<Col<Breach>> = [
    { id: 'c', label: 'Conversation', cell: (b) => <div className="td-cellmain"><div><b>{b.subject}</b><small>#{b.num} · {b.who}</small></div></div> },
    { id: 'pri', label: 'Priority', sort: (a, b) => PRIORITIES.indexOf(a.pri) - PRIORITIES.indexOf(b.pri), cell: (b) => <Pill tone={PRI_TONE[b.pri]}>{cap(b.pri)}</Pill> },
    { id: 't', label: 'Target', align: 'right', hideBelow: 'sm', cell: (b) => fmtDur(slaMinutes(settings, b.pri)) },
    { id: 'o', label: 'Over by', align: 'right', sort: (a, b) => a.over - b.over, cell: (b) => <b className="tv-bad">{fmtDur(b.over)}</b> },
    { id: 'a', label: 'Agent', hideBelow: 'md', sort: (a, b) => a.agent.localeCompare(b.agent), cell: (b) => b.agent },
    { id: 'w', label: 'When', sort: (a, b) => b.ago - a.ago, cell: (b) => (b.convId ? <Pill tone="bad">Overdue now</Pill> : <span className="td-muted">{b.ago === 0 ? 'Today' : dayName(DAYS - 1 - b.ago)}</span>) },
    { id: 'go', label: '', w: '1%', cell: (b) => (b.convId ? <Button small onClick={() => onOpenConv(b.convId!)} label={`Open conversation ${b.num}`}>Open</Button> : null) },
  ];
  const per = PERIODS.find((p) => p.id === period)!.label;
  return (
    <>
      <ViewHead title="Reports" sub={`Support performance over the last ${per.toLowerCase()}, to Sat 24 Oct 2026. Charts are in UTC.`}>
        <Segmented label="Reporting period" value={period} options={PERIODS.map((p) => ({ id: p.id, label: p.label }))} onChange={setPeriod} />
      </ViewHead>
      <div className="td-kpis">
        <Kpi label="Median first response" value={fmtDur(d.f)} delta={pct(d.f, d.pf)} goodWhen="down" spark={d.frt} tone="signal" hint="vs previous period" />
        <Kpi label="Median resolution" value={`${d.r.toFixed(1)}h`} delta={pct(d.r, d.pr)} goodWhen="down" spark={d.res} tone="signal" hint="vs previous period" />
        <Kpi label="CSAT" value={`${Math.round(d.cs)}%`} delta={d.cs - d.pcs} goodWhen="up" spark={d.csat} hint="pts vs previous" />
        <Kpi label="Met first-response SLA" value={fmt.p(met, 1)} delta={(met - metPrev) * 100} goodWhen="up" hint={`${d.breaches.length} breached of ${fmt.n(d.vTotal)}`} />
      </div>
      <div className="tv-g2">
        <Panel id="r1" title="First response time" sub={`Median per day, minutes. High-priority target ${settings.sla.high.frt}m.`}><AreaChart labels={d.labels} series={[{ id: 'f', label: 'Median first response', data: d.frt, color: 'var(--primary, #c2410c)' }]} format={(v) => `${Math.round(v)}m`} height={210} ariaLabel={`Median first response time per day, last ${per}`} /></Panel>
        <Panel id="r2" title="Resolution time" sub="Median per day, hours from first message to resolved."><AreaChart labels={d.labels} series={[{ id: 'r', label: 'Median resolution', data: d.res, color: 'var(--signal, #0f766e)' }]} format={(v) => `${+v.toFixed(1)}h`} height={210} ariaLabel={`Median resolution time per day, last ${per}`} /></Panel>
      </div>
      <div className="tv-g2">
        <Panel id="r3" title="Volume by channel" sub={`${fmt.n(d.vTotal)} conversations${n === 90 ? ', grouped in 6-day blocks' : ''}.`}
          actions={<span className="tv-legend">{d.vol.map((s) => <span key={s.id}><i style={{ background: s.color }} />{s.label} <b>{fmt.n(total(s.data))}</b></span>)}</span>}>
          <BarChart labels={d.vLabels} series={d.vol} stacked height={210} format={(v) => String(Math.round(v))} ariaLabel={`Conversations by channel, last ${per}`} />
        </Panel>
        <Panel id="r4" title="Customer satisfaction" sub="Share of positive ratings, 7-day average.">
          <TrendLine labels={d.labels} data={d.csat} min={80} max={100} height={210} name="CSAT" ariaLabel={`CSAT trend, last ${per}`} />
        </Panel>
      </div>
      <Panel id="r5" title="Volume by weekday and hour" sub="When people write in. Darker means busier. Staff the 09:00 to 11:00 and 14:00 to 16:00 peaks."><Heatmap cells={d.cells} /></Panel>
      <Panel id="r6" title="Agents" sub={`${fmt.n(total(d.agents.map((a) => a.n)))} conversations handled · open now follows the inbox`} flush>
        <Table cols={agentCols} rows={d.agents} rowKey={(r) => r.name} caption="Agent performance" />
      </Panel>
      <Panel id="r7" title="SLA breaches" sub={`${d.breaches.length} in the last ${per.toLowerCase()} against the first-response targets in Settings.`}
        actions={<SelectField value={pri} onChange={setPri} label="Filter breaches by priority" options={[{ id: 'all', label: 'All priorities' }, ...PRIORITIES.map((p) => ({ id: p, label: cap(p) }))]} />} flush>
        <Table cols={breachCols} rows={shownBreaches} rowKey={(b) => b.key} caption="SLA breaches" empty={pri === 'all' ? 'No breaches in this period.' : `No ${pri}-priority breaches in this period.`} />
      </Panel>
    </>
  );
}
