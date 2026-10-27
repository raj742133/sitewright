'use client';
// One source of truth for every view: tasks (with dates, subtasks, comments), epics, WIP limits, filters, undo and the live announcement.
import { useEffect, useMemo, useRef, useState } from 'react';
import { STATUSES, type Pri, type Status, type Task } from './_project';
import { addDays, dn, seedAll, seedEpics, type Epic } from './_projectdata';

export interface Filters { q: string; who: string; lab: string; epic: string }
export const NOFILTER: Filters = { q: '', who: 'all', lab: '', epic: '' };
export interface Data { all: Task[]; epics: Epic[] }
export interface Draft { title: string; status: Status; who: string | null; pri: Pri; label: string; est: number }
const EPIC_OF: Record<string, string> = { Design: 'ds', Frontend: 'ca', Backend: 'co', Bug: 'ca', Content: 'lr', Infra: 'lr' };
export const stLabel = (s: Status) => STATUSES.find((x) => x.id === s)!.label;
export type Store = ReturnType<typeof useProject>;

export function useProject() {
  const [data, setData] = useState<Data>(() => ({ all: seedAll(), epics: seedEpics() }));
  const [wip, setWipState] = useState<Record<Status, number>>({ todo: 0, progress: 5, review: 3, done: 0 });
  const [filters, setFilters] = useState<Filters>(NOFILTER); const [group, setGroup] = useState<'status' | 'who'>('status');
  const [toast, setToast] = useState<{ text: string; undo: Data } | null>(null); const [live, setLive] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const focusId = useRef<string | null>(null);
  const tasks = useMemo(() => data.all.filter((t) => t.sprint === 14), [data.all]);
  const later = useMemo(() => data.all.filter((t) => t.sprint !== 14), [data.all]);
  const nextId = `WEB-${Math.max(156, ...data.all.map((t) => Number(t.id.slice(4)))) + 1}`;
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 7000); return () => clearTimeout(t); }, [toast]);

  const commit = (next: Partial<Data>, text: string, quiet = false) => { if (!quiet) setToast({ text, undo: data }); setLive(text); setData({ ...data, ...next }); };
  const sprint = (next: Task[], text: string, quiet = false) => commit({ all: [...next, ...later] }, text, quiet);
  const undo = () => { if (!toast) return; setData(toast.undo); setLive('Change undone'); setToast(null); };

  const move = (id: string, status: Status, before: string | null, who?: string | null) => {
    const t = tasks.find((x) => x.id === id); if (!t) return; const rest = tasks.filter((x) => x.id !== id);
    let i = before ? rest.findIndex((x) => x.id === before) : -1;
    if (i < 0) { let last = -1; rest.forEach((x, k) => { if (x.status === status) last = k; }); i = last + 1; }
    const nw = who === undefined ? t.who : who;
    const next = [...rest.slice(0, i), { ...t, status, who: nw, blocked: status === 'done' ? undefined : t.blocked }, ...rest.slice(i)];
    if (next.every((x, k) => x.id === tasks[k]!.id && x.status === tasks[k]!.status && x.who === tasks[k]!.who)) return;
    const lim = wip[status], over = status !== t.status && lim > 0 && tasks.filter((x) => x.status === status).length + 1 > lim;
    const base = t.status === status && nw === t.who ? `${id} reordered in ${stLabel(status)}` : `${id} moved to ${stLabel(status)}${nw !== t.who ? `, assigned to ${nw ?? 'nobody'}` : ''}`;
    focusId.current = id; sprint(next, over ? `${base}. Over the WIP limit of ${lim}` : base);
  };
  const patch = (id: string, p: Partial<Task>, text: string, quiet = false) => { focusId.current = id; commit({ all: data.all.map((t) => (t.id === id ? { ...t, ...p } : t)) }, text, quiet); };
  const add = (d: Draft, opts: { keepFocus?: boolean } = {}) => {
    const epic = filters.epic || EPIC_OF[d.label] || 'ca';
    const t: Task = { id: nextId, title: d.title, status: d.status, pri: d.pri, who: d.who, labels: [d.label], est: d.est, epic, sprint: 14, from: '2026-10-26', to: addDays('2026-10-26', Math.min(4, d.est)), fresh: true };
    const first = tasks.findIndex((x) => x.status === d.status); const next = first < 0 ? [...tasks, t] : [...tasks.slice(0, first), t, ...tasks.slice(first)];
    if (filters.q) setFilters({ ...filters, q: '' }); if (!opts.keepFocus) focusId.current = t.id;
    sprint(next, `${t.id} created in ${stLabel(d.status)}`);
    setTimeout(() => setData((x) => ({ ...x, all: x.all.map((y) => (y.id === t.id ? { ...y, fresh: false } : y)) })), 2600);
    return t.id;
  };
  const remove = (id: string) => commit({ all: data.all.filter((t) => t.id !== id) }, `${id} deleted`);
  /** Shift a task's dates; `df` moves the start, `dt` the end (both: the whole bar). */
  const shiftTask = (id: string, df: number, dt: number) => {
    const t = data.all.find((x) => x.id === id); if (!t || (!df && !dt)) return;
    let from = addDays(t.from!, df), to = addDays(t.to!, dt); if (dn(to) < dn(from)) { if (df) from = to; else to = from; }
    patch(id, { from, to }, `${id} now ${from} to ${to}`);
  };
  const shiftEpic = (id: string, d: number) => {
    if (!d) return;
    commit({ epics: data.epics.map((e) => (e.id === id ? { ...e, from: addDays(e.from, d), to: addDays(e.to, d) } : e)), all: data.all.map((t) => (t.epic === id ? { ...t, from: addDays(t.from!, d), to: addDays(t.to!, d) } : t)) }, `${data.epics.find((e) => e.id === id)!.name} shifted ${d > 0 ? 'later' : 'earlier'} by ${Math.abs(d)} ${Math.abs(d) === 1 ? 'day' : 'days'}`);
  };
  const setWip = (st: Status, n: number) => { setWipState((w) => ({ ...w, [st]: n })); setLive(n ? `${stLabel(st)} WIP limit set to ${n}` : `${stLabel(st)} WIP limit removed`); };

  return { data, tasks, later, wip, setWip, filters, setFilters, group, setGroup, toast, undo, live, setLive, openId, setOpenId, focusId, nextId, commit, move, patch, add, remove, shiftTask, shiftEpic };
}
