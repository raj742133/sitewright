// Goals: definitions, per-period stats and funnels, all derived from the shared site model so numbers agree with Pages and Sources.
import { seeded, series } from './_dash';
import { TRIAL_BASE, distribute, eventConv, getPages, getSite, hash, type Range } from './_an-data';

export type GoalType = 'page' | 'event' | 'time';
export interface Goal { id: string; name: string; type: GoalType; target: string; targetRate: number; value: number; base?: number; steps?: string[] }
export const SEED_GOALS: Goal[] = [
  { id: 'trial', name: 'Start free trial', type: 'event', target: 'signup_completed', targetRate: 0.03, value: 48, base: TRIAL_BASE, steps: ['Viewed pricing', 'Opened sign-up form'] },
  { id: 'news', name: 'Newsletter signup', type: 'event', target: 'newsletter_subscribe', targetRate: 0.04, value: 2, base: 0.051, steps: ['Scrolled a blog post'] },
  { id: 'docs', name: 'Read getting started', type: 'page', target: '/docs/getting-started', targetRate: 0.22, value: 0, steps: ['Opened the docs'] },
  { id: 'pricing', name: 'View pricing', type: 'page', target: '/pricing', targetRate: 0.2, value: 0, steps: ['Viewed a feature page'] },
  { id: 'contact', name: 'Contact the team', type: 'event', target: 'contact_submit', targetRate: 0.015, value: 120, base: 0.0125, steps: ['Opened the contact page', 'Started the form'] },
  { id: 'demo', name: 'Book a demo', type: 'event', target: 'demo_booked', targetRate: 0.009, value: 340, base: 0.0072, steps: ['Viewed pricing', 'Opened the demo calendar'] },
];
export const TYPE_LABEL: Record<GoalType, string> = { page: 'Page visit', event: 'Custom event', time: 'Time on site' };
/** A believable base rate for a goal the user creates, stable for the same target. */
export const baseFor = (g: Pick<Goal, 'type' | 'target'>) => 0.008 + (hash(`${g.type}:${g.target}`) % 70) / 1000;

export interface FunnelStep { label: string; count: number; frac: number }
export interface GoalStat { goal: Goal; rate: number; prevRate: number; delta: number; conversions: number; revenue: number; daily: number[]; onTarget: boolean; funnel: FunnelStep[] }

export function goalStats(goals: Goal[], range: Range): GoalStat[] {
  const s = getSite(range); const pages = getPages(range);
  return goals.map((goal) => {
    const page = goal.type === 'page' ? pages.find((p) => p.path === goal.target) : undefined;
    const conversions = page ? page.visitors : eventConv(s.visitors, goal.base ?? baseFor(goal), range);
    const rate = conversions / s.visitors;
    const d = (hash(goal.id + range) % 1000) / 1000 * 0.2 - 0.07; const prevRate = rate / (1 + d);
    const names = goal.steps ?? ['Engaged visit', goal.type === 'page' ? `Reached ${goal.target}` : 'Showed intent'];
    const labels = ['All visitors', ...names, goal.name]; const S = labels.length; const r = seeded(hash(goal.id));
    const counts = labels.map((_, k) => (k === 0 ? s.visitors : k === S - 1 ? conversions : Math.round(s.visitors * Math.pow(rate, k / (S - 1)) * (1 + (r() - 0.5) * 0.1))));
    for (let k = S - 2; k >= 1; k--) counts[k] = Math.max(counts[k]!, counts[k + 1]!);
    for (let k = 1; k < S - 1; k++) counts[k] = Math.min(counts[k]!, counts[k - 1]!);
    return {
      goal, rate, prevRate, delta: d * 100, conversions, revenue: conversions * goal.value, onTarget: rate >= goal.targetRate,
      daily: distribute(conversions, series(hash(goal.id) % 997, s.n, { base: 50, trend: 0.2, wave: 0.2, noise: 0.18 })),
      funnel: labels.map((label, k) => ({ label, count: counts[k]!, frac: counts[k]! / s.visitors })),
    };
  });
}
