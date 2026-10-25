'use client';
// Data and pure logic for the sales dashboard: stages, reps, deals, health, summaries and the weekly forecast. Reference date: 24 Oct 2026.
import { fmt } from './_dash';

export type StageId = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won';
export interface Stage { id: StageId; label: string; p: number }
export const STAGES: Stage[] = [
  { id: 'lead', label: 'Lead', p: 10 }, { id: 'qualified', label: 'Qualified', p: 30 }, { id: 'proposal', label: 'Proposal', p: 55 },
  { id: 'negotiation', label: 'Negotiation', p: 75 }, { id: 'won', label: 'Won', p: 100 },
];
export const stageLabel = (id: StageId) => STAGES.find((s) => s.id === id)!.label;

export interface Deal { id: string; company: string; title: string; amount: number; owner: string; stage: StageId; close: string; adj: number; touch: number }
export interface Rep { name: string; role: string; quota: number; lost: number }
export const REPS: Rep[] = [
  { name: 'Maya Chen', role: 'Enterprise AE', quota: 320000, lost: 2 }, { name: 'Priya Nair', role: 'Enterprise AE', quota: 270000, lost: 1 },
  { name: 'Tomás Reyes', role: 'Mid-market AE', quota: 250000, lost: 3 }, { name: 'Jonas Weber', role: 'Mid-market AE', quota: 220000, lost: 2 },
  { name: 'Amara Okafor', role: 'SMB AE', quota: 140000, lost: 1 },
];
export const TEAM_QUOTA = REPS.reduce((a, r) => a + r.quota, 0);
export const TEAM_LOST = REPS.reduce((a, r) => a + r.lost, 0);

const D = (id: string, company: string, title: string, amount: number, owner: string, stage: StageId, close: string, adj: number, touch: number): Deal => ({ id, company, title, amount, owner, stage, close, adj, touch });
export const DEALS: Deal[] = [
  D('d1', 'Saltmarsh Brewing', 'Starter plan, 12 seats', 18000, 'Amara Okafor', 'lead', '2026-12-04', 0, 3),
  D('d2', 'Bluepeak Outfitters', 'Multi-store rollout', 64000, 'Tomás Reyes', 'lead', '2026-12-11', 5, 6),
  D('d3', 'Solace Wellness', 'Clinic network pilot', 42000, 'Jonas Weber', 'lead', '2026-11-27', -5, 9),
  D('d4', 'Nimbus Print Co.', 'Team plan, 25 seats', 27500, 'Amara Okafor', 'lead', '2026-11-20', 5, 2),
  D('d5', 'Granite Peak Builders', 'Field operations add-on', 36000, 'Priya Nair', 'lead', '2026-12-18', -5, 15),
  D('d6', 'Harbor & Vine', 'Annual licence', 52000, 'Maya Chen', 'qualified', '2026-11-13', 5, 4),
  D('d7', 'Fernhill Studios', 'Studio suite, 18 seats', 31000, 'Jonas Weber', 'qualified', '2026-11-06', 10, 5),
  D('d8', 'Aldergate Insurance', 'Broker portal', 118000, 'Tomás Reyes', 'qualified', '2026-12-09', -5, 8),
  D('d9', 'Quillon Labs', 'Research seats, 30', 46000, 'Priya Nair', 'qualified', '2026-11-24', 10, 1),
  D('d10', 'Meridian Schools Trust', 'District pilot', 88000, 'Maya Chen', 'qualified', '2026-12-15', -10, 11),
  D('d11', 'Oakridge Foods', 'Supplier network', 96000, 'Priya Nair', 'proposal', '2026-11-12', 5, 3),
  D('d12', 'Pinecrest Health', 'Clinical operations', 164000, 'Maya Chen', 'proposal', '2026-11-30', 0, 6),
  D('d13', 'Marlow & Reed', 'Professional services', 58000, 'Jonas Weber', 'proposal', '2026-10-30', 10, 2),
  D('d14', 'Tidewater Logistics', 'Fleet module', 74000, 'Tomás Reyes', 'proposal', '2026-11-18', -5, 9),
  D('d15', 'Copperline Energy', 'Enterprise agreement', 212000, 'Maya Chen', 'negotiation', '2026-11-20', 5, 1),
  D('d16', 'Kestrel Aero', 'Platform renewal, expanded', 138000, 'Priya Nair', 'negotiation', '2026-10-29', 10, 2),
  D('d17', 'Vantage Row', 'Portfolio rollout', 84000, 'Tomás Reyes', 'negotiation', '2026-10-31', 0, 4),
  D('d18', 'Ironbridge Capital', 'Compliance suite', 176000, 'Jonas Weber', 'negotiation', '2026-10-22', -5, 8),
  D('d19', 'Brightwell Dental', 'Practice group licence', 29000, 'Amara Okafor', 'won', '2026-10-08', 0, 16),
  D('d20', 'Halden Marine', 'Fleet analytics', 71000, 'Priya Nair', 'won', '2026-10-14', 0, 10),
  D('d21', 'Westbrook Optics', 'Retail suite', 54000, 'Maya Chen', 'won', '2026-10-16', 0, 8),
  D('d22', 'Fairlane Auto Group', 'Dealer network', 93000, 'Tomás Reyes', 'won', '2026-10-21', 0, 3),
  D('d23', 'Elmstead Credit Union', 'Member portal', 38000, 'Jonas Weber', 'won', '2026-10-02', 0, 22),
  D('d24', 'Cedar & Co', 'Agency plan', 24000, 'Amara Okafor', 'won', '2026-10-19', 0, 5),
];
/** Prospects the "Add deal" button brings in, one per click. */
export const INBOUND: Array<Omit<Deal, 'id' | 'stage' | 'owner' | 'touch' | 'adj'>> = [
  { company: 'Lakeside Veterinary Group', title: 'Practice management, 6 sites', amount: 33000, close: '2026-12-16' },
  { company: 'Ostrander Textiles', title: 'Wholesale ordering portal', amount: 47000, close: '2026-12-22' },
  { company: 'Pellham & Strand', title: 'Advisory team plan', amount: 22000, close: '2026-11-30' },
];

const DAY = 864e5, TODAY = Date.UTC(2026, 9, 24);
const at = (s: string) => Date.parse(`${s}T00:00:00Z`);
export const daysTo = (s: string) => Math.round((at(s) - TODAY) / DAY);
export const dateLabel = (s: string) => new Date(at(s)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const inOctober = (d: Deal) => d.close.startsWith('2026-10');
export const prob = (d: Deal) => (d.stage === 'won' ? 100 : Math.max(5, Math.min(95, STAGES.find((s) => s.id === d.stage)!.p + d.adj)));
export const sum = (ds: Deal[], f: (d: Deal) => number = (d) => d.amount) => ds.reduce((a, d) => a + f(d), 0);
export const money = fmt.c;

export type Level = 'ok' | 'warn' | 'bad';
/** Deal health from what a rep would look at: a passed close date, silence, or an early deal with a near close. */
export function health(d: Deal): { level: Level; why: string } {
  if (d.stage === 'won') return { level: 'ok', why: 'Closed won' };
  const dt = daysTo(d.close);
  if (dt < 0) return { level: 'bad', why: `Close date passed ${-dt} days ago` };
  if (d.touch >= 14) return { level: 'bad', why: `No activity for ${d.touch} days` };
  if (d.touch >= 7) return { level: 'warn', why: `Quiet for ${d.touch} days` };
  if (dt <= 10 && (d.stage === 'lead' || d.stage === 'qualified')) return { level: 'warn', why: `Closing in ${dt} days, still early` };
  return { level: 'ok', why: 'On track' };
}
export const closeNote = (d: Deal) => { if (d.stage === 'won') return dateLabel(d.close); const dt = daysTo(d.close); return dt < 0 ? `${dateLabel(d.close)} · overdue` : dt === 0 ? 'Today' : dt <= 14 ? `${dateLabel(d.close)} · ${dt}d` : dateLabel(d.close); };

export function summarize(ds: Deal[], lost: number) {
  const open = ds.filter((d) => d.stage !== 'won'), won = ds.filter((d) => d.stage === 'won');
  const weighted = sum(open, (d) => (d.amount * prob(d)) / 100), wonV = sum(won);
  return { pipeline: sum(open), openCount: open.length, weighted, wonV, wonCount: won.length, forecast: wonV + weighted, winRate: won.length + lost ? won.length / (won.length + lost) : 0, avg: won.length ? wonV / won.length : 0 };
}

/** Weeks of the quarter, labelled by week ending (Sunday), plus the last day. */
const ENDS = [...Array.from({ length: 13 }, (_, k) => Date.UTC(2026, 9, 4 + 7 * k)), Date.UTC(2026, 11, 31)];
export const WEEK_LABELS = ENDS.map((t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }));
export const TODAY_WEEK = ENDS.findIndex((t) => t >= TODAY);
export function weekly(ds: Deal[], quota: number) {
  const q0 = Date.UTC(2026, 9, 1), qd = (Date.UTC(2026, 11, 31) - q0) / DAY + 1;
  const committed = ENDS.map((t) => Math.round(sum(ds.filter((d) => at(d.close) <= t), (d) => (d.stage === 'won' ? d.amount : t <= TODAY ? 0 : (d.amount * prob(d)) / 100))));
  const target = ENDS.map((t) => Math.round(quota * Math.min(1, ((t - q0) / DAY + 1) / qd)));
  return { committed, target };
}

export interface Event { id: string; who: string; verb: string; company: string; detail?: string; t: string }
export const EVENTS: Event[] = [
  { id: 'e1', who: 'Priya Nair', verb: 'logged a call with', company: 'Kestrel Aero', detail: 'Legal review done, waiting on procurement.', t: '12m' },
  { id: 'e2', who: 'Tomás Reyes', verb: 'sent a proposal to', company: 'Tidewater Logistics', t: '48m' },
  { id: 'e3', who: 'Maya Chen', verb: 'moved', company: 'Pinecrest Health', detail: 'from Qualified to Proposal.', t: '2h' },
  { id: 'e4', who: 'Jonas Weber', verb: 'emailed', company: 'Ironbridge Capital', detail: 'They asked for revised payment terms.', t: '5h' },
  { id: 'e5', who: 'Amara Okafor', verb: 'added', company: 'Saltmarsh Brewing', detail: 'as a new lead from the website.', t: 'Fri' },
  { id: 'e6', who: 'Tomás Reyes', verb: 'won', company: 'Fairlane Auto Group', detail: 'for $93,000.', t: 'Wed' },
  { id: 'e7', who: 'Maya Chen', verb: 'booked a demo with', company: 'Meridian Schools Trust', t: 'Tue' },
];
export const csv = (ds: Deal[]) => ['Company,Deal,Stage,Owner,Amount (USD),Close date,Probability', ...ds.map((d) => [d.company, d.title, stageLabel(d.stage), d.owner, d.amount, d.close, `${prob(d)}%`].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
