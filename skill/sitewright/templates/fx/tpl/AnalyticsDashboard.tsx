'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AreaChart, Button, Delta, Donut, Empty, Kpi, Panel, Preview, RankList, Shell, Sparkline, Table, fmt, series, type Col, type NavEntry } from './_dash';
import { DAYS, fmtTime, getAudience, getChannels, getPages, getSite, type PageRow, type Range } from './_an-data';
import { SEED_GOALS, goalStats, type Goal } from './_an-goals-data';
import { Head, RangeSeg, type Notify } from './_an-ui';
import PagesView from './_an-views-pages';
import SourcesView from './_an-views-sources';
import AudienceView from './_an-views-aud';
import GoalsView from './_an-views-goals';
import SettingsView, { SEED_SETTINGS, SITE, type SiteSettings } from './_an-views-settings';

const VIEWS = ['overview', 'pages', 'sources', 'audience', 'goals', 'settings'] as const;
type ViewId = (typeof VIEWS)[number];
const LABEL: Record<ViewId, string> = { overview: 'Overview', pages: 'Pages', sources: 'Sources', audience: 'Audience', goals: 'Goals', settings: 'Settings' };
const LIVE = [{ path: '/pricing', n: 41 }, { path: '/', n: 37 }, { path: '/docs/getting-started', n: 29 }, { path: '/blog/launch-notes', n: 21 }, { path: '/changelog', n: 14 }];

function Overview({ range, setRange, go }: { range: Range; setRange: (r: Range) => void; go: (v: ViewId) => void }) {
  const site = getSite(range); const { n, cur, prev, visitors: total, prevVisitors: prevTotal } = site;
  const pages = [...getPages(range)].sort((a, b) => b.visitors - a.visitors).slice(0, 6); const ch = getChannels(range); const au = getAudience(range);
  const bounce = 0.418 - (n === 7 ? 0.012 : n === 90 ? -0.009 : 0);
  const more = (to: ViewId, what: string) => <Button small variant="ghost" onClick={() => go(to)} label={`View all ${what}`}>View all</Button>;
  const cols: Array<Col<PageRow>> = [
    { id: 'page', label: 'Page', cell: (p) => <div className="td-cellmain"><div><b>{p.title}</b><small className="td-mono">{p.path}</small></div></div>, sort: (a, b) => a.title.localeCompare(b.title) },
    { id: 'visitors', label: 'Visitors', align: 'right', cell: (p) => fmt.n(p.visitors), sort: (a, b) => a.visitors - b.visitors },
    { id: 'views', label: 'Views', align: 'right', hideBelow: 'sm', cell: (p) => fmt.n(p.views), sort: (a, b) => a.views - b.views },
    { id: 'bounce', label: 'Bounce', align: 'right', hideBelow: 'sm', cell: (p) => fmt.p(p.bounce, 0), sort: (a, b) => a.bounce - b.bounce },
    { id: 'trend', label: 'Trend', align: 'right', hideBelow: 'md', cell: (p) => <Sparkline data={p.daily} tone={p.viewsDelta >= 0 ? 'signal' : 'bad'} width={72} height={22} fill={false} /> },
  ];
  return (
    <>
      <div className="td-kpis">
        <Kpi label="Visitors" value={fmt.k(total)} delta={((total - prevTotal) / prevTotal) * 100} spark={cur.slice(-14)} hint={`vs ${fmt.k(prevTotal)}`} />
        <Kpi label="Pageviews" value={fmt.k(site.views)} delta={((site.views - site.prevViews) / site.prevViews) * 100} spark={prev.slice(-14).map((v, i) => v + cur[cur.length - 14 + i]! * 0.4)} tone="signal" hint="2.7 per visit" />
        <Kpi label="Bounce rate" value={fmt.p(bounce)} delta={-2.1} goodWhen="down" spark={series(21, 14, { base: 40, trend: -0.15, wave: 0.3 })} hint="lower is better" />
        <Kpi label="Visit duration" value={fmtTime(134)} delta={4.6} spark={series(22, 14, { base: 130, trend: 0.2, wave: 0.2 })} tone="signal" hint="median" />
      </div>
      <div className="ta-row">
        <Panel id="ta-v" title="Visitors" sub="Unique visitors per day" actions={<span className="ta-legend"><i />This period<i className="is-prev" />Previous</span>}>
          <AreaChart ariaLabel={`Visitors per day over the last ${n} days`} labels={site.labels} height={236} series={[{ id: 'cur', label: 'This period', data: cur }, { id: 'prev', label: 'Previous', data: prev, color: 'color-mix(in srgb, var(--ink, #15130e) 38%, transparent)' }]} />
        </Panel>
        <Panel id="ta-r" title="Right now" sub="Visitors on the site" actions={<Delta value={6.3} />}>
          <div className="ta-live"><b>142</b><span><i aria-hidden="true" />online</span></div>
          <ul className="ta-livelist">{LIVE.map((l) => <li key={l.path}><span className="td-mono">{l.path}</span><b>{l.n}</b></li>)}</ul>
        </Panel>
      </div>
      <div className="ta-row3">
        <Panel id="ta-s" title="Sources" sub="Where visitors come from" actions={more('sources', 'sources')}><RankList rows={ch.map((c) => ({ label: c.label, value: c.visitors }))} tone="signal" /></Panel>
        <Panel id="ta-c" title="Countries" actions={more('audience', 'countries')}><RankList rows={au.countries.slice(0, 5).map((c) => ({ label: c.label, value: c.value }))} /></Panel>
        <Panel id="ta-d" title="Devices" actions={more('audience', 'devices')}><Donut ariaLabel="Visitors by device" size={118} parts={au.devices} center={<><b className="ta-big">{fmt.k(total)}</b><small className="td-muted">visitors</small></>} /></Panel>
      </div>
      <Panel id="ta-p" title="Top pages" sub="Click a column to sort" actions={more('pages', 'pages')} flush><Table caption="Top pages" cols={cols} rows={pages} rowKey={(p) => p.path} /></Panel>
    </>
  );
}

export default function AnalyticsDashboard({ brand = 'Fieldnote' }: { brand?: string }) {
  const [range, setRange] = useState<Range>('28d'); const [active, setActive] = useState<ViewId>('overview'); const [navd, setNavd] = useState(0);
  const [goals, setGoals] = useState<Goal[]>(SEED_GOALS); const [settings, setSettings] = useState<SiteSettings>(SEED_SETTINGS);
  const [live, setLive] = useState(''); const [toast, setToast] = useState<{ id: number; msg: string; undo?: () => void } | null>(null); const tid = useRef(0);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search); const v = q.get('view') as ViewId | null; const r = q.get('range') as Range | null;
    if (v && VIEWS.includes(v)) setActive(v); if (r && r in DAYS) setRange(r);
  }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), toast.undo ? 9000 : 4500); return () => clearTimeout(t); }, [toast]);
  const notify: Notify = (msg, undo) => { setLive(msg); setToast({ id: ++tid.current, msg, undo }); };
  const go = (v: ViewId) => { setActive(v); setNavd((x) => x + 1); setLive(`${LABEL[v]} view`); };
  const below = useMemo(() => goalStats(goals, range).filter((s) => !s.onTarget).length, [goals, range]);
  const nav: NavEntry[] = [{ id: 'overview', label: 'Overview', icon: 'chart' }, { id: 'pages', label: 'Pages', icon: 'file' }, { id: 'sources', label: 'Sources', icon: 'link' }, { id: 'audience', label: 'Audience', icon: 'users' }, { id: 'goals', label: 'Goals', icon: 'star', badge: below || undefined }, { id: 'settings', label: 'Settings', icon: 'settings' }];
  const focus = navd > 0; const p = { range, setRange, focus, notify };
  const n = DAYS[range];
  let body;
  if (settings.deleted) body = (
    <><Head title="Site deleted" focus={focus} /><Panel id="ta-del"><Empty title={`${SITE} was deleted`} text="Its goals, statistics and settings are gone. You can still restore the site right now." /><div className="ta-center"><Button variant="primary" onClick={() => { setSettings((s) => ({ ...s, deleted: false })); notify('Site restored.'); }}>Restore site</Button></div></Panel></>
  );
  else if (active === 'overview') body = <><Head title="Overview" sub={`${SITE} · last ${n} days, compared with the ${n} before`} focus={focus}><RangeSeg value={range} onChange={setRange} /><Button icon="file" onClick={() => notify('Export started. A CSV will download shortly.')}>Export</Button></Head><Overview range={range} setRange={setRange} go={go} /></>;
  else if (active === 'pages') body = <PagesView {...p} />;
  else if (active === 'sources') body = <SourcesView {...p} />;
  else if (active === 'audience') body = <AudienceView {...p} />;
  else if (active === 'goals') body = <GoalsView {...p} goals={goals} setGoals={setGoals} />;
  else body = <SettingsView s={settings} set={setSettings} notify={notify} focus={focus} />;
  return (
    <Shell brand={brand} nav={nav} active={active} onNav={(id) => go(id as ViewId)} title={LABEL[active]} crumbs={[brand, SITE, LABEL[active]]} searchHint="Jump to a page">
      {body}
      <div className="td-sr" role="status" aria-live="polite">{live}</div>
      {toast && <div className="ta-toast" key={toast.id}><span>{toast.msg}</span>{toast.undo && <button type="button" onClick={() => { toast.undo?.(); setToast(null); setLive('Undone'); }}>Undo</button>}<button type="button" aria-label="Dismiss" onClick={() => setToast(null)}>×</button></div>}
    </Shell>
  );
}

export function Demo() { return <Preview w={1280} h={150}><AnalyticsDashboard /></Preview>; }
