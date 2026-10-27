'use client';
// Shared data for every view: task dates, subtasks, comments, upcoming work, dependencies, and the week-by-week load derived from tasks.
import { EPICS, INITIAL, PEOPLE, pts, short, type Cmt, type Sub, type Task } from './_project';

export interface Epic { id: string; name: string; who: string; from: string; to: string; pre: number[] }
const DAY = 864e5, BASE = Date.UTC(2026, 9, 12);
export const iso = (n: number) => new Date(BASE + n * DAY).toISOString().slice(0, 10);
export const dn = (d: string) => Math.round((Date.parse(`${d}T00:00:00Z`) - BASE) / DAY);
export const addDays = (d: string, n: number) => iso(dn(d) + n);
export const TODAY = '2026-10-24';
export const range = (t: { from?: string; to?: string }) => `${short(t.from ?? TODAY)} to ${short(t.to ?? TODAY)}`;

const SCHED: Record<string, [string, string]> = {
  'WEB-131': ['2026-10-19', '2026-10-21'], 'WEB-134': ['2026-10-19', '2026-10-20'], 'WEB-136': ['2026-10-19', '2026-10-22'], 'WEB-137': ['2026-10-20', '2026-10-20'],
  'WEB-139': ['2026-10-19', '2026-10-23'], 'WEB-140': ['2026-10-21', '2026-10-23'], 'WEB-141': ['2026-10-20', '2026-10-22'], 'WEB-144': ['2026-10-22', '2026-10-23'], 'WEB-145': ['2026-10-19', '2026-10-22'],
  'WEB-146': ['2026-10-21', '2026-10-29'], 'WEB-147': ['2026-10-22', '2026-10-28'], 'WEB-148': ['2026-10-21', '2026-10-30'], 'WEB-149': ['2026-10-26', '2026-10-30'],
  'WEB-142': ['2026-10-20', '2026-10-28'], 'WEB-150': ['2026-10-22', '2026-10-27'],
  'WEB-151': ['2026-10-27', '2026-10-30'], 'WEB-153': ['2026-10-26', '2026-10-27'], 'WEB-155': ['2026-10-28', '2026-10-30'], 'WEB-152': ['2026-10-29', '2026-10-30'], 'WEB-154': ['2026-10-26', '2026-10-30'], 'WEB-156': ['2026-10-29', '2026-10-30'],
};
const S = (id: string, text: string, done = false): Sub => ({ id: `${id}-${text.length}${text[0]}`, text, done });
const C = (id: string, who: string, at: string, text: string): Cmt => ({ id: `${id}-${at}`, who, at, text });
const SUBS: Record<string, Sub[]> = {
  'WEB-146': [S('a', 'Exponential backoff with jitter', true), S('a', 'Dead-letter queue for failed events', true), S('a', 'Idempotency keys on order updates'), S('a', 'Alert when retries exceed 5')],
  'WEB-147': [S('b', 'Focus trap and Escape to close', true), S('b', 'Swipe to dismiss'), S('b', 'Reduced motion variant')],
  'WEB-148': [S('c', 'Price range slider', true), S('c', 'Brand and size facets', true), S('c', 'Facet counts from the search API'), S('c', 'URL state for shared filters')],
  'WEB-142': [S('d', 'Address autofill provider', true), S('d', 'Inline validation messages', true), S('d', 'Postcode formats for 6 countries', true)],
  'WEB-152': [S('e', 'Checkout step headings and landmarks'), S('e', 'Error summary focus'), S('e', 'Screen reader pass with two readers')],
  'WEB-155': [S('f', 'Script the 3x traffic scenario'), S('f', 'Refresh the staging database'), S('f', 'Review results with Sam and Jonas')],
  'WEB-151': [S('g', 'Carrier rate API client'), S('g', 'Free shipping threshold banner')],
};
const CMTS: Record<string, Cmt[]> = {
  'WEB-146': [C('1', 'Jonas Weber', 'Wed 21 Oct, 16:40', 'Provider retries for 72 hours, so we need idempotency before we ship this.'), C('1', 'Sam Delgado', 'Thu 22 Oct, 09:15', 'I can add a queue depth alert on the platform side once the keys are in.')],
  'WEB-149': [C('2', 'Jonas Weber', 'Fri 23 Oct, 11:05', 'Vendor says production keys arrive Monday. Sandbox works for now.')],
  'WEB-153': [C('3', 'Priya Raman', 'Fri 23 Oct, 14:30', 'Three customers reported this. Bundle of 3 at 9.99 charges 30.00.'), C('3', 'Leo Martins', 'Fri 23 Oct, 15:02', 'Found it: we round per item before multiplying. Fix is small.')],
  'WEB-155': [C('4', 'Sam Delgado', 'Thu 22 Oct, 17:20', 'Staging database refresh is scheduled with the vendor for Tuesday.')],
  'WEB-150': [C('5', 'Maya Okafor', 'Fri 23 Oct, 10:00', 'Two directions are up in the review file. I prefer B.'), C('5', 'Priya Raman', 'Fri 23 Oct, 12:45', 'B reads better with the new headline. Go with B.')],
};

const L = (id: number, title: string, who: string, est: number, epic: string, labels: string[], from: string, to: string, sprint: number, pri: Task['pri'] = 'med'): Task =>
  ({ id: `WEB-${id}`, title, status: 'todo', pri, who, est, epic, labels, from, to, sprint });
const LATER: Task[] = [
  L(157, 'Dark mode audit of the design tokens', 'Maya Okafor', 3, 'ds', ['Design'], '2026-11-02', '2026-11-04', 15),
  L(158, 'Component docs for the storefront kit', 'Maya Okafor', 3, 'ds', ['Design', 'Content'], '2026-11-05', '2026-11-06', 15, 'low'),
  L(159, 'Redirect verification crawler', 'Jonas Weber', 5, 'mg', ['Backend'], '2026-11-02', '2026-11-09', 15, 'high'),
  L(160, 'Canonical tags and sitemap rebuild', 'Jonas Weber', 3, 'mg', ['Backend'], '2026-11-10', '2026-11-13', 15),
  L(161, 'Saved cards and wallet payments', 'Aiko Tanaka', 8, 'co', ['Frontend', 'Backend'], '2026-11-02', '2026-11-11', 15, 'high'),
  L(162, 'Order tracking page', 'Leo Martins', 5, 'co', ['Frontend'], '2026-11-04', '2026-11-10', 15),
  L(163, 'Search synonyms and typo tolerance', 'Leo Martins', 5, 'ca', ['Backend'], '2026-11-09', '2026-11-13', 15),
  L(164, 'Product comparison drawer', 'Aiko Tanaka', 5, 'ca', ['Frontend'], '2026-11-09', '2026-11-13', 15),
  L(165, 'Newsletter signup and consent copy', 'Priya Raman', 2, 'lr', ['Content'], '2026-11-05', '2026-11-06', 15, 'low'),
  L(168, 'Monitoring dashboards and alerts', 'Sam Delgado', 5, 'lr', ['Infra'], '2026-11-02', '2026-11-10', 15, 'high'),
  L(166, 'Launch announcement and press page', 'Priya Raman', 5, 'lr', ['Content'], '2026-11-09', '2026-11-20', 16),
  L(167, 'Staff beta feedback triage', 'Sam Delgado', 3, 'lr', ['Infra'], '2026-11-16', '2026-11-18', 16),
  L(169, 'Rollback runbook rehearsal', 'Sam Delgado', 3, 'lr', ['Infra'], '2026-11-23', '2026-11-24', 16, 'high'),
  L(170, 'Gift card redemption at checkout', 'Jonas Weber', 5, 'co', ['Backend', 'Frontend'], '2026-11-09', '2026-11-17', 16),
  L(171, 'Visual QA pass on checkout', 'Maya Okafor', 3, 'co', ['Design'], '2026-11-12', '2026-11-17', 16),
  L(172, 'Performance budget and image audit', 'Leo Martins', 3, 'ca', ['Frontend', 'Infra'], '2026-11-16', '2026-11-19', 16),
  L(173, 'Final copy review across 40 pages', 'Priya Raman', 5, 'lr', ['Content'], '2026-11-16', '2026-11-24', 16),
  L(174, 'Freeze checklist and go/no-go', 'Sam Delgado', 2, 'lr', ['Infra'], '2026-11-25', '2026-11-27', 16, 'high'),
  L(176, 'DNS cutover and cache warm-up', 'Sam Delgado', 5, 'lr', ['Infra'], '2026-11-30', '2026-12-02', 17, 'urgent'),
  L(177, 'Checkout smoke tests in production', 'Aiko Tanaka', 3, 'lr', ['Frontend'], '2026-12-03', '2026-12-03', 17, 'urgent'),
  L(175, 'Post-launch hotfix rota', 'Priya Raman', 2, 'lr', ['Content'], '2026-11-30', '2026-12-03', 17, 'low'),
];
/** Finish-to-start dependencies: [predecessor, successor]. */
export const DEPS: Array<[string, string]> = [['WEB-139', 'WEB-159'], ['WEB-159', 'WEB-160'], ['WEB-146', 'WEB-161'], ['WEB-142', 'WEB-152'], ['WEB-149', 'WEB-170'], ['WEB-148', 'WEB-163'], ['WEB-148', 'WEB-164'], ['WEB-151', 'WEB-162'],
  ['WEB-155', 'WEB-174'], ['WEB-168', 'WEB-169'], ['WEB-169', 'WEB-174'], ['WEB-174', 'WEB-176'], ['WEB-176', 'WEB-177'], ['WEB-157', 'WEB-158'], ['WEB-161', 'WEB-171'], ['WEB-173', 'WEB-174']];

export function seedAll(): Task[] {
  return [...INITIAL.map((t) => ({ ...t, sprint: 14, from: SCHED[t.id]![0], to: SCHED[t.id]![1], subs: SUBS[t.id], cmts: CMTS[t.id] })), ...LATER];
}
export const seedEpics = (): Epic[] => EPICS.map((e) => ({ ...e, pre: [...e.pre] }));

/** An epic spans its own dates and every task in it; progress counts points. */
export function epicStat(e: Epic, all: Task[]) {
  const mine = all.filter((t) => t.epic === e.id); const done = pts(mine.filter((t) => t.status === 'done'));
  const from = [e.from, ...mine.map((t) => t.from!)].sort()[0]!, to = [e.to, ...mine.map((t) => t.to!)].sort().reverse()[0]!;
  return { mine, from, to, done: mine.filter((t) => t.status === 'done').length, p: Math.round(((e.pre[0]! + done) / (e.pre[1]! + pts(mine))) * 100) };
}
/** Dependency slack in days between a predecessor's end and a successor's start (negative = the plan is broken). */
export const slack = (a: Task, b: Task) => dn(b.from!) - dn(a.to!) - 1;

/* ------------------------------------------------------------------ weekly load */
export const WL_N = 7;
export const WL_WEEKS = Array.from({ length: WL_N }, (_, i) => iso(7 + i * 7));
const PTO: Record<string, Record<number, number>> = { 'Leo Martins': { 5: 0 }, 'Maya Okafor': { 5: 3 }, 'Sam Delgado': { 6: 4 } };
export const weekCap = (name: string, w: number) => PTO[name]?.[w] ?? (PEOPLE.find((p) => p.name === name)!.cap / 2);
export const ptoNote = (name: string, w: number) => (PTO[name]?.[w] === undefined ? '' : PTO[name]![w] === 0 ? 'Out of office' : 'Public holiday');
/** A task's points split over weeks by working days (largest remainder, so the parts add up to the estimate exactly). */
export function allocate(t: Task): number[] {
  const out = Array<number>(WL_N).fill(0), cnt = Array<number>(WL_N).fill(0);
  if (!t.from || !t.to) return out;
  const a = dn(t.from), b = dn(t.to);
  for (let d = a; d <= b; d++) if (((d % 7) + 7) % 7 < 5) cnt[Math.max(0, Math.min(WL_N - 1, Math.floor((d - 7) / 7)))]!++;
  const tot = cnt.reduce((x, y) => x + y, 0);
  if (!tot) { out[Math.max(0, Math.min(WL_N - 1, Math.floor((a - 7) / 7)))] = t.est; return out; }
  const raw = cnt.map((c) => (t.est * c) / tot), fl = raw.map(Math.floor); let rem = t.est - fl.reduce((x, y) => x + y, 0);
  [...raw.keys()].sort((x, y) => raw[y]! - fl[y]! - (raw[x]! - fl[x]!) || x - y).forEach((i) => { if (rem > 0) { fl[i]!++; rem--; } });
  return fl;
}
