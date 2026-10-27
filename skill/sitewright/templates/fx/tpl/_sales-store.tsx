'use client';
// One shared data module for every Sales view: settings (stages, currency, targets), the activity log, accounts and contacts, lost deals and
// the history the reports read. The deals themselves live in _sales.tsx. Reference date: Saturday 24 Oct 2026, 14:20.
import { createContext, useContext } from 'react';
import { fmt } from './_dash';
import { DEALS, REPS, STAGES, sum, type Deal, type Stage, type StageId } from './_sales';

/* ------------------------------------------------------------------ settings and money */
export type Cur = 'USD' | 'EUR' | 'GBP';
export const CURS: Record<Cur, { sym: string; rate: number; name: string }> = { USD: { sym: '$', rate: 1, name: 'US dollar' }, EUR: { sym: '€', rate: 0.92, name: 'Euro' }, GBP: { sym: '£', rate: 0.79, name: 'Pound sterling' } };
export interface Cfg { stages: Stage[]; cur: Cur; quotas: Record<string, number>; phasing: [number, number, number]; large: number }
export const DEFAULT_CFG: Cfg = { stages: STAGES, cur: 'USD', quotas: Object.fromEntries(REPS.map((r) => [r.name, r.quota])), phasing: [40, 32, 28], large: 100000 };
export const teamQuota = (c: Cfg) => Object.values(c.quotas).reduce((a, b) => a + b, 0);
export interface Fm { cur: Cur; m: (v: number) => string; k: (v: number) => string }
export const mkFm = (cur: Cur): Fm => { const { sym, rate } = CURS[cur]; return { cur, m: (v) => fmt.c(v * rate, sym), k: (v) => `${v < 0 ? '−' : ''}${sym}${fmt.k(Math.abs(v) * rate)}` }; };
export const CfgCtx = createContext<{ cfg: Cfg; fm: Fm }>({ cfg: DEFAULT_CFG, fm: mkFm('USD') });
export const useCfg = () => useContext(CfgCtx);
export const MONTHS = ['Oct', 'Nov', 'Dec'] as const;
export const monthOf = (d: Deal) => Math.max(0, Math.min(2, Number(d.close.slice(5, 7)) - 10));

/* ------------------------------------------------------------------ time: minutes since 1 Oct 2026 00:00 */
const BASE = Date.UTC(2026, 9, 1);
export const T = (day: number, h = 9, m = 0) => ((day - 1) * 24 + h) * 60 + m;
export const NOW_TS = T(24, 14, 20);
export const dayKey = (ts: number) => new Date(BASE + Math.floor(ts / 1440) * 864e5).toISOString().slice(0, 10);
export const clock = (ts: number) => `${String(Math.floor((ts % 1440) / 60)).padStart(2, '0')}:${String(ts % 60).padStart(2, '0')}`;
const wd = (key: string, o: Intl.DateTimeFormatOptions) => new Date(`${key}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...o });
export const dayLabel = (key: string) => { const t = dayKey(NOW_TS), y = dayKey(NOW_TS - 1440); const l = wd(key, { weekday: 'short', day: 'numeric', month: 'short' }); return key === t ? `Today · ${l}` : key === y ? `Yesterday · ${l}` : l; };
export const shortDate = (key: string) => wd(key, { month: 'short', day: 'numeric' });
export const ago = (ts: number) => { const d = NOW_TS - ts; return d < 1 ? 'now' : d < 60 ? `${d}m` : d < 1440 ? `${Math.floor(d / 60)}h` : d < 2880 ? 'Yesterday' : wd(dayKey(ts), { weekday: 'short' }); };
export const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 864e5);
export const TODAY_KEY = dayKey(NOW_TS);

/* ------------------------------------------------------------------ activity log */
export type ActType = 'call' | 'email' | 'meeting' | 'stage' | 'note';
export interface Act { id: string; ts: number; type: ActType; who: string; deal: string; verb: string; text: string }
export const TYPE_LABEL: Record<ActType, string> = { call: 'Call', email: 'Email', meeting: 'Meeting', stage: 'Stage change', note: 'Note' };
type Row = [number, number, number, ActType, string, string, string, string];
const ROWS: Row[] = [
  [24, 14, 8, 'call', 'Priya Nair', 'd16', 'logged a call with', 'Legal review done, waiting on procurement.'],
  [24, 13, 32, 'email', 'Tomás Reyes', 'd14', 'sent a proposal to', 'Revised fleet module scope, three options.'],
  [24, 12, 20, 'stage', 'Maya Chen', 'd12', 'moved', 'from [[qualified]] to [[proposal]].'],
  [24, 9, 20, 'email', 'Jonas Weber', 'd18', 'emailed', 'They asked for revised payment terms.'],
  [23, 16, 5, 'stage', 'Amara Okafor', 'd1', 'added', 'as a new lead from the website.'],
  [23, 15, 30, 'call', 'Jonas Weber', 'd13', 'called', 'Partners agreed a start date of 2 Nov.'],
  [23, 11, 0, 'meeting', 'Maya Chen', 'd15', 'held a pricing review with', 'Their CFO joined and two seats were added to scope.'],
  [23, 9, 40, 'note', 'Priya Nair', 'd9', 'noted on', 'Wants a security questionnaire before the demo.'],
  [22, 16, 40, 'note', 'Maya Chen', 'd15', 'noted on', 'Legal wants a data residency clause in the order form.'],
  [22, 15, 10, 'call', 'Tomás Reyes', 'd8', 'called', 'Broker SSO is a must-have; scoping with engineering.'],
  [22, 10, 30, 'email', 'Amara Okafor', 'd4', 'emailed', 'Sent the 25-seat quote.'],
  [22, 14, 0, 'meeting', 'Priya Nair', 'd16', 'met', 'Procurement and legal, agreed the redline process.'],
  [21, 13, 45, 'stage', 'Tomás Reyes', 'd22', 'won', 'for $$.'],
  [21, 10, 0, 'meeting', 'Priya Nair', 'd11', 'ran a demo for', 'The supplier ops team, six attendees.'],
  [20, 16, 20, 'meeting', 'Maya Chen', 'd6', 'booked a demo with', 'Thursday 29 Oct at 10:00.'],
  [20, 11, 0, 'meeting', 'Tomás Reyes', 'd17', 'met', 'Portfolio leads; rollout order agreed for 12 sites.'],
  [20, 9, 30, 'email', 'Priya Nair', 'd16', 'emailed', 'Sent the redlined MSA.'],
  [19, 14, 0, 'stage', 'Maya Chen', 'd15', 'moved', 'from [[proposal]] to [[negotiation]].'],
  [19, 10, 30, 'email', 'Jonas Weber', 'd7', 'emailed', 'Sent the revised seat count.'],
  [19, 9, 15, 'stage', 'Amara Okafor', 'd24', 'won', 'for $$.'],
  [18, 11, 30, 'meeting', 'Maya Chen', 'd12', 'met', 'Clinical ops leads; two sites added to the pilot.'],
  [18, 9, 50, 'email', 'Tomás Reyes', 'd2', 'emailed', 'Asked for store counts by region.'],
  [16, 15, 0, 'stage', 'Maya Chen', 'd21', 'won', 'for $$.'],
  [15, 15, 30, 'stage', 'Priya Nair', 'd11', 'moved', 'from [[qualified]] to [[proposal]].'],
  [15, 11, 20, 'call', 'Jonas Weber', 'd3', 'called', 'Pilot budget sits with the regional director.'],
  [14, 12, 10, 'stage', 'Priya Nair', 'd20', 'won', 'for $$.'],
  [13, 10, 0, 'call', 'Maya Chen', 'd10', 'called', 'Pilot sponsor is on leave until 3 Nov.'],
  [12, 14, 30, 'stage', 'Priya Nair', 'd16', 'moved', 'from [[proposal]] to [[negotiation]].'],
  [9, 16, 0, 'stage', 'Jonas Weber', 'd18', 'moved', 'from [[proposal]] to [[negotiation]].'],
  [9, 10, 20, 'email', 'Priya Nair', 'd5', 'emailed', 'Sent the field operations overview.'],
  [9, 9, 0, 'note', 'Priya Nair', 'd5', 'noted on', 'The site manager is the gatekeeper; decision expected in December.'],
  [8, 14, 0, 'stage', 'Amara Okafor', 'd19', 'won', 'for $$.'],
  [2, 11, 0, 'stage', 'Jonas Weber', 'd23', 'won', 'for $$.'],
];
export const SEED_LOG: Act[] = ROWS.map((r, i) => ({ id: `s${i}`, ts: T(r[0], r[1], r[2]), type: r[3], who: r[4], deal: r[5], verb: r[6], text: r[7] })).sort((a, b) => b.ts - a.ts);
export const lastTs = (log: Act[], deal: string) => log.reduce((a, e) => (e.deal === deal && e.ts > a ? e.ts : a), 0);
/** The deals with `touch` (days since the last logged activity) derived from the log, so health and the feed always agree. */
export const SEED_DEALS: Deal[] = DEALS.map((d) => ({ ...d, touch: Math.max(0, dayDiff(TODAY_KEY, dayKey(lastTs(SEED_LOG, d.id)))) }));

/** Fill the placeholders in log text: [[stage-id]] becomes the stage's current name, $$ the deal amount in the display currency. */
export const fill = (text: string, cfg: Cfg, fm: Fm, d?: Deal) => text.replace(/\[\[(\w+)\]\]/g, (_, id: string) => cfg.stages.find((s) => s.id === id)?.label ?? id).replace('$$', d ? fm.m(d.amount) : '');
export const sentence = (e: Act) => `${e.who} ${e.verb}`;

/* ------------------------------------------------------------------ deal facts */
export const OPENED: Record<string, string> = {
  d1: '2026-10-21', d2: '2026-10-12', d3: '2026-10-08', d4: '2026-10-05', d5: '2026-09-30', d6: '2026-09-14', d7: '2026-09-24', d8: '2026-10-02', d9: '2026-09-28', d10: '2026-09-10', d11: '2026-09-02', d12: '2026-08-24',
  d13: '2026-09-08', d14: '2026-09-16', d15: '2026-08-12', d16: '2026-07-20', d17: '2026-08-27', d18: '2026-08-04', d19: '2026-08-31', d20: '2026-08-21', d21: '2026-09-02', d22: '2026-07-30', d23: '2026-08-28', d24: '2026-09-21',
};
export const WIN_WHY: Record<string, string> = { d19: 'Time to value', d20: 'Integrations', d21: 'Price', d22: 'Executive sponsor', d23: 'Time to value', d24: 'Price' };
export const cycleDays = (d: Deal) => Math.max(1, dayDiff(d.close, OPENED[d.id] ?? d.close));
export const ageDays = (d: Deal) => Math.max(0, dayDiff(TODAY_KEY, OPENED[d.id] ?? TODAY_KEY));

export interface Lost { id: string; company: string; amount: number; owner: string; at: StageId; why: string; opened: string; closed: string }
const L = (id: string, company: string, amount: number, owner: string, at: StageId, why: string, opened: string, closed: string): Lost => ({ id, company, amount, owner, at, why, opened, closed });
export const LOST: Lost[] = [
  L('l1', 'Drayton Freight', 64000, 'Tomás Reyes', 'proposal', 'Chose a competitor', '2026-08-18', '2026-10-06'), L('l2', 'Quayside Hotels', 38000, 'Tomás Reyes', 'qualified', 'Price or budget', '2026-09-08', '2026-10-09'),
  L('l3', 'Orchard Lane Grocers', 52000, 'Tomás Reyes', 'negotiation', 'Stalled, no decision', '2026-07-27', '2026-10-14'), L('l4', 'Stonehaven Mutual', 190000, 'Maya Chen', 'negotiation', 'Chose a competitor', '2026-07-06', '2026-10-12'),
  L('l5', 'Eastfield Council', 87000, 'Maya Chen', 'proposal', 'Missing feature', '2026-08-31', '2026-10-19'), L('l6', 'Larkspur Pharma', 120000, 'Priya Nair', 'negotiation', 'Price or budget', '2026-07-22', '2026-10-15'),
  L('l7', 'Redwater Utilities', 76000, 'Jonas Weber', 'proposal', 'Bad timing', '2026-09-01', '2026-10-21'), L('l8', 'Kinlet Group', 41000, 'Jonas Weber', 'qualified', 'Champion left', '2026-09-15', '2026-10-07'),
  L('l9', 'Pip & Posy', 17000, 'Amara Okafor', 'lead', 'Price or budget', '2026-09-29', '2026-10-05'),
];
export const CYCLE_PRIOR = [{ q: 'Q1', avg: 56 }, { q: 'Q2', avg: 52 }, { q: 'Q3', avg: 49 }];

/* ------------------------------------------------------------------ accounts and contacts */
export interface Contact { name: string; role: string; email: string; tag: string; ago: number }
export interface Account { id: string; name: string; industry: string; region: string; size: number; since: string | null; base: number; owner: string; contacts: Contact[]; trend: number[] }
type AR = [string, string, string, number, string | null, number, string];
const AR_ROWS: AR[] = [
  ['Saltmarsh Brewing', 'Food and drink', 'UK', 120, null, 0, 'Amara Okafor'], ['Bluepeak Outfitters', 'Retail', 'US West', 640, null, 0, 'Tomás Reyes'], ['Solace Wellness', 'Healthcare', 'US East', 310, null, 0, 'Jonas Weber'],
  ['Nimbus Print Co.', 'Manufacturing', 'US Midwest', 85, '2024-03-11', 14000, 'Amara Okafor'], ['Granite Peak Builders', 'Construction', 'US West', 220, null, 0, 'Priya Nair'], ['Harbor & Vine', 'Hospitality', 'US East', 460, '2023-06-19', 41000, 'Maya Chen'],
  ['Fernhill Studios', 'Media', 'UK', 70, null, 0, 'Jonas Weber'], ['Aldergate Insurance', 'Insurance', 'UK', 1400, null, 0, 'Tomás Reyes'], ['Quillon Labs', 'Research', 'US East', 190, null, 0, 'Priya Nair'],
  ['Meridian Schools Trust', 'Education', 'UK', 2100, null, 0, 'Maya Chen'], ['Oakridge Foods', 'Food and drink', 'US Midwest', 880, '2022-11-02', 62000, 'Priya Nair'], ['Pinecrest Health', 'Healthcare', 'US East', 3200, null, 0, 'Maya Chen'],
  ['Marlow & Reed', 'Professional services', 'UK', 260, '2024-09-23', 33000, 'Jonas Weber'], ['Tidewater Logistics', 'Logistics', 'US East', 740, null, 0, 'Tomás Reyes'], ['Copperline Energy', 'Energy', 'US Gulf', 2600, null, 0, 'Maya Chen'],
  ['Kestrel Aero', 'Aerospace', 'US West', 1900, '2021-02-08', 96000, 'Priya Nair'], ['Vantage Row', 'Real estate', 'US East', 340, '2025-01-27', 27000, 'Tomás Reyes'], ['Ironbridge Capital', 'Financial services', 'UK', 520, null, 0, 'Jonas Weber'],
  ['Brightwell Dental', 'Healthcare', 'US West', 95, null, 0, 'Amara Okafor'], ['Halden Marine', 'Maritime', 'Nordics', 410, null, 0, 'Priya Nair'], ['Westbrook Optics', 'Retail', 'US East', 280, '2023-09-14', 22000, 'Maya Chen'],
  ['Fairlane Auto Group', 'Automotive', 'US Midwest', 1250, null, 0, 'Tomás Reyes'], ['Elmstead Credit Union', 'Financial services', 'US Midwest', 360, null, 0, 'Jonas Weber'], ['Cedar & Co', 'Agency', 'UK', 28, null, 0, 'Amara Okafor'],
  ['Lowell & Finch', 'Legal', 'UK', 150, '2022-05-16', 48000, 'Priya Nair'], ['Northgate Municipal', 'Public sector', 'UK', 900, '2023-02-06', 76000, 'Maya Chen'], ['Ashby Roasters', 'Food and drink', 'US West', 64, '2024-11-04', 18000, 'Amara Okafor'],
  ['Drumlin Press', 'Publishing', 'US East', 110, '2025-04-22', 24000, 'Tomás Reyes'],
];
const FIRST = ['Elena', 'Marcus', 'Hana', 'Owen', 'Sofia', 'Rahul', 'Isla', 'Dmitri', 'Naomi', 'Felix', 'Leila', 'Callum', 'Yara', 'Theo', 'Anika', 'Jasper'];
const LAST = ['Marsh', 'Okoye', 'Lindqvist', 'Brandt', 'Castellano', 'Iyer', 'Whitlock', 'Novak', 'Adeyemi', 'Fontaine', 'Kowalski', 'Haddad', 'Tran', 'Moreau', 'Sutter', 'Alvarez'];
const ROLE: Array<[string, string]> = [['Chief Operating Officer', 'Economic buyer'], ['VP Operations', 'Champion'], ['Head of Procurement', 'Procurement'], ['Finance Director', 'Economic buyer'], ['IT Manager', 'Technical'], ['Operations Lead', 'Champion'], ['Managing Director', 'Economic buyer'], ['Systems Administrator', 'Technical']];
const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; };
const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
const mkContacts = (name: string, last: number): Contact[] => {
  const h = hash(name), n = 2 + (h % 2);
  return Array.from({ length: n }, (_, i) => { const f = FIRST[(h + i * 5) % FIRST.length]!, l = LAST[(h + i * 7 + 3) % LAST.length]!, r = ROLE[(h + i * 3) % ROLE.length]!; return { name: `${f} ${l}`, role: r[0], tag: i === 0 ? 'Primary' : r[1], email: `${f}.${l}@${slug(name)}.example`.toLowerCase(), ago: i === 0 ? last : last + 4 + ((h >> i) % 19) }; });
};
export const ACCOUNTS: Account[] = AR_ROWS.map(([name, industry, region, size, since, base, owner]) => {
  const own = DEALS.filter((d) => d.company === name), won = sum(own.filter((d) => d.stage === 'won'));
  const first = own.find((d) => d.stage === 'won');
  const last = Math.min(...[...SEED_DEALS.filter((d) => d.company === name).map((d) => d.touch), 30]);
  return { id: slug(name), name, industry, region, size, since: since ?? (first ? first.close : null), base, owner, contacts: mkContacts(name, last), trend: base || won ? [0.74, 0.8, 0.85, 0.9, 0.95, 1].map((f, i, a) => Math.round(i === a.length - 1 ? base + won : (base || won) * f * (base ? 1 : 0))) : [] };
});
export const arrOf = (a: Account, deals: Deal[]) => a.base + sum(deals.filter((d) => d.company === a.name && d.stage === 'won'));
