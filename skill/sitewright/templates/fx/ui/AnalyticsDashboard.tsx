'use client';
import { useMemo, useState } from 'react';
import { Area, Donut, Mini, fmtNum, type Pt } from './_d8';

export interface AnalyticsPage { path: string; views: number; time: string; bounce: number }
export interface AnalyticsRange {
  label: string;
  series: Pt[];
  kpis: { label: string; value: string; delta: number }[];
  sources: Pt[];
  pages: AnalyticsPage[];
}
export interface AnalyticsDashboardProps {
  title?: string;
  /** keyed by range id, in display order */
  ranges?: Record<string, AnalyticsRange>;
  defaultRange?: string;
  className?: string;
}

/** deterministic wave so server and client agree */
function wave(n: number, base: number, amp: number, trend: number, seed: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.round(base * (1 + (trend * i) / n) + amp * Math.sin(i * 0.9 + seed) + (amp / 2) * Math.cos(i * 2.3 + seed * 2)));
}
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function build(label: string, labels: string[], base: number, amp: number, seed: number, scale: number): AnalyticsRange {
  const v = wave(labels.length, base, amp, 0.25, seed);
  const total = v.reduce((s, x) => s + x, 0);
  const pg = (name: string, f: number): AnalyticsPage => ({ path: name, views: Math.round(total * 2.4 * f), time: `${Math.floor(1 + f * 6)}m ${Math.round(f * 100) % 60}s`, bounce: Math.round(62 - f * 90) });
  return {
    label,
    series: labels.map((l, i) => ({ label: l, value: v[i]! })),
    kpis: [
      { label: 'Visitors', value: fmtNum(total), delta: 4 + scale * 3 },
      { label: 'Page views', value: fmtNum(total * 2.4), delta: 2 + scale * 4 },
      { label: 'Avg. session', value: `${(2.1 + scale * 0.4).toFixed(1)} min`, delta: -1.5 + scale },
      { label: 'Conversion', value: `${(2.4 + scale * 0.3).toFixed(1)}%`, delta: 0.6 * scale },
    ],
    sources: [{ label: 'Search', value: 42 + scale }, { label: 'Direct', value: 26 }, { label: 'Social', value: 17 - scale }, { label: 'Referral', value: 9 }, { label: 'Email', value: 6 }],
    pages: [pg('/', 0.32), pg('/pricing', 0.21), pg('/blog/launch-notes', 0.17), pg('/features', 0.13), pg('/docs/start', 0.1)],
  };
}
const RANGES: Record<string, AnalyticsRange> = {
  '7d': build('7 days', DAYS, 1800, 380, 1, 1),
  '30d': build('30 days', Array.from({ length: 30 }, (_, i) => `${i + 1} Sep`), 1700, 420, 2, 2),
  '90d': build('90 days', Array.from({ length: 13 }, (_, i) => `Wk ${i + 1}`), 12400, 1800, 3, 3),
  '12m': build('12 months', MONTHS, 52000, 7000, 4, 4),
};
const COLORS = ['var(--ad-acc)', 'var(--ad-c2)', 'var(--ad-c3)', 'var(--ad-c4)', 'var(--ad-c5)'];

/** Warm-white and orange web analytics: range switch re-computes KPIs, area chart, sources donut and top pages. */
export default function AnalyticsDashboard({ title = 'Lantern analytics', ranges = RANGES, defaultRange, className }: AnalyticsDashboardProps) {
  const ids = Object.keys(ranges);
  const [id, setId] = useState(defaultRange && ranges[defaultRange] ? defaultRange : ids[0] ?? '');
  const r = ranges[id] ?? ranges[ids[0]!]!;
  const maxViews = useMemo(() => Math.max(1, ...r.pages.map((p) => p.views)), [r]);
  return (
    <section className={`ui-analytics-dashboard ${className ?? ''}`} aria-label={title}>
      <header className="ui-analytics-dashboard-head">
        <div><h2>{title}</h2><p>Showing the last {r.label.toLowerCase()}</p></div>
        <div className="ui-analytics-dashboard-seg" role="group" aria-label="Date range">
          {ids.map((k) => (
            <button key={k} type="button" aria-pressed={k === id} onClick={() => setId(k)}>{k}</button>
          ))}
        </div>
      </header>
      <ul className="ui-analytics-dashboard-kpis" aria-live="polite">
        {r.kpis.map((k) => (
          <li key={k.label} className="ui-analytics-dashboard-card">
            <span>{k.label}</span><b>{k.value}</b>
            <em data-down={k.delta < 0 ? 'true' : undefined}><span aria-hidden="true">{k.delta < 0 ? '▼' : '▲'}</span> {Math.abs(Math.round(k.delta * 10) / 10)}% <small>vs previous</small></em>
          </li>
        ))}
      </ul>
      <div className="ui-analytics-dashboard-grid">
        <section className="ui-analytics-dashboard-card ui-analytics-dashboard-main" aria-labelledby="ad-vis">
          <h3 id="ad-vis">Visitors</h3>
          <Area key={id} data={r.series} title={`Visitors over the last ${r.label.toLowerCase()}`} color="var(--ad-acc)" name="Visitors" height={210} />
        </section>
        <section className="ui-analytics-dashboard-card ui-analytics-dashboard-src" aria-labelledby="ad-src">
          <h3 id="ad-src">Traffic sources</h3>
          <Donut key={id} cls="ui-analytics-dashboard" data={r.sources} colors={COLORS} title="Share of visits by traffic source" centre={fmtNum(r.series.reduce((s, p) => s + p.value, 0))} />
        </section>
        <section className="ui-analytics-dashboard-card ui-analytics-dashboard-pages" aria-labelledby="ad-pg">
          <h3 id="ad-pg">Top pages</h3>
          <div className="ui-analytics-dashboard-scroll" tabIndex={0} role="region" aria-label="Top pages table, scrollable">
            <table>
              <thead><tr><th scope="col">Page</th><th scope="col">Views</th><th scope="col">Avg. time</th><th scope="col">Bounce</th></tr></thead>
              <tbody>
                {r.pages.map((p) => (
                  <tr key={p.path}>
                    <th scope="row"><span>{p.path}</span><i><u style={{ width: `${(p.views / maxViews) * 100}%` }} /></i></th>
                    <td>{p.views.toLocaleString('en-US')}</td><td>{p.time}</td><td>{p.bounce}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

export function Demo() {
  return <Mini w={1000}><AnalyticsDashboard /></Mini>;
}
