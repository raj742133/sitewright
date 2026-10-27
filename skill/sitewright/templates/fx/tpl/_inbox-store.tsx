// Shared data for every Support-inbox view: the customers (built from the live conversations plus accounts that have none open),
// health scores, settings defaults and the 180-day history that Reports reads. One source, so the inbox, Customers and Reports agree.
import { seeded } from './_dash';
import { NOW, TEAM, type Channel, type Conv, type Customer, type Priority } from './_inbox';

/* ---------------------------------------------------------------- customers */
export type Contact = Customer & { last: number };
export const EXTRA_CONTACTS: Contact[] = [
  { name: 'Ruth Abara', email: 'ruth@beaconprint.example', company: 'Beacon Print Co', plan: 'Business', mrr: 310, location: 'Leeds, UK', tz: 1, since: 'Feb 2024', tags: ['vip'], prev: [{ s: 'Bulk edit time entries', d: '20 Oct', st: 'Resolved' }, { s: 'Add a client portal logo', d: '2 Sep', st: 'Resolved' }, { s: 'Quarterly invoice template', d: '11 May', st: 'Resolved' }], csat: 0.97, ratings: 11, last: 2880 },
  { name: 'Ben Harlow', email: 'ben@harlowfinch.example', company: 'Harlow & Finch', plan: 'Team', mrr: 152, location: 'Austin, US', tz: -5, since: 'Sep 2024', tags: ['api'], prev: [{ s: 'Webhook retries', d: '14 Oct', st: 'Resolved' }, { s: 'API key scopes', d: '6 Aug', st: 'Resolved' }], csat: 0.91, ratings: 6, last: 7400 },
  { name: 'Iris Calder', email: 'iris@saltmarsh.example', company: 'Saltmarsh Surveying', plan: 'Starter', mrr: 12, location: 'Bristol, UK', tz: 1, since: 'Jan 2026', tags: ['churn-risk', 'billing'], prev: [{ s: 'Why was my card declined?', d: '9 Oct', st: 'Resolved' }, { s: 'Downgrade options', d: '22 Sep', st: 'Resolved' }], csat: 0.62, ratings: 4, last: 11000 },
  { name: 'Omar Haddad', email: 'omar@kestrelmobile.example', company: 'Kestrel Mobile', plan: 'Enterprise', mrr: 1850, location: 'Dubai, AE', tz: 4, since: 'Nov 2024', tags: ['enterprise', 'sso'], prev: [{ s: 'SCIM provisioning', d: '16 Oct', st: 'Resolved' }, { s: 'Data residency letter', d: '1 Sep', st: 'Resolved' }, { s: 'Okta group mapping', d: '27 Jun', st: 'Resolved' }, { s: 'Annual contract renewal', d: '3 Mar', st: 'Resolved' }], csat: 0.99, ratings: 10, last: 4300 },
  { name: 'Tess Murray', email: 'tess@fernhillbakery.example', company: 'Fernhill Bakery', plan: 'Starter', mrr: 12, location: 'Dublin, IE', tz: 1, since: 'Mar 2026', tags: ['onboarding'], prev: [{ s: 'Set an hourly rate per client', d: '30 Mar', st: 'Resolved' }], csat: 1, ratings: 1, last: 21000 },
  { name: 'Yuki Tanaka', email: 'yuki@quarrylane.example', company: 'Quarry Lane Architects', plan: 'Team', mrr: 190, location: 'Osaka, JP', tz: 9, since: 'Jul 2025', tags: ['invoicing'], prev: [{ s: 'Japanese consumption tax', d: '5 Oct', st: 'Resolved' }, { s: 'PDF fonts', d: '18 Aug', st: 'Resolved' }], csat: 0.93, ratings: 7, last: 9800 },
  { name: 'Carla Ibáñez', email: 'carla@meridianhealth.example', company: 'Meridian Health Group', plan: 'Business', mrr: 520, location: 'Madrid, ES', tz: 2, since: 'Oct 2024', tags: ['billing', 'vip'], prev: [{ s: 'Split invoice across entities', d: '13 Oct', st: 'Resolved' }, { s: 'Purchase order numbers', d: '29 Jul', st: 'Resolved' }, { s: 'Credit note for August', d: '8 Sep', st: 'Resolved' }], csat: 0.95, ratings: 9, last: 1900 },
  { name: 'Dev Patel', email: 'dev@pineconeyoga.example', company: 'Pinecone Yoga', plan: 'Trial', mrr: 0, location: 'Vancouver, CA', tz: -7, since: 'Oct 2026', tags: ['trial'], prev: [], csat: null, ratings: 0, last: 1300 },
  { name: 'Mikael Berg', email: 'mikael@longshore.example', company: 'Longshore Logistics', plan: 'Team', mrr: 95, location: 'Gothenburg, SE', tz: 2, since: 'Feb 2025', tags: ['feature-request'], prev: [{ s: 'Mileage tracking', d: '23 Sep', st: 'Resolved' }, { s: 'Offline timer on mobile', d: '1 Jul', st: 'Resolved' }], csat: 0.85, ratings: 5, last: 15500 },
  { name: 'Alicia Grant', email: 'alicia@redwoodcounsel.example', company: 'Redwood Counsel', plan: 'Business', mrr: 380, location: 'Boston, US', tz: -4, since: 'Apr 2025', tags: ['churn-risk'], prev: [{ s: 'Trust account reporting', d: '7 Oct', st: 'Resolved' }], csat: 0.7, ratings: 3, last: 5200 },
];

export interface CustRow { key: string; cust: Customer; convs: Conv[]; open: number; last: number; health: number }
export const healthOf = (c: Customer, convs: Conv[]) => {
  const open = convs.filter((x) => x.status === 'open');
  let h = 80 + (c.csat === null ? 0 : Math.round((c.csat - 0.9) * 100)) - 9 * open.length - (open.some((x) => x.priority === 'urgent') ? 6 : 0) - (open.some((x) => x.slaLeft !== null && x.slaLeft <= 0) ? 10 : 0);
  if (c.tags.includes('churn-risk')) h -= 22; if (c.plan === 'Trial') h -= 8; if (c.plan === 'Enterprise') h += 4;
  return Math.max(5, Math.min(99, h));
};
export const healthBand = (h: number) => (h >= 70 ? { tone: 'ok' as const, label: 'Healthy' } : h >= 50 ? { tone: 'warn' as const, label: 'Watch' } : { tone: 'bad' as const, label: 'At risk' });
export const agoText = (m: number) => (m < 1 ? 'just now' : m < 60 ? `${Math.round(m)}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`);
const lastOf = (c: Conv) => Math.min(...c.msgs.filter((m) => m.kind !== 'event').map((m) => m.ago));

export function buildRows(convs: Conv[], extras: Contact[]): CustRow[] {
  const by = new Map<string, Conv[]>();
  convs.forEach((c) => by.set(c.cust.email, [...(by.get(c.cust.email) ?? []), c]));
  const rows: CustRow[] = [...by.entries()].map(([email, cs]) => ({ key: email, cust: cs[0]!.cust, convs: cs, open: cs.filter((c) => c.status === 'open').length, last: Math.min(...cs.map(lastOf)), health: healthOf(cs[0]!.cust, cs) }));
  extras.forEach((x) => rows.push({ key: x.email, cust: x, convs: [], open: 0, last: x.last, health: healthOf(x, []) }));
  return rows;
}
export interface Note { id: string; by: string; ago: number; text: string }
export const SEED_NOTES: Record<string, Note[]> = {
  'maya@brightsidedental.example': [{ id: 'n1', by: 'Dana Ortiz', ago: 14400, text: 'Prefers email over chat. Her accountant (Lewis) is cc’d on billing mail; month-end close is the first working day.' }],
  'elliot@fenwicklabs.example': [{ id: 'n2', by: 'Priya Nair', ago: 2900, text: 'Go-live for 240 users is Tuesday 27 Oct. Escalate anything SSO-related straight to engineering on-call.' }, { id: 'n3', by: 'Dana Ortiz', ago: 21600, text: 'Renewal in June. Wants a named contact; I told him it is me.' }],
  'noah@fitzdaughters.example': [{ id: 'n4', by: 'Marcus Lee', ago: 4400, text: 'Shop closed in September. Offer to export data before cancelling; no discount needed.' }],
  'iris@saltmarsh.example': [{ id: 'n5', by: 'Dana Ortiz', ago: 9000, text: 'Two billing complaints this quarter. Check in personally before the January renewal.' }],
  'omar@kestrelmobile.example': [{ id: 'n6', by: 'Priya Nair', ago: 7200, text: 'Security review passed in Q3. Procurement contact is Salma (salma@kestrelmobile.example).' }],
};

/* ---------------------------------------------------------------- settings */
export const PRIORITIES: Priority[] = ['urgent', 'high', 'normal', 'low'];
export interface Settings {
  sla: Record<Priority, { frt: string; res: string }>; bizHours: boolean;
  method: 'round' | 'load' | 'manual'; agents: Record<string, { on: boolean; cap: string }>; rules: Array<{ id: string; tag: string; agent: string }>;
  notif: Record<string, { email: boolean; desktop: boolean; mobile: boolean }>; quiet: boolean;
}
export const DEFAULT_SETTINGS: Settings = {
  sla: { urgent: { frt: '15', res: '4' }, high: { frt: '30', res: '8' }, normal: { frt: '120', res: '24' }, low: { frt: '480', res: '72' } }, bizHours: true,
  method: 'load', agents: { 'Dana Ortiz': { on: true, cap: '12' }, 'Marcus Lee': { on: true, cap: '10' }, 'Priya Nair': { on: true, cap: '10' } },
  rules: [{ id: 'r1', tag: 'billing', agent: 'Dana Ortiz' }, { id: 'r2', tag: 'bug', agent: 'Priya Nair' }, { id: 'r3', tag: 'refund', agent: 'Marcus Lee' }, { id: 'r4', tag: 'churn-risk', agent: 'Marcus Lee' }],
  notif: { assigned: { email: true, desktop: true, mobile: true }, mention: { email: true, desktop: true, mobile: false }, sla: { email: false, desktop: true, mobile: true }, reply: { email: true, desktop: true, mobile: false }, digest: { email: true, desktop: false, mobile: false } }, quiet: true,
};
export const NOTIF_ROWS = [{ id: 'assigned', label: 'A conversation is assigned to me', hint: 'Including by assignment rules' }, { id: 'mention', label: 'I am mentioned in a note', hint: '@name in an internal note' }, { id: 'sla', label: 'An SLA is about to breach', hint: 'Fires 15 minutes before the target' }, { id: 'reply', label: 'A customer replies to a snoozed conversation', hint: 'Wakes the conversation too' }, { id: 'digest', label: 'Daily summary', hint: 'Weekdays at 08:00 your time' }];
export const slaMinutes = (s: Settings, p: Priority) => Number(s.sla[p].frt) || 0;
export const agentNames = TEAM;

/* ---------------------------------------------------------------- 180 days of history (day 0 = 179 days ago, day 179 = Sat 24 Oct 2026) */
export const DAYS = 180;
export const CHANNELS: Channel[] = ['email', 'chat', 'web'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateOf = (i: number) => new Date(NOW - (DAYS - 1 - i) * 86400000);
export const dayName = (i: number) => { const d = dateOf(i); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
const weekend = (i: number) => [0, 6].includes(dateOf(i).getUTCDay());
function gen(seed: number, f: (i: number, r: () => number) => number): number[] { const r = seeded(seed); return Array.from({ length: DAYS }, (_, i) => f(i, r)); }
const volume = (seed: number, base: number) => gen(seed, (i, r) => Math.max(0, Math.round(base * (1 + (0.22 * i) / DAYS) * (weekend(i) ? 0.38 : 1) * (1 + (r() - 0.5) * 0.7))));
export const HIST = {
  vol: { email: volume(11, 5.2), chat: volume(12, 3.1), web: volume(13, 1.6) } as Record<Channel, number[]>,
  frt: gen(21, (i, r) => Math.round(35 * (1 - (0.2 * i) / DAYS) * (weekend(i) ? 1.35 : 1) * (1 + (r() - 0.5) * 0.5))),
  res: gen(22, (i, r) => Math.round(70 * (1 - (0.12 * i) / DAYS) * (weekend(i) ? 1.2 : 1) * (1 + (r() - 0.5) * 0.4)) / 10),
  csat: gen(23, (i, r) => Math.round(89 + (3 * i) / DAYS + (r() - 0.5) * 7)),
};
export const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
export const total = (a: number[]) => a.reduce((x, y) => x + y, 0);
export const PERIODS = [{ id: '7', label: '7 days' }, { id: '30', label: '30 days' }, { id: '90', label: '90 days' }] as const;
export type Period = (typeof PERIODS)[number]['id'];
export const volumeTotal = (from: number, to: number) => CHANNELS.reduce((a, c) => a + total(HIST.vol[c].slice(from, to)), 0);

/** Share a total over weights with the largest-remainder method, so the parts always add up. */
export function share(totalN: number, weights: number[]): number[] {
  const sum = total(weights) || 1; const raw = weights.map((w) => (w / sum) * totalN); const out = raw.map(Math.floor);
  let rest = totalN - total(out); raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rest-- > 0) out[i]!++; });
  return out;
}
export interface PastBreach { ago: number; num: number; subject: string; who: string; pri: Priority; over: number; agent: string }
export const PAST_BREACHES: PastBreach[] = [
  { ago: 2, num: 4809, subject: 'Cannot reset two-factor device', who: 'Rina Kaur', pri: 'high', over: 18, agent: 'Marcus Lee' },
  { ago: 5, num: 4803, subject: 'Payout report is missing rows', who: 'Owen Fraser', pri: 'normal', over: 46, agent: 'Priya Nair' },
  { ago: 9, num: 4788, subject: 'Invoice emails delayed by hours', who: 'Zeynep Aksoy', pri: 'urgent', over: 9, agent: 'Dana Ortiz' },
  { ago: 13, num: 4771, subject: 'Calendar sync duplicates entries', who: 'Callum Reid', pri: 'normal', over: 112, agent: 'Marcus Lee' },
  { ago: 20, num: 4752, subject: 'Wrong currency on a quote', who: 'Ines Carvalho', pri: 'high', over: 27, agent: 'Dana Ortiz' },
  { ago: 27, num: 4733, subject: 'Cannot delete an archived project', who: 'Mateo Rossi', pri: 'low', over: 205, agent: 'Priya Nair' },
  { ago: 34, num: 4715, subject: 'Timer stops after laptop sleep', who: 'Freya Lindqvist', pri: 'normal', over: 64, agent: 'Marcus Lee' },
  { ago: 44, num: 4694, subject: 'Stripe payout reconciliation', who: 'Anton Wójcik', pri: 'urgent', over: 22, agent: 'Priya Nair' },
  { ago: 58, num: 4660, subject: 'SSO login loops on Safari', who: 'Leila Haddad', pri: 'high', over: 41, agent: 'Priya Nair' },
  { ago: 71, num: 4631, subject: 'Export to Xero misses tax codes', who: 'Peter Nolan', pri: 'normal', over: 88, agent: 'Dana Ortiz' },
  { ago: 83, num: 4602, subject: 'Mobile app crashes on startup', who: 'Sana Iqbal', pri: 'urgent', over: 13, agent: 'Marcus Lee' },
];
