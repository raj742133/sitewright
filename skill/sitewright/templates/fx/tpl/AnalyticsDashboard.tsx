'use client';
import { useMemo, useState } from 'react';
import { AreaChart, Button, Donut, Kpi, Delta, PageHeader, Panel, Preview, RankList, Segmented, Shell, Sparkline, Table, fmt, series, type Col, type NavEntry } from './_dash';

type Range = '7d' | '28d' | '90d';
const NAV: NavEntry[] = [
  { id: 'overview', label: 'Overview', icon: 'chart' }, { id: 'pages', label: 'Pages', icon: 'file' }, { id: 'sources', label: 'Sources', icon: 'link' },
  { id: 'audience', label: 'Audience', icon: 'users' }, { id: 'goals', label: 'Goals', icon: 'star', badge: 3 }, { id: 'settings', label: 'Settings', icon: 'settings' },
];
const DAYS: Record<Range, number> = { '7d': 7, '28d': 28, '90d': 90 };
const dayLabels = (n: number) => Array.from({ length: n }, (_, i) => { const d = new Date(Date.UTC(2026, 9, 24 - (n - 1 - i))); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }); });
interface Page { path: string; title: string; visitors: number; views: number; bounce: number; trend: number[] }
const PAGES: Page[] = [
  { path: '/', title: 'Home', visitors: 18420, views: 26110, bounce: 0.38, trend: series(1, 14, { base: 60, trend: 0.5 }) },
  { path: '/pricing', title: 'Pricing', visitors: 7310, views: 9940, bounce: 0.31, trend: series(2, 14, { base: 30, trend: 0.8 }) },
  { path: '/blog/launch-notes', title: 'Launch notes', visitors: 6120, views: 6890, bounce: 0.57, trend: series(3, 14, { base: 22, trend: -0.2 }) },
  { path: '/docs/getting-started', title: 'Getting started', visitors: 5480, views: 11200, bounce: 0.22, trend: series(4, 14, { base: 24, trend: 0.3 }) },
  { path: '/changelog', title: 'Changelog', visitors: 3190, views: 3820, bounce: 0.44, trend: series(5, 14, { base: 12, trend: 0.1 }) },
  { path: '/contact', title: 'Contact', visitors: 1740, views: 1910, bounce: 0.49, trend: series(6, 14, { base: 7, trend: -0.1 }) },
];
const SOURCES = [{ label: 'Google', value: 15980, sub: 'organic' }, { label: 'Direct', value: 11240 }, { label: 'newsletter', value: 6020, sub: 'email' }, { label: 'github.com', value: 4410, sub: 'referral' }, { label: 'x.com', value: 2870, sub: 'social' }, { label: 'news.ycombinator.com', value: 1960, sub: 'referral' }];
const COUNTRIES = [{ label: 'United States', value: 17120 }, { label: 'Germany', value: 5640 }, { label: 'United Kingdom', value: 4980 }, { label: 'India', value: 4310 }, { label: 'Canada', value: 3020 }];
const LIVE = [{ path: '/pricing', n: 41 }, { path: '/', n: 37 }, { path: '/docs/getting-started', n: 29 }, { path: '/blog/launch-notes', n: 21 }, { path: '/changelog', n: 14 }];

export default function AnalyticsDashboard({ brand = 'Fieldnote' }: { brand?: string }) {
  const [range, setRange] = useState<Range>('28d'); const [active, setActive] = useState('overview');
  const n = DAYS[range];
  const { labels, cur, prev, total, prevTotal } = useMemo(() => {
    const cur = series(11, n, { base: 1500, trend: 0.28, wave: 0.18 }), prev = series(12, n, { base: 1380, trend: 0.18, wave: 0.18 });
    return { labels: dayLabels(n), cur, prev, total: cur.reduce((a, b) => a + b, 0), prevTotal: prev.reduce((a, b) => a + b, 0) };
  }, [n]);
  const views = Math.round(total * 2.72), bounce = 0.418 - (n === 7 ? 0.012 : n === 90 ? -0.009 : 0);
  const cols: Array<Col<Page>> = [
    { id: 'page', label: 'Page', cell: (p) => <div className="td-cellmain"><div><b>{p.title}</b><small className="td-mono">{p.path}</small></div></div>, sort: (a, b) => a.title.localeCompare(b.title) },
    { id: 'visitors', label: 'Visitors', align: 'right', cell: (p) => fmt.n(p.visitors), sort: (a, b) => a.visitors - b.visitors },
    { id: 'views', label: 'Views', align: 'right', hideBelow: 'sm', cell: (p) => fmt.n(p.views), sort: (a, b) => a.views - b.views },
    { id: 'bounce', label: 'Bounce', align: 'right', hideBelow: 'sm', cell: (p) => fmt.p(p.bounce, 0), sort: (a, b) => a.bounce - b.bounce },
    { id: 'trend', label: 'Trend', align: 'right', hideBelow: 'md', cell: (p) => <Sparkline data={p.trend} tone={p.trend[13]! >= p.trend[0]! ? 'signal' : 'bad'} width={72} height={22} fill={false} /> },
  ];
  return (
    <Shell brand={brand} nav={NAV} active={active} onNav={setActive} title="Overview" crumbs={[brand, 'fieldnote.dev', 'Overview']} searchHint="Jump to a page">
      <PageHeader title="Overview" sub={`fieldnote.dev · last ${n} days, compared with the ${n} before`}>
        <Segmented label="Date range" value={range} onChange={setRange} options={[{ id: '7d', label: '7 days' }, { id: '28d', label: '28 days' }, { id: '90d', label: '90 days' }]} />
        <Button icon="file">Export</Button>
      </PageHeader>
      <div className="td-kpis">
        <Kpi label="Visitors" value={fmt.k(total)} delta={((total - prevTotal) / prevTotal) * 100} spark={cur.slice(-14)} hint={`vs ${fmt.k(prevTotal)}`} />
        <Kpi label="Pageviews" value={fmt.k(views)} delta={9.2} spark={prev.slice(-14).map((v, i) => v + cur[cur.length - 14 + i]! * 0.4)} tone="signal" hint="2.7 per visit" />
        <Kpi label="Bounce rate" value={fmt.p(bounce)} delta={-2.1} goodWhen="down" spark={series(21, 14, { base: 40, trend: -0.15, wave: 0.3 })} hint="lower is better" />
        <Kpi label="Visit duration" value="2m 14s" delta={4.6} spark={series(22, 14, { base: 130, trend: 0.2, wave: 0.2 })} tone="signal" hint="median" />
      </div>
      <div className="ta-row">
        <Panel id="ta-v" title="Visitors" sub="Unique visitors per day" actions={<span className="ta-legend"><i />This period<i className="is-prev" />Previous</span>}>
          <AreaChart ariaLabel={`Visitors per day over the last ${n} days`} labels={labels} height={236} series={[{ id: 'cur', label: 'This period', data: cur }, { id: 'prev', label: 'Previous', data: prev, color: 'color-mix(in srgb, var(--ink, #15130e) 38%, transparent)' }]} />
        </Panel>
        <Panel id="ta-r" title="Right now" sub="Visitors on the site" actions={<Delta value={6.3} />}>
          <div className="ta-live"><b>142</b><span><i aria-hidden="true" />online</span></div>
          <ul className="ta-livelist">{LIVE.map((l) => <li key={l.path}><span className="td-mono">{l.path}</span><b>{l.n}</b></li>)}</ul>
        </Panel>
      </div>
      <div className="ta-row3">
        <Panel id="ta-s" title="Sources" sub="Where visitors come from"><RankList rows={SOURCES} tone="signal" /></Panel>
        <Panel id="ta-c" title="Countries"><RankList rows={COUNTRIES} /></Panel>
        <Panel id="ta-d" title="Devices"><Donut ariaLabel="Visitors by device" size={118} parts={[{ label: 'Desktop', value: 24180 }, { label: 'Mobile', value: 21040 }, { label: 'Tablet', value: 3010 }]} center={<><b className="ta-big">48.2k</b><small className="td-muted">visitors</small></>} /></Panel>
      </div>
      <Panel id="ta-p" title="Top pages" sub="Click a column to sort" flush><Table caption="Top pages" cols={cols} rows={PAGES} rowKey={(p) => p.path} /></Panel>
    </Shell>
  );
}

export function Demo() { return <Preview w={1280} h={150}><AnalyticsDashboard /></Preview>; }
