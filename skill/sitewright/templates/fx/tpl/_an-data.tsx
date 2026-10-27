// One deterministic data model for every Analytics view. Everything is derived from the period (7/28/90 days) so totals agree everywhere:
// channels sum to the visitors, pages sum to the pageviews, countries / browsers / systems / devices sum to the visitors,
// new + returning = visitors, cohort sizes sum to the new visitors. Reference date: 24 Oct 2026. No Math.random.
import { seeded, series } from './_dash';

export type Range = '7d' | '28d' | '90d';
export const RANGE_OPTS: Array<{ id: Range; label: string }> = [{ id: '7d', label: '7 days' }, { id: '28d', label: '28 days' }, { id: '90d', label: '90 days' }];
export const DAYS: Record<Range, number> = { '7d': 7, '28d': 28, '90d': 90 };
export const dayLabel = (back: number) => new Date(Date.UTC(2026, 9, 24 - back)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const dayLabels = (n: number) => Array.from({ length: n }, (_, i) => dayLabel(n - 1 - i));
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
export const pct = (cur: number, prev: number) => (prev ? ((cur - prev) / prev) * 100 : 0);
export const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export const fmtTime = (s: number) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`;

/** Splits an integer total across weights so the parts add up exactly (largest remainder). */
export function distribute(total: number, weights: number[]): number[] {
  const w = weights.reduce((a, b) => a + b, 0);
  if (w <= 0 || total <= 0) return weights.map(() => 0);
  const raw = weights.map((x) => (x / w) * total); const out = raw.map(Math.floor);
  let rest = total - sum(out); const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rest > 0; k++, rest--) { const j = order[k % order.length]![1]; out[j] = out[j]! + 1; }
  return out;
}
const memo = <T,>(f: (r: Range) => T) => { const m = new Map<Range, T>(); return (r: Range): T => { if (!m.has(r)) m.set(r, f(r)); return m.get(r)!; }; };

/* ------------------------------------------------------------------ site */
export interface Site { range: Range; n: number; labels: string[]; cur: number[]; prev: number[]; visitors: number; prevVisitors: number; views: number; prevViews: number }
export const getSite = memo<Site>((range) => {
  const n = DAYS[range]; const cur = series(11, n, { base: 1500, trend: 0.28, wave: 0.18 }), prev = series(12, n, { base: 1380, trend: 0.18, wave: 0.18 });
  const visitors = sum(cur), prevVisitors = sum(prev);
  return { range, n, labels: dayLabels(n), cur, prev, visitors, prevVisitors, views: Math.round(visitors * 2.72), prevViews: Math.round(prevVisitors * 2.66) };
});
/** Signups (the "Start free trial" goal) share one formula, so Sources and Goals agree. */
export const RATE_DRIFT: Record<Range, number> = { '7d': 1.025, '28d': 1, '90d': 0.985 };
export const TRIAL_BASE = 0.034;
export const eventConv = (visitors: number, base: number, range: Range) => Math.round(visitors * base * RATE_DRIFT[range]);

/* ------------------------------------------------------------------ pages */
export type PageGroup = 'Marketing' | 'Docs' | 'Blog' | 'App';
interface PageDef { path: string; title: string; group: PageGroup; share: number; vpv: number; bounce: number; secs: number; slope: number; drift: number }
const PAGE_DEFS: PageDef[] = [
  { path: '/', title: 'Home', group: 'Marketing', share: 0.27, vpv: 1.42, bounce: 0.38, secs: 74, slope: 0.5, drift: 0.06 },
  { path: '/pricing', title: 'Pricing', group: 'Marketing', share: 0.105, vpv: 1.36, bounce: 0.31, secs: 142, slope: 0.8, drift: 0.14 },
  { path: '/docs/getting-started', title: 'Getting started', group: 'Docs', share: 0.14, vpv: 2.04, bounce: 0.22, secs: 296, slope: 0.3, drift: 0.04 },
  { path: '/docs/api', title: 'API reference', group: 'Docs', share: 0.09, vpv: 1.9, bounce: 0.19, secs: 331, slope: 0.25, drift: 0.07 },
  { path: '/docs/guides/tracking', title: 'Tracking guide', group: 'Docs', share: 0.07, vpv: 1.7, bounce: 0.24, secs: 254, slope: 0.2, drift: 0.03 },
  { path: '/blog/launch-notes', title: 'Launch notes', group: 'Blog', share: 0.075, vpv: 1.13, bounce: 0.57, secs: 118, slope: -0.2, drift: -0.09 },
  { path: '/blog/privacy-first-analytics', title: 'Privacy-first analytics', group: 'Blog', share: 0.06, vpv: 1.1, bounce: 0.61, secs: 163, slope: 0.1, drift: 0.11 },
  { path: '/changelog', title: 'Changelog', group: 'Marketing', share: 0.045, vpv: 1.2, bounce: 0.44, secs: 88, slope: 0.1, drift: 0.02 },
  { path: '/integrations', title: 'Integrations', group: 'Marketing', share: 0.045, vpv: 1.28, bounce: 0.36, secs: 97, slope: 0.35, drift: 0.09 },
  { path: '/about', title: 'About', group: 'Marketing', share: 0.04, vpv: 1.12, bounce: 0.52, secs: 64, slope: 0, drift: -0.03 },
  { path: '/contact', title: 'Contact', group: 'Marketing', share: 0.02, vpv: 1.1, bounce: 0.49, secs: 51, slope: -0.1, drift: -0.04 },
  { path: '/login', title: 'Sign in', group: 'App', share: 0.04, vpv: 1.5, bounce: 0.12, secs: 39, slope: 0.2, drift: 0.05 },
];
export const REFS: Array<{ label: string; sub: string }> = [{ label: 'Google', sub: 'organic' }, { label: 'Direct', sub: '' }, { label: 'newsletter', sub: 'email' }, { label: 'github.com', sub: 'referral' }, { label: 'x.com', sub: 'social' }, { label: 'news.ycombinator.com', sub: 'referral' }, { label: 'reddit.com', sub: 'social' }];
const REF_W = [0.34, 0.26, 0.12, 0.09, 0.07, 0.06, 0.06];
const GROUP_BIAS: Record<PageGroup, number[]> = { Docs: [1.1, 0.8, 0.4, 2.2, 0.5, 0.9, 0.7], Blog: [0.8, 0.6, 1.2, 0.7, 2, 2.4, 1.6], Marketing: [1, 1.3, 1, 0.5, 0.8, 0.4, 0.6], App: [0.3, 2.4, 0.8, 0.1, 0.1, 0.1, 0.1] };
export interface PageRow extends PageDef { views: number; visitors: number; prevViews: number; prevVisitors: number; viewsDelta: number; visitorsDelta: number; daily: number[]; refs: Array<{ label: string; sub: string; value: number }> }
export const getPages = memo<PageRow[]>((range) => {
  const s = getSite(range); const vs = distribute(s.views, PAGE_DEFS.map((p) => p.share)); const pv = distribute(s.prevViews, PAGE_DEFS.map((p) => p.share * (1 - p.drift)));
  return PAGE_DEFS.map((p, i) => {
    const views = vs[i]!, prevViews = pv[i]!, visitors = Math.round(views / p.vpv), prevVisitors = Math.round(prevViews / (p.vpv * (1 + p.drift * 0.15)));
    const r = seeded(500 + i); const w = REF_W.map((x, k) => x * GROUP_BIAS[p.group][k]! * (0.75 + r() * 0.5));
    const refs = distribute(visitors, w).map((value, k) => ({ ...REFS[k]!, value })).sort((a, b) => b.value - a.value);
    return { ...p, views, visitors, prevViews, prevVisitors, viewsDelta: pct(views, prevViews), visitorsDelta: pct(visitors, prevVisitors), daily: distribute(views, series(100 + i, s.n, { base: 100, trend: p.slope, wave: 0.16, noise: 0.12 })), refs };
  });
});

/* ------------------------------------------------------------------ channels and campaigns */
export const CHANNELS = [
  { id: 'organic', label: 'Organic search', share: 0.36, prev: 0.34, cv: 1.0 }, { id: 'direct', label: 'Direct', share: 0.25, prev: 0.26, cv: 1.25 },
  { id: 'email', label: 'Email', share: 0.13, prev: 0.11, cv: 1.9 }, { id: 'referral', label: 'Referral', share: 0.12, prev: 0.13, cv: 0.8 },
  { id: 'social', label: 'Social', share: 0.09, prev: 0.1, cv: 0.4 }, { id: 'paid', label: 'Paid', share: 0.05, prev: 0.06, cv: 1.1 },
];
export interface ChannelRow { id: string; label: string; visitors: number; prevVisitors: number; delta: number; share: number; signups: number; prevSignups: number; rate: number; daily: number[]; prevDaily: number[] }
export const getChannels = memo<ChannelRow[]>((range) => {
  const s = getSite(range);
  const split = (days: number[], key: 'share' | 'prev', seed: number) => { const r = seeded(seed); const out = CHANNELS.map(() => [] as number[]); days.forEach((v) => distribute(v, CHANNELS.map((c) => c[key] * (1 + (r() - 0.5) * 0.35))).forEach((x, k) => out[k]!.push(x))); return out; };
  const cur = split(s.cur, 'share', 301), prev = split(s.prev, 'prev', 302);
  const sg = distribute(eventConv(s.visitors, TRIAL_BASE, range), CHANNELS.map((c, k) => sum(cur[k]!) * c.cv));
  const ps = distribute(Math.round(s.prevVisitors * TRIAL_BASE * 0.965), CHANNELS.map((c, k) => sum(prev[k]!) * c.cv));
  return CHANNELS.map((c, k) => { const visitors = sum(cur[k]!), prevVisitors = sum(prev[k]!); return { id: c.id, label: c.label, visitors, prevVisitors, delta: pct(visitors, prevVisitors), share: visitors / s.visitors, signups: sg[k]!, prevSignups: ps[k]!, rate: sg[k]! / visitors, daily: cur[k]!, prevDaily: prev[k]! }; });
});
interface CampDef { id: string; channel: string; source: string; medium: string; share: number; cv: number; drift: number }
const CAMP_DEFS: CampDef[] = [
  { id: 'oct-newsletter', channel: 'email', source: 'fieldnote', medium: 'email', share: 0.46, cv: 1.2, drift: 0.08 }, { id: 'winback-q4', channel: 'email', source: 'crm', medium: 'email', share: 0.18, cv: 0.7, drift: -0.12 },
  { id: 'search-brand', channel: 'paid', source: 'google', medium: 'cpc', share: 0.55, cv: 1.1, drift: 0.05 }, { id: 'retarget-pricing', channel: 'paid', source: 'meta', medium: 'retargeting', share: 0.3, cv: 1.8, drift: 0.22 },
  { id: 'launch-thread', channel: 'social', source: 'x', medium: 'social', share: 0.35, cv: 0.6, drift: 0.31 }, { id: 'dev-community', channel: 'social', source: 'reddit', medium: 'social', share: 0.2, cv: 0.5, drift: -0.08 },
  { id: 'partner-fieldguide', channel: 'referral', source: 'fieldguide', medium: 'partner', share: 0.28, cv: 1, drift: 0.12 }, { id: 'podcast-sponsor', channel: 'referral', source: 'build-notes', medium: 'podcast', share: 0.15, cv: 0.9, drift: 0.02 },
];
export interface CampRow { id: string; channel: string; channelLabel: string; source: string; medium: string; visitors: number; prevVisitors: number; delta: number; signups: number; rate: number; daily: number[]; prevDaily: number[] }
export const getCampaigns = memo<{ rows: CampRow[]; tagged: number; taggedSignups: number }>((range) => {
  const s = getSite(range); const ch = getChannels(range); const rows: CampRow[] = [];
  for (const c of ch) {
    const defs = CAMP_DEFS.filter((d) => d.channel === c.id); if (!defs.length) continue;
    const tagged = sum(defs.map((d) => d.share));
    const vs = distribute(c.visitors, [...defs.map((d) => d.share), 1 - tagged]);
    const sg = distribute(c.signups, [...defs.map((d, k) => vs[k]! * d.cv), vs[defs.length]! * 0.9]);
    defs.forEach((d, k) => {
      const i = CAMP_DEFS.indexOf(d); const prevVisitors = Math.round(vs[k]! / (1 + d.drift));
      rows.push({ id: d.id, channel: c.id, channelLabel: c.label, source: d.source, medium: d.medium, visitors: vs[k]!, prevVisitors, delta: pct(vs[k]!, prevVisitors), signups: sg[k]!, rate: sg[k]! / vs[k]!, daily: distribute(vs[k]!, series(400 + i, s.n, { base: 50, trend: d.drift * 2, wave: 0.2, noise: 0.22 })), prevDaily: distribute(prevVisitors, series(450 + i, s.n, { base: 50, trend: 0.1, wave: 0.2, noise: 0.22 })) });
    });
  }
  return { rows, tagged: sum(rows.map((r) => r.visitors)), taggedSignups: sum(rows.map((r) => r.signups)) };
});

/* ------------------------------------------------------------------ audience */
export interface Slice { label: string; value: number; code?: string; delta?: number }
const slices = (total: number, defs: Array<{ label: string; share: number; code?: string; d?: number }>): Slice[] => distribute(total, defs.map((d) => d.share)).map((value, i) => ({ label: defs[i]!.label, value, code: defs[i]!.code, delta: defs[i]!.d }));
export interface Cohort { label: string; size: number; ret: number[] }
export interface CohortSet { unit: 'day' | 'week'; cols: string[]; rows: Cohort[]; avg: number[] }
export interface Audience { countries: Slice[]; browsers: Slice[]; os: Slice[]; devices: Slice[]; newDaily: number[]; retDaily: number[]; newTotal: number; retTotal: number; cohorts: CohortSet }
export const getAudience = memo<Audience>((range) => {
  const s = getSite(range); const r = seeded(600);
  const retDaily = s.cur.map((v, i) => Math.round(v * (0.34 + 0.035 * Math.sin(i / 3.2) + (r() - 0.5) * 0.03))); const newDaily = s.cur.map((v, i) => v - retDaily[i]!);
  const newTotal = sum(newDaily); const weekly = range !== '7d'; const count = range === '7d' ? 7 : range === '28d' ? 4 : 12; const step = weekly ? 7 : 1;
  const base = weekly ? [1, 0.36, 0.27, 0.22, 0.19, 0.17, 0.15, 0.14, 0.13, 0.12, 0.115, 0.11] : [1, 0.34, 0.25, 0.21, 0.18, 0.16, 0.15];
  const sizes = distribute(newTotal, Array.from({ length: count }, () => 0.85 + r() * 0.3));
  const rows = sizes.map((size, k) => ({ label: dayLabel((count - k) * step - 1), size, ret: Array.from({ length: count - k }, (_, j) => (j === 0 ? size : Math.round(size * base[j]! * (1 + (r() - 0.5) * 0.14)))) }));
  const avg = Array.from({ length: count }, (_, j) => { const rs = rows.filter((c) => c.ret.length > j); return sum(rs.map((c) => c.ret[j]!)) / sum(rs.map((c) => c.size)); });
  return {
    countries: slices(s.visitors, [{ code: 'US', label: 'United States', share: 0.36, d: 5.2 }, { code: 'DE', label: 'Germany', share: 0.12, d: 8.9 }, { code: 'GB', label: 'United Kingdom', share: 0.105, d: -1.4 }, { code: 'IN', label: 'India', share: 0.09, d: 14.2 }, { code: 'CA', label: 'Canada', share: 0.065, d: 3.1 }, { code: 'FR', label: 'France', share: 0.05, d: 6 }, { code: 'NL', label: 'Netherlands', share: 0.04, d: 2.2 }, { code: 'AU', label: 'Australia', share: 0.035, d: -3.6 }, { code: 'BR', label: 'Brazil', share: 0.03, d: 11.4 }, { code: 'ES', label: 'Spain', share: 0.025, d: 0.8 }, { code: '··', label: 'Other (74 countries)', share: 0.08, d: 4 }]),
    browsers: slices(s.visitors, [{ label: 'Chrome', share: 0.49 }, { label: 'Safari', share: 0.22 }, { label: 'Firefox', share: 0.13 }, { label: 'Edge', share: 0.1 }, { label: 'Other', share: 0.06 }]),
    os: slices(s.visitors, [{ label: 'Windows', share: 0.31 }, { label: 'macOS', share: 0.27 }, { label: 'iOS', share: 0.19 }, { label: 'Android', share: 0.17 }, { label: 'Linux', share: 0.06 }]),
    devices: slices(s.visitors, [{ label: 'Desktop', share: 0.5 }, { label: 'Mobile', share: 0.44 }, { label: 'Tablet', share: 0.06 }]),
    newDaily, retDaily, newTotal, retTotal: sum(retDaily),
    cohorts: { unit: weekly ? 'week' : 'day', cols: Array.from({ length: count }, (_, j) => `${weekly ? 'W' : 'D'}${j}`), rows, avg },
  };
});
