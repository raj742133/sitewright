'use client';
import { useMemo, useRef, useState } from 'react';
import { AreaChart, Delta, Kpi, Panel, RankList, Sparkline, Table, Tabs, Empty, fmt, type Col } from './_dash';
import { getPages, getSite, fmtTime, sum, type PageGroup, type PageRow } from './_an-data';
import { Head, RangeSeg, SearchBox, type ViewProps } from './_an-ui';

type Group = 'all' | PageGroup;
const wavg = (rows: PageRow[], key: 'bounce' | 'secs', by: 'views' | 'visitors') => { const w = sum(rows.map((r) => r[by])); return w ? sum(rows.map((r) => r[key] * r[by])) / w : 0; };

export default function PagesView({ range, setRange, focus }: ViewProps) {
  const all = getPages(range); const site = getSite(range);
  const [q, setQ] = useState(''); const [group, setGroup] = useState<Group>('all'); const [sel, setSel] = useState('/pricing');
  const detailRef = useRef<HTMLDivElement>(null); const tableRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => all.filter((p) => (group === 'all' || p.group === group) && (!q || `${p.title} ${p.path}`.toLowerCase().includes(q.toLowerCase()))), [all, q, group]);
  const cur = rows.find((r) => r.path === sel) ?? rows[0];
  const pick = (p: PageRow) => {
    setSel(p.path);
    const d = detailRef.current, t = tableRef.current; if (d && t && d.getBoundingClientRect().top >= t.getBoundingClientRect().bottom - 1) d.scrollIntoView({ block: 'nearest' });
  };
  const views = sum(rows.map((r) => r.views)), prevViews = sum(rows.map((r) => r.prevViews)); const top = [...rows].sort((a, b) => b.views - a.views)[0];
  const tabs: Array<{ id: Group; label: string; count: number }> = [{ id: 'all', label: 'All', count: all.length }, ...(['Marketing', 'Docs', 'Blog', 'App'] as PageGroup[]).map((g) => ({ id: g, label: g, count: all.filter((p) => p.group === g).length }))];
  const cols: Array<Col<PageRow>> = [
    { id: 'page', label: 'Page', cell: (p) => <button type="button" className="ta-rowbtn" aria-pressed={cur?.path === p.path} onClick={() => pick(p)}><b>{p.title}</b><small className="td-mono">{p.path}</small></button>, sort: (a, b) => a.title.localeCompare(b.title) },
    { id: 'views', label: 'Views', align: 'right', cell: (p) => fmt.n(p.views), sort: (a, b) => a.views - b.views },
    { id: 'visitors', label: 'Visitors', align: 'right', cell: (p) => fmt.n(p.visitors), sort: (a, b) => a.visitors - b.visitors },
    { id: 'bounce', label: 'Bounce', align: 'right', hideBelow: 'sm', cell: (p) => fmt.p(p.bounce, 0), sort: (a, b) => a.bounce - b.bounce },
    { id: 'time', label: 'Avg time', align: 'right', hideBelow: 'sm', cell: (p) => fmtTime(p.secs), sort: (a, b) => a.secs - b.secs },
    { id: 'delta', label: 'Change', align: 'right', hideBelow: 'md', cell: (p) => <Delta value={p.viewsDelta} />, sort: (a, b) => a.viewsDelta - b.viewsDelta },
    { id: 'trend', label: 'Trend', align: 'right', hideBelow: 'md', cell: (p) => <Sparkline data={p.daily} tone={p.viewsDelta >= 0 ? 'signal' : 'bad'} width={64} height={22} fill={false} /> },
  ];
  return (
    <>
      <Head title="Pages" sub={`fieldnote.dev · last ${site.n} days · ${rows.length} of ${all.length} pages`} focus={focus}><RangeSeg value={range} onChange={setRange} /></Head>
      <div className="td-kpis">
        <Kpi label="Pageviews" value={fmt.k(views)} delta={rows.length ? ((views - prevViews) / prevViews) * 100 : undefined} hint={rows.length ? `vs ${fmt.k(prevViews)}` : 'no pages'} />
        <Kpi label="Avg. time on page" value={rows.length ? fmtTime(wavg(rows, 'secs', 'views')) : '–'} hint="weighted by views" tone="signal" />
        <Kpi label="Bounce rate" value={rows.length ? fmt.p(wavg(rows, 'bounce', 'visitors'), 1) : '–'} hint="weighted by visitors" />
        <Kpi label="Top page" value={top ? top.title : '–'} hint={top ? `${fmt.p(top.views / (views || 1), 0)} of shown views` : ''} tone="signal" />
      </div>
      <div className="ta-split2">
        <Panel id="tp-t" title="All pages" sub="Select a page to see its trend and referrers" flush>
          <div className="ta-bar"><Tabs label="Page group" value={group} tabs={tabs} onChange={setGroup} /><SearchBox value={q} onChange={setQ} label="Search pages" placeholder="Search pages or paths" /></div>
          <div ref={tableRef}><Table caption="Pages with views, unique visitors, bounce rate and average time" cols={cols} rows={rows} rowKey={(p) => p.path} selected={cur?.path} onRow={pick} empty={`No pages match "${q}".`} /></div>
        </Panel>
        <div ref={detailRef} className="ta-sticky">
          {cur ? (
            <Panel id="tp-d" title={cur.title} sub={cur.path} actions={<Delta value={cur.viewsDelta} />}>
              <dl className="ta-stats"><div><dt>Views</dt><dd>{fmt.n(cur.views)}</dd></div><div><dt>Visitors</dt><dd>{fmt.n(cur.visitors)}</dd></div><div><dt>Bounce</dt><dd>{fmt.p(cur.bounce, 0)}</dd></div><div><dt>Avg time</dt><dd>{fmtTime(cur.secs)}</dd></div></dl>
              <h3 className="ta-h3">Views per day</h3>
              <AreaChart ariaLabel={`Views per day for ${cur.path}`} labels={site.labels} height={168} series={[{ id: 'v', label: 'Views', data: cur.daily }]} />
              <h3 className="ta-h3">Top referrers <small>{fmt.n(cur.visitors)} visitors</small></h3>
              <RankList tone="signal" rows={cur.refs.map((r) => ({ label: r.label, sub: r.sub, value: r.value }))} />
            </Panel>
          ) : <Panel id="tp-e"><Empty title="No page selected" text="Clear the search or pick another group to see page details." /></Panel>}
        </div>
      </div>
    </>
  );
}
