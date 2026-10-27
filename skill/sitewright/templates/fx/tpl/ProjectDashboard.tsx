'use client';
import { useEffect, useRef, useState } from 'react';
import { AvatarStack, Button, Glyph, Pill, Preview, Shell, type NavEntry } from './_dash';
import { PEOPLE, sprintStats } from './_project';
import { Share } from './_projectboard';
import { BoardView } from './_projectboardview';
import { TaskDrawer } from './_projectdrawer';
import { NOFILTER, useProject } from './_projectstore';
import { TimelineView } from './_projecttimeline';
import { Burndown, BoardGlance, Summary, Timeline, Workload } from './_projectviews';
import { WorkloadView } from './_projectworkload';

const NAV: NavEntry[] = [{ id: 'top', label: 'Overview', icon: 'grid' }, { id: 'board', label: 'Board', icon: 'list' }, { id: 'tl', label: 'Timeline', icon: 'calendar' }, { id: 'wl', label: 'Workload', icon: 'users' }];
const VIEW_OF: Record<string, string> = { overview: 'top', top: 'top', board: 'board', timeline: 'tl', tl: 'tl', workload: 'wl', wl: 'wl' };
const TITLES: Record<string, string> = { top: 'Storefront relaunch', board: 'Board', tl: 'Timeline', wl: 'Workload' };

export default function ProjectDashboard({ brand = 'Northwind' }: { brand?: string }) {
  const s = useProject(); const [nav, setNav] = useState('top'); const heading = useRef<HTMLHeadingElement>(null); const body = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null); const opener = useRef<HTMLElement | null>(null); const first = useRef(true); const skip = useRef(false);
  const stats = sprintStats(s.tasks);

  useEffect(() => { const v = VIEW_OF[new URLSearchParams(window.location.search).get('view') ?? '']; if (v && v !== 'top') { skip.current = true; setNav(v); } setHost(body.current?.closest<HTMLElement>('.td-main') ?? null); }, []);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (skip.current) { skip.current = false; return; }
    s.setOpenId(null);
    body.current?.closest('.td-content')?.scrollTo({ top: 0 }); heading.current?.focus({ preventScroll: true }); s.setLive(`${TITLES[nav] === 'Storefront relaunch' ? 'Overview' : TITLES[nav]} view`);
  }, [nav]); // eslint-disable-line react-hooks/exhaustive-deps

  const openTask = (id: string) => s.setOpenId(id);
  const showEpic = (epic: string) => { s.setFilters({ ...NOFILTER, epic }); setNav('board'); };
  const pct = Math.round((stats.total ? stats.doneP / stats.total : 0) * 100);
  const nav2 = NAV.map((n) => (n.id === 'board' ? { ...n, badge: stats.open.length } : n.id === 'wl' ? { ...n, badge: undefined } : n));
  const crumbs = nav === 'top' ? [brand, 'Projects', 'Storefront relaunch'] : [brand, 'Projects', 'Storefront relaunch', TITLES[nav]!];

  return (
    <Shell brand={brand} nav={nav2} active={nav} onNav={setNav} title={TITLES[nav]} crumbs={crumbs} searchHint="Search tasks" user={{ name: 'Priya Raman', role: 'Product' }}>
      <div ref={body} className={nav === 'board' ? 'tp-fillwrap' : 'tp-wrap'} key={nav} id={`tp-sec-${nav}`}>
        {nav === 'top' && (
          <div className="tp-root">
            <div className="tp-head">
              <div className="td-ph">
                <div className="tp-ph"><h1 ref={heading} tabIndex={-1}><span className="tp-key">WEB</span>Storefront relaunch</h1>
                  <div className="tp-meta"><Pill tone={stats.tone}>{stats.label}</Pill><span><Glyph name="calendar" size={14} />Due Fri 4 Dec 2026</span><span className="tp-sep" aria-hidden="true" /><AvatarStack names={PEOPLE.map((p) => p.name)} max={5} /><span className="hide-sm">{PEOPLE.length} members</span></div></div>
                <div className="td-ph-a"><Share onCopied={(ok) => s.setLive(ok ? 'Project link copied' : 'Select the link and copy it')} /><Button variant="primary" icon="plus" onClick={() => setNav('board')}>New task</Button></div>
              </div>
              <div className="tp-sprint"><span className="tp-spl"><b>Sprint 14</b><span className="hide-sm">19 to 30 Oct</span></span>
                <div className="tp-spbar" role="progressbar" aria-label="Sprint points completed" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i className={`is-${stats.tone}`} style={{ width: `${pct}%` }} /><u title="Today: 5 of 10 working days gone" /></div>
                <span className="tp-spt"><b>{stats.doneP}</b> of {stats.total} pts · {pct}%</span><span className="tp-spt hide-sm">Day 5 of 10</span></div>
            </div>
            <div className="tp-top"><Burndown tasks={s.tasks} /><Summary tasks={s.tasks} /></div>
            <BoardGlance tasks={s.tasks} wip={s.wip} onOpen={() => setNav('board')} onTask={openTask} />
            <div className="tp-bottom"><div><Timeline tasks={s.data.all} epics={s.data.epics} epic={s.filters.epic} onEpic={showEpic} onOpen={() => setNav('tl')} /></div><div><Workload tasks={s.tasks} onOpen={() => setNav('wl')} /></div></div>
          </div>)}
        {nav === 'board' && <BoardView s={s} heading={heading} />}
        {nav === 'tl' && <TimelineView s={s} heading={heading} onBoard={showEpic} />}
        {nav === 'wl' && <WorkloadView s={s} heading={heading} />}
        <div className="td-sr" role="status" aria-live="polite">{s.live}</div>
        <div className="tp-toastwrap" aria-hidden={!s.toast}>{s.toast && <div className="tp-toast"><span>{s.toast.text}</span><button type="button" onClick={s.undo}>Undo</button></div>}</div>
        <TaskDrawer s={s} host={host} opener={opener} />
      </div>
    </Shell>
  );
}

export function Demo() { return <Preview w={1280} h={150}><ProjectDashboard /></Preview>; }
