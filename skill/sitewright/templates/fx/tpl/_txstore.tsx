'use client';
// One state module for the three views: saved analyses (the Results view), recent questions and the grouped suggestions.
import { useCallback, useState } from 'react';
import { RESULTS, type Result } from './_txdata';

export interface Saved { rid: string; name: string; tags: string[]; pinned: boolean; at: string }
const TAGS: Record<string, string[]> = { revenue: ['finance'], mau: ['growth'], customers: ['sales'], churn: ['retention'], funnel: ['growth'], delayed: ['operations'] };
const SEED: Saved[] = [
  { rid: 'revenue', name: 'Q3 revenue by region', tags: ['finance', 'quarterly'], pinned: true, at: '2026-10-14' },
  { rid: 'churn', name: 'Churn by plan, last 30 days', tags: ['retention', 'weekly'], pinned: true, at: '2026-10-18' },
  { rid: 'funnel', name: 'Checkout funnel', tags: ['growth', 'weekly'], pinned: false, at: '2026-10-20' },
  { rid: 'delayed', name: 'Late shipments by carrier', tags: ['operations'], pinned: false, at: '2026-10-23' },
];
export const resOf = (rid: string): Result => RESULTS.find((r) => r.id === rid)!;
export const dateLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const TODAY = '2026-10-24';

export function useSaved() {
  const [saved, setSaved] = useState<Saved[]>(SEED);
  const has = useCallback((rid: string) => saved.some((s) => s.rid === rid), [saved]);
  const add = useCallback((rid: string) => setSaved((s) => (s.some((x) => x.rid === rid) ? s : [...s, { rid, name: resOf(rid).title, tags: TAGS[rid] ?? [], pinned: false, at: TODAY }])), []);
  const patch = useCallback((rid: string, p: Partial<Saved>) => setSaved((s) => s.map((x) => (x.rid === rid ? { ...x, ...p } : x))), []);
  const remove = useCallback((rid: string) => { const i = saved.findIndex((s) => s.rid === rid); const item = saved[i]; if (!item) return null; setSaved((s) => s.filter((x) => x.rid !== rid)); return { item, i }; }, [saved]);
  const restore = useCallback((item: Saved, i: number) => setSaved((s) => { if (s.some((x) => x.rid === item.rid)) return s; const c = [...s]; c.splice(Math.min(i, c.length), 0, item); return c; }), []);
  return { saved, has, add, patch, remove, restore };
}

export const GROUPS: Array<{ title: string; icon: string; ids: string[] }> = [
  { title: 'Revenue and customers', icon: 'dollar', ids: ['revenue', 'customers'] },
  { title: 'Product and growth', icon: 'trend', ids: ['mau', 'funnel'] },
  { title: 'Retention and operations', icon: 'truck', ids: ['churn', 'delayed'] },
];
export const RECENT: Array<{ rid: string; when: string }> = [{ rid: 'delayed', when: 'Today' }, { rid: 'funnel', when: 'Yesterday' }, { rid: 'revenue', when: 'Oct 14' }];
export const VIEWS = ['ask', 'results', 'tables'] as const;
export type ViewId = (typeof VIEWS)[number];
