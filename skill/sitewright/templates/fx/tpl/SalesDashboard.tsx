'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AreaChart, Avatar, Button, Delta, Empty, Glyph, Kpi, Panel, Pill, Preview, Progress, Shell, Table, cx, fmt, type Col, type NavEntry } from './_dash';
import { Board } from './_salesboard';
import { DEALS, INBOUND, REPS, TODAY_WEEK, WEEK_LABELS, csv, daysTo, inOctober, prob, stageLabel, sum, summarize, weekly, type Deal, type StageId } from './_sales';
import { CfgCtx, DEFAULT_CFG, NOW_TS, SEED_DEALS, SEED_LOG, T, TODAY_KEY, ago, dayDiff, fill, mkFm, teamQuota, type Act, type ActType, type Cfg } from './_sales-store';
import { AccountsView } from './_sales-accounts';
import { ActivityView } from './_sales-activity';
import { DealsView } from './_sales-deals';
import { ReportsView } from './_sales-reports';
import { SettingsView } from './_sales-settings';
import { DealDrawer, Toast, ViewHead, type Ops } from './_sales-ui';

const NAV: NavEntry[] = [
  { id: 'pipeline', label: 'Pipeline', icon: 'layers' }, { id: 'deals', label: 'Deals', icon: 'dollar' }, { id: 'accounts', label: 'Accounts', icon: 'users' },
  { id: 'activity', label: 'Activity', icon: 'clock' }, { id: 'reports', label: 'Reports', icon: 'chart' }, { id: 'settings', label: 'Settings', icon: 'settings' },
];
const IDS = NAV.map((n) => n.id);
interface Note { text: string; undo?: { id: string; from: StageId } }
interface RepRow { name: string; role: string; quota: number; won: number; open: number; forecast: number }
const VERB: Record<Exclude<ActType, 'stage'>, string> = { call: 'logged a call with', email: 'logged an email with', meeting: 'logged a meeting with', note: 'noted on' };

export default function SalesDashboard({ brand = 'Ferrum' }: { brand?: string }) {
  const [active, setActive] = useState('pipeline');
  const [deals, setDeals] = useState<Deal[]>(SEED_DEALS);
  const [log, setLog] = useState<Act[]>(SEED_LOG);
  const [cfg, setCfg] = useState<Cfg>(DEFAULT_CFG); const fm = useMemo(() => mkFm(cfg.cur), [cfg.cur]); const ctx = useMemo(() => ({ cfg, fm }), [cfg, fm]);
  const [owner, setOwner] = useState('all'); const [q, setQ] = useState(''); const [month, setMonth] = useState(false);
  const [note, setNote] = useState<Note | null>(null); const [added, setAdded] = useState(0);
  const [drawer, setDrawer] = useState<string | null>(null); const [toast, setToast] = useState<{ text: string; undo?: boolean } | null>(null); const [live, setLive] = useState('');
  const [init, setInit] = useState<{ tab?: string; account?: string; deal?: string }>({});
  const undoRef = useRef<(() => void) | null>(null); const head = useRef<HTMLHeadingElement>(null); const root = useRef<HTMLDivElement>(null); const skipFocus = useRef(1);

  useEffect(() => { // ?view=deals (and &tab=, &deal=, &account=, &open=) open a view directly, for links, screenshots and the audit
    const p = new URLSearchParams(window.location.search); const v = p.get('view');
    setInit({ tab: p.get('tab') ?? undefined, account: p.get('account') ?? undefined, deal: p.get('deal') ?? undefined });
    if (v && IDS.includes(v) && v !== 'pipeline') { skipFocus.current++; setActive(v); } const o = p.get('open'); if (o) setDrawer(o);
  }, []);
  useEffect(() => { // a new view: heading takes focus, the page scrolls to the top, the change is announced
    if (skipFocus.current > 0) { skipFocus.current--; return; }
    const el = head.current; if (!el) return; root.current?.closest('.td-content')?.scrollTo({ top: 0 }); el.focus({ preventScroll: true }); setLive(`${NAV.find((n) => n.id === active)!.label} view`);
  }, [active]);
  const announce = useCallback((t: string) => setLive(t), []);
  const say = (text: string, undo?: () => void) => { undoRef.current = undo ?? null; setToast({ text, undo: !!undo }); setLive(text); };
  const go = (id: string) => { setDrawer(null); if (id !== active) setActive(id); };

  const match = (d: Deal) => (owner === 'all' || d.owner === owner) && (!month || inOctober(d)) && (!q.trim() || `${d.company} ${d.title} ${d.owner}`.toLowerCase().includes(q.trim().toLowerCase()));
  const shown = useMemo(() => deals.filter(match), [deals, owner, q, month]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = owner !== 'all' || month || q.trim() !== '';
  const rep = REPS.find((r) => r.name === owner);
  const quota = rep ? cfg.quotas[rep.name]! : teamQuota(cfg); const lost = rep ? rep.lost : REPS.reduce((a, r) => a + r.lost, 0);
  const now = summarize(shown, lost, cfg.stages);
  const base = useMemo(() => summarize(DEALS.filter(match), lost, cfg.stages), [owner, q, month, lost, cfg.stages]); // eslint-disable-line react-hooks/exhaustive-deps
  const chg = (cur: number, prev: number, f: number) => (prev ? (cur / (prev * f) - 1) * 100 : 0);
  const weeks = useMemo(() => weekly(shown, quota, cfg.stages, cfg.phasing), [shown, quota, cfg.stages, cfg.phasing]);
  const gap = quota - now.forecast, pct = quota ? now.forecast / quota : 0;
  const stageName = (s: StageId) => stageLabel(s, cfg.stages);

  /* ---- shared state changes: every view goes through these, so the log, the deals and the numbers stay one story ---- */
  const nextId = (extra = 0) => `n${log.length + extra}`;
  const entry = (extra: number, p: Omit<Act, 'id' | 'ts' | 'who'> & { who?: string; ts?: number }): Act => ({ id: nextId(extra), ts: NOW_TS + log.length - SEED_LOG.length + extra, who: 'Dana Ortiz', ...p });
  const moveDeals = (ids: string[], to: StageId) => {
    const hit = deals.filter((d) => ids.includes(d.id) && d.stage !== to); if (!hit.length) return;
    const prev = { deals, log }; const set = new Set(hit.map((d) => d.id));
    setDeals([...deals.filter((d) => set.has(d.id)).map((d) => ({ ...d, stage: to, touch: 0 })), ...deals.filter((d) => !set.has(d.id))]);
    setLog([...hit.map((d, i) => entry(i, { type: 'stage', deal: d.id, verb: to === 'won' ? 'won' : 'moved', text: to === 'won' ? 'for $$.' : `from [[${d.stage}]] to [[${to}]].` })).reverse(), ...log]);
    say(hit.length === 1 ? `${hit[0]!.company} moved to ${stageName(to)}` : `${hit.length} deals moved to ${stageName(to)}`, () => { setDeals(prev.deals); setLog(prev.log); say('Change undone'); });
  };
  const reassign = (ids: string[], to: string) => {
    const hit = deals.filter((d) => ids.includes(d.id) && d.owner !== to); if (!hit.length) return; const prev = { deals, log };
    setDeals(deals.map((d) => (hit.includes(d) ? { ...d, owner: to } : d))); setLog([...hit.map((d, i) => entry(i, { type: 'note', deal: d.id, verb: 'reassigned', text: `from ${d.owner} to ${to}.` })).reverse(), ...log]);
    say(hit.length === 1 ? `${hit[0]!.company} reassigned to ${to}` : `${hit.length} deals reassigned to ${to}`, () => { setDeals(prev.deals); setLog(prev.log); say('Change undone'); });
  };
  const addNote = (deal: string, text: string) => { setLog([entry(0, { type: 'note', deal, verb: 'noted on', text }), ...log]); setDeals(deals.map((d) => (d.id === deal ? { ...d, touch: 0 } : d))); setLive('Note added'); };
  const logAct: Ops['logAct'] = ({ type, deal, who, text, date }) => {
    const ago0 = dayDiff(TODAY_KEY, date); const ts = ago0 === 0 ? NOW_TS + log.length - SEED_LOG.length : T(Number(date.slice(8)), 12, 0);
    setLog([{ id: nextId(), ts, type, who, deal, verb: VERB[type as keyof typeof VERB], text }, ...log].sort((a, b) => b.ts - a.ts)); setDeals(deals.map((d) => (d.id === deal ? { ...d, touch: Math.min(d.touch, ago0) } : d)));
    say(`${type === 'note' ? 'Note' : type[0]!.toUpperCase() + type.slice(1)} logged on ${deals.find((d) => d.id === deal)?.company}`);
  };
  const saveCfg = (next: Cfg) => { const prev = cfg; setCfg(next); say('Settings saved. Every view now uses them.', () => { setCfg(prev); say('Settings restored'); }); };
  const ops: Ops = { deals, log, moveDeals, reassign, addNote, logAct, openDeal: (id) => setDrawer(id), announce,
    goAccount: (c) => { setInit((i) => ({ ...i, account: c })); go('accounts'); }, goActivity: (d) => { setInit((i) => ({ ...i, deal: d })); go('activity'); } };

  /* ---- pipeline view (the board): unchanged behaviour ---- */
  const move = (id: string, to: StageId, undo = false) => {
    const d = deals.find((x) => x.id === id); if (!d || d.stage === to) return;
    const next = [{ ...d, stage: to, touch: 0 }, ...deals.filter((x) => x.id !== id)]; setDeals(next);
    const col = next.filter((x) => match(x) && x.stage === to);
    setNote({ text: `${d.company} ${undo ? 'moved back' : 'moved'} from ${stageName(d.stage)} to ${stageName(to)}. ${stageName(to)} now has ${col.length} ${col.length === 1 ? 'deal' : 'deals'}, ${fm.m(sum(col))}.`, undo: undo ? undefined : { id, from: d.stage } });
    setLog([entry(0, { type: 'stage', deal: id, verb: undo ? 'moved back' : to === 'won' ? 'won' : 'moved', text: to === 'won' && !undo ? 'for $$.' : `from [[${d.stage}]] to [[${to}]].` }), ...log]);
  };
  const addDeal = () => {
    const p = INBOUND[added]; if (!p) return; const o = rep ?? REPS[added % REPS.length]!; setAdded(added + 1); const nd: Deal = { id: `x${added}`, ...p, owner: o.name, stage: 'lead', adj: 0, touch: 0 };
    setDeals([nd, ...deals]); setNote({ text: `${p.company} added to ${stageName('lead')}, owned by ${o.name}. ${stageName('lead')} now has ${shown.filter((x) => x.stage === 'lead').length + (match(nd) ? 1 : 0)} deals.` });
    setLog([entry(0, { type: 'stage', deal: nd.id, verb: 'added', text: 'as a new lead.', who: 'Dana Ortiz' }), ...log]);
  };
  const exportCsv = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv(shown, cfg.stages)], { type: 'text/csv' })); a.download = 'pipeline-q4-2026.csv'; a.click(); URL.revokeObjectURL(a.href); setNote({ text: `Exported ${shown.length} deals to CSV.` }); };
  const clear = () => { setOwner('all'); setQ(''); setMonth(false); };

  const rows: RepRow[] = REPS.map((r) => { const mine = deals.filter((d) => d.owner === r.name), s = summarize(mine, r.lost, cfg.stages); return { name: r.name, role: r.role, quota: cfg.quotas[r.name]!, won: s.wonV, open: s.pipeline, forecast: s.forecast }; }).sort((a, b) => b.won / b.quota - a.won / a.quota);
  const cols: Array<Col<RepRow>> = [
    { id: 'rep', label: 'Rep', cell: (r) => <button type="button" className={cx('ts-rep', owner === r.name && 'is-on')} aria-pressed={owner === r.name} title={owner === r.name ? 'Showing this rep. Click to show everyone' : 'Filter the board to this rep'} onClick={() => setOwner(owner === r.name ? 'all' : r.name)}><Avatar name={r.name} size={24} /><span><b>{r.name}</b><small>{r.role}</small></span></button>, sort: (a, b) => a.name.localeCompare(b.name) },
    { id: 'won', label: 'Closed won', align: 'right', cell: (r) => fm.m(r.won), sort: (a, b) => a.won - b.won },
    { id: 'open', label: 'Open pipeline', align: 'right', hideBelow: 'sm', cell: (r) => fm.m(r.open), sort: (a, b) => a.open - b.open },
    { id: 'fc', label: 'Forecast', align: 'right', hideBelow: 'md', cell: (r) => <>{fm.m(r.forecast)} <span className="td-muted">· {fmt.p(r.forecast / r.quota, 0)}</span></>, sort: (a, b) => a.forecast / a.quota - b.forecast / b.quota },
    { id: 'quota', label: 'Quota', align: 'right', hideBelow: 'md', cell: (r) => fm.m(r.quota), sort: (a, b) => a.quota - b.quota },
    { id: 'att', label: 'Quota attainment', w: '26%', cell: (r) => <div className="ts-att"><b>{fmt.p(r.won / r.quota, 0)}</b><Progress value={r.won / r.quota} tone={r.won / r.quota >= 0.5 ? 'primary' : 'signal'} label={`${r.name} quota attainment`} /></div>, sort: (a, b) => a.won / a.quota - b.won / b.quota },
  ];

  const nav = NAV.map((n) => (n.id === 'deals' ? { ...n, badge: deals.filter((d) => d.stage !== 'won').length } : n));
  const title = NAV.find((n) => n.id === active)!.label;
  const pipeline = (
    <>
      <ViewHead ref={head} title="Pipeline" sub={`Q4 2026 · 68 days left · amounts in ${cfg.cur}`}>
        <Button icon="file" onClick={exportCsv}>Export CSV</Button>
        <Button variant="primary" icon="plus" onClick={addDeal} disabled={added >= INBOUND.length}>{added >= INBOUND.length ? 'No new leads' : 'Add deal'}</Button>
      </ViewHead>
      <div className="td-kpis">
        <Kpi label="Open pipeline" value={fm.m(now.pipeline)} delta={chg(now.pipeline, base.pipeline, 0.9)} hint={`${now.openCount} open deals`} />
        <Kpi label="Weighted forecast" value={fm.m(now.weighted)} delta={chg(now.weighted, base.weighted, 0.94)} hint="open deals × win probability" tone="signal" />
        <Kpi label="Win rate" value={fmt.p(now.winRate, 0)} delta={chg(now.winRate, base.winRate, 0.96)} hint={`${now.wonCount} won, ${lost} lost this quarter`} />
        <Kpi label="Average deal size" value={now.wonCount ? fm.m(now.avg) : '—'} delta={now.wonCount ? chg(now.avg, base.avg, 0.88) : undefined} hint={now.wonCount ? `across ${now.wonCount} won deals` : 'no won deals in view'} tone="signal" />
        <div className="ts-target">
          <div className="ts-tt"><span className="td-kpi-l">Q4 forecast vs target{rep ? ` · ${rep.name}` : ''}</span><b>{fm.m(now.forecast)}</b><span className="td-muted">of {fm.m(quota)}</span><Pill tone={pct >= 1 ? 'ok' : pct >= 0.85 ? 'info' : 'warn'}>{fmt.p(pct, 0)}</Pill></div>
          <div className="ts-tbar"><Progress value={pct} tone={pct >= 1 ? 'ok' : 'primary'} label="Forecast against the quarterly target" /><i className="ts-won" style={{ width: `${Math.min(1, now.wonV / quota) * 100}%` }} aria-hidden="true" /></div>
          <div className="ts-tm"><span><i className="ts-key is-won" />Won {fm.m(now.wonV)}</span><span><i className="ts-key" />Weighted open {fm.m(now.weighted)}</span><span className={gap > 0 ? 'is-gap' : 'is-ahead'}>{gap > 0 ? `${fm.m(gap)} to find` : `${fm.m(-gap)} ahead`}</span></div>
        </div>
      </div>

      <div className="ts-bar">
        <div className="ts-filters" role="search" aria-label="Filter deals">
          <label className="ts-select"><span className="td-sr">Owner</span><Glyph name="users" size={14} /><select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="all">All owners</option>{REPS.map((r) => <option key={r.name}>{r.name}</option>)}</select><Glyph name="down" size={12} /></label>
          <label className="ts-search"><span className="td-sr">Search deals</span><Glyph name="search" size={14} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company or deal" /></label>
          <button type="button" className="ts-toggle" aria-pressed={month} onClick={() => setMonth(!month)}><Glyph name="calendar" size={14} />Closing this month</button>
          {filtered && <Button variant="ghost" small icon="x" onClick={clear}>Clear</Button>}
        </div>
        <p className="ts-count">{shown.length} of {deals.length} deals · {fm.m(now.pipeline)} open</p>
      </div>
      <div className="ts-boardwrap">
        {shown.length === 0 ? <Panel id="ts-e" className="ts-emptyp"><Empty title="No deals match" text="Try a different owner or search, or clear the filters." /><Button onClick={clear}>Clear filters</Button></Panel> : <Board deals={shown} onMove={move} />}
        <div className="ts-help"><span><kbd>Shift</kbd> + <kbd>←</kbd> <kbd>→</kbd> moves a deal · <kbd>Enter</kbd> opens the menu · drag between columns</span>
          <span className="ts-note" role="status" aria-live="polite">{note && <>{note.text}{note.undo && <button type="button" onClick={() => move(note.undo!.id, note.undo!.from, true)}>Undo</button>}</>}</span></div>
      </div>

      <div className="ts-row">
        <Panel id="ts-f" title="Forecast vs target" sub="Cumulative closed-won plus weighted open deals, by week of Q4" actions={<span className="ts-legend"><i />Committed<i className="is-t" />Target</span>}>
          <AreaChart ariaLabel={`Committed forecast against target by week, cumulative, in ${cfg.cur}`} labels={WEEK_LABELS} height={272} format={fm.k} tipFormat={fm.m}
            series={[{ id: 'c', label: 'Committed', data: weeks.committed }, { id: 't', label: 'Target', data: weeks.target, color: 'color-mix(in srgb, var(--ink, #15130e) 42%, transparent)' }]} />
          <p className="ts-chartnote"><b>Today · week ending {WEEK_LABELS[TODAY_WEEK]}</b><span>Won so far {fm.m(now.wonV)}</span><span>Projected {fm.m(weeks.committed[weeks.committed.length - 1]!)} by Dec 31</span><span className={gap > 0 ? 'is-gap' : 'is-ahead'}>{gap > 0 ? `${fm.m(gap)} short of target` : 'Target covered'}</span></p>
        </Panel>
        <Panel id="ts-a" title="Recent activity" sub="Across the team" actions={<Button small variant="ghost" onClick={() => go('activity')}>View all</Button>}>
          <ol className="ts-feed">{log.slice(0, 6).map((e) => { const d = deals.find((x) => x.id === e.deal); return <li key={e.id} className={e.ts >= NOW_TS ? 'is-new' : undefined}><Avatar name={e.who} size={24} /><p><b>{e.who}</b> {e.verb} <b>{d?.company}</b> {fill(e.text, cfg, fm, d)}</p><time>{ago(e.ts)}</time></li>; })}</ol>
        </Panel>
      </div>
      <Panel id="ts-l" className="ts-lb" title="Leaderboard" sub="Quota attainment is closed-won against Q4 quota. Click a rep to filter the board." flush>
        <Table caption="Rep leaderboard, sortable" cols={cols} rows={rows} rowKey={(r) => r.name} selected={owner} />
      </Panel>
    </>
  );

  return (
    <CfgCtx.Provider value={ctx}>
      <Shell brand={brand} nav={nav} active={active} onNav={go} title={title} crumbs={[brand, 'Sales', title]} searchHint="Search deals">
        <div ref={root} className="tv-root" data-view={active}>
          {active === 'pipeline' && pipeline}
          {active === 'deals' && <DealsView ops={ops} headRef={head} />}
          {active === 'accounts' && <AccountsView key={init.account} ops={ops} headRef={head} initial={init.account} />}
          {active === 'activity' && <ActivityView key={init.deal} ops={ops} headRef={head} initDeal={init.deal} />}
          {active === 'reports' && <ReportsView deals={deals} headRef={head} initTab={init.tab} announce={announce} />}
          {active === 'settings' && <SettingsView headRef={head} onSave={saveCfg} announce={announce} />}
        </div>
        {drawer && <DealDrawer id={drawer} ops={ops} onClose={() => setDrawer(null)} />}
        <Toast toast={toast} onUndo={() => { undoRef.current?.(); }} onClose={() => setToast(null)} />
        <div className="td-sr" role="status" aria-live="polite">{live}</div>
      </Shell>
    </CfgCtx.Provider>
  );
}

export function Demo() { return <Preview w={1280} h={150}><SalesDashboard /></Preview>; }
