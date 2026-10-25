'use client';
// Data and small pure helpers for the project dashboard: people, epics, the sprint's tasks, and the numbers derived from them.
import { cx, Icon } from './_dash';

export type Status = 'todo' | 'progress' | 'review' | 'done';
export type Pri = 'urgent' | 'high' | 'med' | 'low';
export interface Task { id: string; title: string; status: Status; pri: Pri; who: string | null; labels: string[]; est: number; epic: string; blocked?: string; fresh?: boolean }

export const STATUSES: Array<{ id: Status; label: string }> = [{ id: 'todo', label: 'To do' }, { id: 'progress', label: 'In progress' }, { id: 'review', label: 'In review' }, { id: 'done', label: 'Done' }];
export const PRIS: Array<{ id: Pri; label: string }> = [{ id: 'urgent', label: 'Urgent' }, { id: 'high', label: 'High' }, { id: 'med', label: 'Medium' }, { id: 'low', label: 'Low' }];
export const LABELS = ['Design', 'Frontend', 'Backend', 'Bug', 'Content', 'Infra'];
export const ESTIMATES = [1, 2, 3, 5, 8];
export const PEOPLE = [
  { name: 'Maya Okafor', role: 'Design lead', cap: 12 }, { name: 'Jonas Weber', role: 'Backend', cap: 12 }, { name: 'Priya Raman', role: 'Content & product', cap: 10 },
  { name: 'Leo Martins', role: 'Full-stack', cap: 12 }, { name: 'Aiko Tanaka', role: 'Frontend', cap: 12 }, { name: 'Sam Delgado', role: 'Platform', cap: 12 },
];
export const EPICS = [
  { id: 'ds', name: 'Design system', who: 'Maya Okafor', from: '2026-10-12', to: '2026-11-06', pre: [8, 12] },
  { id: 'mg', name: 'Migration & redirects', who: 'Jonas Weber', from: '2026-10-12', to: '2026-11-13', pre: [10, 14] },
  { id: 'co', name: 'Checkout rebuild', who: 'Aiko Tanaka', from: '2026-10-19', to: '2026-11-27', pre: [0, 20] },
  { id: 'ca', name: 'Catalog & search', who: 'Leo Martins', from: '2026-10-14', to: '2026-11-27', pre: [6, 24] },
  { id: 'lr', name: 'Launch readiness', who: 'Sam Delgado', from: '2026-10-26', to: '2026-12-03', pre: [0, 18] },
];
export const MILESTONES = [{ id: 'm1', d: '2026-10-30', label: 'Sprint 14 review' }, { id: 'm2', d: '2026-11-13', label: 'Staff beta' }, { id: 'm3', d: '2026-11-27', label: 'Content freeze' }, { id: 'm4', d: '2026-12-04', label: 'Launch' }];
export const SPRINTS = [{ n: 13, a: '2026-10-05', b: '2026-10-19' }, { n: 14, a: '2026-10-19', b: '2026-11-02' }, { n: 15, a: '2026-11-02', b: '2026-11-16' }, { n: 16, a: '2026-11-16', b: '2026-11-30' }, { n: 17, a: '2026-11-30', b: '2026-12-14' }];

const T = (id: number, title: string, status: Status, pri: Pri, who: string, est: number, epic: string, labels: string[], blocked?: string): Task => ({ id: `WEB-${id}`, title, status, pri, who, est, epic, labels, blocked });
export const INITIAL: Task[] = [
  T(151, 'Shipping estimate in the cart drawer', 'todo', 'high', 'Leo Martins', 3, 'co', ['Backend']),
  T(153, 'Bundle prices round up by one cent', 'todo', 'urgent', 'Leo Martins', 2, 'ca', ['Bug', 'Backend']),
  T(155, 'Load test checkout at 3x Black Friday traffic', 'todo', 'high', 'Sam Delgado', 5, 'lr', ['Infra'], 'Staging database refresh pending'),
  T(152, 'Keyboard and screen reader pass on checkout', 'todo', 'high', 'Aiko Tanaka', 3, 'co', ['Frontend']),
  T(154, 'Category landing copy for 12 pages', 'todo', 'med', 'Priya Raman', 3, 'ca', ['Content']),
  T(156, 'Wishlist empty state illustration', 'todo', 'low', 'Maya Okafor', 2, 'ca', ['Design']),
  T(146, 'Payment provider webhook retries', 'progress', 'urgent', 'Jonas Weber', 5, 'co', ['Backend']),
  T(147, 'Mobile navigation drawer', 'progress', 'high', 'Aiko Tanaka', 3, 'ds', ['Frontend']),
  T(148, 'Faceted filters on the catalog grid', 'progress', 'med', 'Leo Martins', 5, 'ca', ['Frontend', 'Backend']),
  T(149, 'Gift card balance lookup', 'progress', 'med', 'Jonas Weber', 3, 'co', ['Backend'], 'Waiting on vendor API keys'),
  T(142, 'Address form validation and autofill', 'review', 'high', 'Aiko Tanaka', 5, 'co', ['Frontend']),
  T(150, 'Homepage hero art direction', 'review', 'med', 'Maya Okafor', 3, 'ds', ['Design']),
  T(131, 'Spacing and type tokens', 'done', 'med', 'Maya Okafor', 3, 'ds', ['Design']),
  T(134, 'Preview deployments for every branch', 'done', 'high', 'Sam Delgado', 2, 'mg', ['Infra']),
  T(136, 'Product card component', 'done', 'med', 'Aiko Tanaka', 3, 'ds', ['Frontend', 'Design']),
  T(137, 'Cart badge shows the wrong count', 'done', 'high', 'Leo Martins', 1, 'co', ['Bug', 'Frontend']),
  T(139, 'Redirect map for the top 200 URLs', 'done', 'high', 'Jonas Weber', 5, 'mg', ['Backend']),
  T(140, 'Returns policy copy', 'done', 'low', 'Priya Raman', 3, 'co', ['Content']),
  T(141, 'Image CDN resize rules', 'done', 'med', 'Sam Delgado', 3, 'ca', ['Infra']),
  T(144, 'Search results empty state', 'done', 'low', 'Maya Okafor', 2, 'ca', ['Design', 'Frontend']),
  T(145, 'Order confirmation email template', 'done', 'med', 'Priya Raman', 3, 'co', ['Content', 'Backend']),
];

export const pts = (t: Task[]) => t.reduce((a, x) => a + x.est, 0);
export const COMMIT = pts(INITIAL);
export const DAY_LABELS = ['Start', 'Mon 19', 'Tue 20', 'Wed 21', 'Thu 22', 'Fri 23', 'Mon 26', 'Tue 27', 'Wed 28', 'Thu 29', 'Fri 30'];
export const TODAY_IDX = 5;
const HIST = [0, 1, 4, 9, 18];

/** Counts and points for the sprint, from the live task list. */
export function sprintStats(tasks: Task[]) {
  const by = (s: Status) => tasks.filter((t) => t.status === s);
  const open = tasks.filter((t) => t.status !== 'done');
  const blocked = open.filter((t) => t.blocked);
  const doneP = pts(by('done')), total = pts(tasks), remaining = total - doneP;
  const ideal = Math.round(COMMIT * (1 - TODAY_IDX / 10) * 10) / 10;
  const behind = remaining - ideal, v = doneP / TODAY_IDX;
  const tone = behind <= COMMIT * 0.03 ? 'ok' : behind <= COMMIT * 0.2 ? 'warn' : 'bad';
  return { by, open, blocked, doneP, total, remaining, ideal, behind, v, tone: tone as 'ok' | 'warn' | 'bad', label: tone === 'ok' ? 'On track' : tone === 'warn' ? 'Behind pace' : 'At risk', carry: Math.max(0, Math.round((remaining - v * 5) * 10) / 10), scope: total - COMMIT };
}
/** Ideal line, actual history up to today, and a projection at today's velocity. */
export function burndown(tasks: Task[]) {
  const s = sprintStats(tasks);
  const ideal = DAY_LABELS.map((_, i) => Math.round(COMMIT * (1 - i / 10) * 10) / 10);
  const actual = DAY_LABELS.map((_, i) => (i < TODAY_IDX ? COMMIT - HIST[i]! : i === TODAY_IDX ? s.remaining : Math.max(0, Math.round((s.remaining - s.v * (i - TODAY_IDX)) * 10) / 10)));
  return { ideal, actual, s };
}

const D0 = Date.UTC(2026, 9, 12), SPAN = 56;
export const dayOf = (d: string) => (Date.parse(`${d}T00:00:00Z`) - D0) / 864e5;
export const pctOf = (d: string, end = false) => Math.max(0, Math.min(100, ((dayOf(d) + (end ? 1 : 0)) / SPAN) * 100));
export const TODAY_PCT = ((dayOf('2026-10-24') + 0.5) / SPAN) * 100;
export const short = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const WEEKS = Array.from({ length: 8 }, (_, i) => short(new Date(D0 + i * 7 * 864e5).toISOString().slice(0, 10)));

/* ------------------------------------------------------------------ small visuals */
export function PriIcon({ pri }: { pri: Pri }) {
  const label = PRIS.find((p) => p.id === pri)!.label;
  if (pri === 'urgent') return <svg className="tp-pri is-urgent" width="14" height="14" viewBox="0 0 14 14" role="img" aria-label="Priority: Urgent"><title>Urgent</title><rect width="14" height="14" rx="3.5" /><path d="M7 3.5v4M7 10v.01" stroke="var(--on-primary, #fff)" strokeWidth="1.7" strokeLinecap="round" /></svg>;
  const n = pri === 'high' ? 3 : pri === 'med' ? 2 : 1;
  return <svg className="tp-pri" width="14" height="14" viewBox="0 0 14 14" role="img" aria-label={`Priority: ${label}`}><title>{label}</title>{[0, 1, 2].map((i) => <rect key={i} x={1 + i * 4.5} y={9 - i * 3.5} width="3" height={4 + i * 3.5} rx="1" opacity={i < n ? 1 : 0.28} />)}</svg>;
}
export function StatusIcon({ s }: { s: Status }) {
  const c = s === 'todo' ? <circle cx="8" cy="8" r="5.5" strokeDasharray="2.4 2.2" /> : s === 'progress' ? <><circle cx="8" cy="8" r="5.5" /><path d="M8 5a3 3 0 010 6z" fill="currentColor" stroke="none" /></> : s === 'review' ? <><circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="1.8" fill="currentColor" stroke="none" /></> : <><circle cx="8" cy="8" r="6.5" fill="currentColor" stroke="none" /><path d="M5.2 8.3l2 2 3.6-4" stroke="var(--raised, #fff)" /></>;
  return <svg className={cx('tp-st', `is-${s}`)} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{c}</svg>;
}
export function LabelChip({ name }: { name: string }) { return <span className="tp-lab" data-l={name}><i />{name}</span>; }
export { Icon };
