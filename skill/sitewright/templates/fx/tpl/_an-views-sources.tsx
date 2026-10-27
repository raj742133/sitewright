'use client';
import { useMemo, useRef, useState } from 'react';
import { AreaChart, Delta, Kpi, PALETTE, Panel, Sparkline, Table, fmt, type Col, type Series } from './_dash';
import { CHANNELS, getCampaigns, getChannels, getSite, sum, type CampRow, type ChannelRow } from './_an-data';
import { Head, RangeSeg, Toggle, type ViewProps } from './_an-ui';

type Sel = { kind: 'all' } | { kind: 'channel' | 'campaign'; id: string };
const PREV = 'color-mix(in srgb, var(--ink, #15130e) 38%, transparent)';
const dot = (c: string) => <i className="ta-dot" style={{ background: c }} aria-hidden="true" />;

export default function SourcesView({ range, setRange, focus }: ViewProps) {
  const site = getSite(range); const ch = getChannels(range); const camps = getCampaigns(range);
  const [compare, setCompare] = useState(false); const [sel, setSel] = useState<Sel>({ kind: 'all' });
  const chartRef = useRef<HTMLDivElement>(null);
  const signups = sum(ch.map((c) => c.signups)), prevSignups = sum(ch.map((c) => c.prevSignups));
  const top = [...ch].sort((a, b) => b.visitors - a.visitors)[0]!;
  const chIdx = (id: string) => CHANNELS.findIndex((c) => c.id === id);

  const chart = useMemo(() => {
    let title = 'Visitors by channel', cur: number[] | null = null, prev: number[] = site.prev, name = 'All channels';
    if (sel.kind === 'channel') { const c = ch.find((x) => x.id === sel.id)!; cur = c.daily; prev = c.prevDaily; name = c.label; title = `Visitors from ${c.label}`; }
    if (sel.kind === 'campaign') { const c = camps.rows.find((x) => x.id === sel.id)!; cur = c.daily; prev = c.prevDaily; name = c.id; title = `Campaign ${c.id}`; }
    if (sel.kind === 'all' && compare) { cur = site.cur; title = 'Total visitors'; }
    const series: Series[] = cur ? [{ id: 'cur', label: name, data: cur, color: sel.kind === 'channel' ? PALETTE[chIdx(sel.id) % 5] : undefined }, ...(compare ? [{ id: 'prev', label: 'Previous period', data: prev, color: PREV }] : [])]
      : ch.map((c, k) => ({ id: c.id, label: c.label, data: c.daily, color: PALETTE[k % 5] }));
    return { title, series, stacked: !cur };
  }, [sel, compare, ch, camps, site]);

  const setCh = (id: string) => setSel({ kind: 'channel', id });
  const pickChannel = (id: string) => setSel((s) => (s.kind === 'channel' && s.id === id ? { kind: 'all' } : { kind: 'channel', id }));
  const pickCamp = (id: string) => { setSel({ kind: 'campaign', id }); chartRef.current?.scrollIntoView({ block: 'nearest' }); };
  const isSel = (kind: string, id: string) => sel.kind === kind && (sel as { id?: string }).id === id;

  const chCols: Array<Col<ChannelRow>> = [
    { id: 'ch', label: 'Channel', cell: (c) => <button type="button" className="ta-rowbtn is-row" aria-pressed={isSel('channel', c.id)} onClick={() => setCh(c.id)}>{dot(PALETTE[chIdx(c.id) % 5]!)}<b>{c.label}</b></button>, sort: (a, b) => a.label.localeCompare(b.label) },
    { id: 'v', label: 'Visitors', align: 'right', cell: (c) => fmt.n(c.visitors), sort: (a, b) => a.visitors - b.visitors },
    ...(compare ? [{ id: 'pv', label: 'Previous', align: 'right' as const, hideBelow: 'sm' as const, cell: (c: ChannelRow) => <span className="td-muted">{fmt.n(c.prevVisitors)}</span>, sort: (a: ChannelRow, b: ChannelRow) => a.prevVisitors - b.prevVisitors }, { id: 'd', label: 'Change', align: 'right' as const, cell: (c: ChannelRow) => <Delta value={c.delta} />, sort: (a: ChannelRow, b: ChannelRow) => a.delta - b.delta }] : []),
    { id: 'sh', label: 'Share', align: 'right', hideBelow: 'sm', cell: (c) => <span className="ta-share"><i style={{ width: `${c.share * 100 * 2}%` }} />{fmt.p(c.share, 1)}</span>, sort: (a, b) => a.share - b.share },
    { id: 's', label: 'Signups', align: 'right', hideBelow: 'sm', cell: (c) => fmt.n(c.signups), sort: (a, b) => a.signups - b.signups },
    { id: 'r', label: 'Signup rate', align: 'right', hideBelow: 'md', cell: (c) => fmt.p(c.rate, 1), sort: (a, b) => a.rate - b.rate },
    { id: 't', label: 'Trend', align: 'right', hideBelow: 'md', cell: (c) => <Sparkline data={c.daily} tone="signal" width={64} height={22} fill={false} /> },
  ];
  const cpCols: Array<Col<CampRow>> = [
    { id: 'c', label: 'Campaign', cell: (c) => <button type="button" className="ta-rowbtn" aria-pressed={isSel('campaign', c.id)} onClick={() => pickCamp(c.id)}><b>{c.id}</b><small className="td-mono">{c.source} / {c.medium}</small></button>, sort: (a, b) => a.id.localeCompare(b.id) },
    { id: 'h', label: 'Channel', hideBelow: 'sm', cell: (c) => <span className="td-muted">{c.channelLabel}</span>, sort: (a, b) => a.channelLabel.localeCompare(b.channelLabel) },
    { id: 'v', label: 'Visitors', align: 'right', cell: (c) => fmt.n(c.visitors), sort: (a, b) => a.visitors - b.visitors },
    ...(compare ? [{ id: 'd', label: 'Change', align: 'right' as const, cell: (c: CampRow) => <Delta value={c.delta} />, sort: (a: CampRow, b: CampRow) => a.delta - b.delta }] : []),
    { id: 's', label: 'Signups', align: 'right', hideBelow: 'sm', cell: (c) => fmt.n(c.signups), sort: (a, b) => a.signups - b.signups },
    { id: 'r', label: 'Signup rate', align: 'right', hideBelow: 'md', cell: (c) => fmt.p(c.rate, 1), sort: (a, b) => a.rate - b.rate },
    { id: 't', label: 'Trend', align: 'right', hideBelow: 'md', cell: (c) => <Sparkline data={c.daily} tone={c.delta >= 0 ? 'signal' : 'bad'} width={64} height={22} fill={false} /> },
  ];
  const cmp = (cur: number, prev: number) => (compare ? ((cur - prev) / prev) * 100 : undefined);
  return (
    <>
      <Head title="Sources" sub={`Where visitors come from · last ${site.n} days${compare ? `, compared with the ${site.n} before` : ''}`} focus={focus}>
        <Toggle checked={compare} onChange={setCompare} label="Compare to previous period" /><RangeSeg value={range} onChange={setRange} />
      </Head>
      <div className="td-kpis">
        <Kpi label="Visitors" value={fmt.k(site.visitors)} delta={cmp(site.visitors, site.prevVisitors)} hint={compare ? `vs ${fmt.k(site.prevVisitors)}` : `${fmt.n(site.visitors)} unique`} />
        <Kpi label="Signups" value={fmt.n(signups)} delta={cmp(signups, prevSignups)} hint="Start free trial goal" tone="signal" />
        <Kpi label="Signup rate" value={fmt.p(signups / site.visitors, 2)} delta={cmp(signups / site.visitors, prevSignups / site.prevVisitors)} hint="signups / visitors" />
        <Kpi label="Top channel" value={top.label} hint={`${fmt.p(top.share, 0)} of visitors`} tone="signal" />
      </div>
      <div ref={chartRef}>
        <Panel id="ts-c" title={chart.title} sub={chart.stacked ? 'Stacked by channel · pick a channel below to isolate it' : compare ? 'Solid is this period, grey is the previous period' : 'Visitors per day'}
          actions={sel.kind !== 'all' ? <button type="button" className="td-btn is-sm" onClick={() => setSel({ kind: 'all' })}>Show all channels</button> : undefined}>
          {chart.stacked && <ul className="ta-legend2">{ch.map((c, k) => <li key={c.id}><button type="button" onClick={() => pickChannel(c.id)}>{dot(PALETTE[k % 5]!)}{c.label}<b>{fmt.k(c.visitors)}</b></button></li>)}</ul>}
          <AreaChart ariaLabel={`${chart.title}, per day over the last ${site.n} days`} labels={site.labels} height={248} stacked={chart.stacked} series={chart.series} />
        </Panel>
      </div>
      <Panel id="ts-ch" title="Channels" sub={`${fmt.n(site.visitors)} visitors · ${fmt.n(signups)} signups · select a row to chart it`} flush>
        <Table caption="Channels with visitors, signups and trend" cols={chCols} rows={ch} rowKey={(c) => c.id} selected={sel.kind === 'channel' ? sel.id : undefined} onRow={(c) => setCh(c.id)} />
      </Panel>
      <Panel id="ts-cp" title="Campaigns" sub={`UTM-tagged traffic · ${fmt.n(camps.tagged)} visitors (${fmt.p(camps.tagged / site.visitors, 0)} of all) · ${fmt.n(camps.taggedSignups)} signups`} flush>
        <Table caption="UTM campaigns with visitors, signups and trend" cols={cpCols} rows={camps.rows} rowKey={(c) => c.id} selected={sel.kind === 'campaign' ? sel.id : undefined} onRow={(c) => pickCamp(c.id)} />
      </Panel>
    </>
  );
}
