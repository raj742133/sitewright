'use client';
import { useMemo, useState } from 'react';
import { AreaChart, Button, Delta, Empty, Glyph, Kpi, Panel, Pill, Sparkline, cx, fmt } from './_dash';
import { getSite, sum } from './_an-data';
import { TYPE_LABEL, goalStats, type Goal, type GoalStat } from './_an-goals-data';
import { Head, RangeSeg, type ViewProps } from './_an-ui';
import GoalForm from './_an-goal-form';

function Card({ s, on, onPick, onEdit, onDelete }: { s: GoalStat; on: boolean; onPick: () => void; onEdit: () => void; onDelete: () => void }) {
  const g = s.goal; const fill = Math.min(1, s.rate / (g.targetRate * 1.25));
  return (
    <article className={cx('ta-goal', on && 'is-on')}>
      <button type="button" className="ta-goal-main" aria-pressed={on} onClick={onPick} aria-label={`${g.name}: ${fmt.p(s.rate, 1)} conversion rate. Show funnel`}>
        <span className="ta-goal-top"><b>{g.name}</b><Pill tone={s.onTarget ? 'ok' : 'warn'}>{s.onTarget ? 'On target' : 'Below target'}</Pill></span>
        <span className="ta-goal-sub"><span>{TYPE_LABEL[g.type]}</span><code className="td-mono">{g.target}</code></span>
        <span className="ta-goal-v"><strong>{fmt.p(s.rate, 2)}</strong><Delta value={s.delta} /><Sparkline data={s.daily} tone={s.onTarget ? 'signal' : 'primary'} width={84} height={26} /></span>
        <span className="ta-meter" aria-hidden="true"><i style={{ width: `${fill * 100}%` }} className={s.onTarget ? 'is-ok' : undefined} /><u style={{ left: `${(1 / 1.25) * 100}%` }} /></span>
        <span className="ta-goal-sub"><span>{fmt.n(s.conversions)} conversions{g.value ? ` · ${fmt.c(s.revenue)}` : ''}</span><span>target {fmt.p(g.targetRate, 1)}</span></span>
      </button>
      <div className="ta-goal-a"><Button small variant="ghost" icon="settings" onClick={onEdit} label={`Edit ${g.name}`}>Edit</Button><Button small variant="ghost" icon="x" onClick={onDelete} label={`Delete ${g.name}`}>Delete</Button></div>
    </article>
  );
}

function Funnel({ s }: { s: GoalStat }) {
  return (
    <ol className="ta-funnel" aria-label={`Conversion funnel for ${s.goal.name}`}>
      {s.funnel.map((f, k) => { const prev = s.funnel[k - 1]; const drop = prev ? 1 - f.count / prev.count : 0; return (
        <li key={f.label}>
          <div className="ta-fn-h"><span>{k + 1}</span><b>{f.label}</b><em>{fmt.n(f.count)}</em><small>{fmt.p(f.frac, f.frac < 0.1 ? 1 : 0)}</small></div>
          <div className="ta-fn-bar" aria-hidden="true"><i style={{ width: `${Math.max(f.frac * 100, 1.5)}%` }} /></div>
          {prev && <p className="ta-fn-d"><Glyph name="arrowdown" size={11} />{fmt.p(drop, 0)} drop-off from the previous step</p>}
        </li>); })}
    </ol>
  );
}

export default function GoalsView({ range, setRange, focus, notify, goals, setGoals }: ViewProps & { goals: Goal[]; setGoals: (f: (g: Goal[]) => Goal[]) => void }) {
  const site = getSite(range); const stats = useMemo(() => goalStats(goals, range), [goals, range]);
  const [selId, setSelId] = useState('trial'); const [form, setForm] = useState<{ goal?: Goal } | null>(null);
  const sel = stats.find((s) => s.goal.id === selId) ?? stats[0];
  const total = sum(stats.map((s) => s.conversions)), revenue = sum(stats.map((s) => s.revenue)), onT = stats.filter((s) => s.onTarget).length;
  const save = (g: Goal) => {
    const exists = goals.some((x) => x.id === g.id); setGoals((l) => (exists ? l.map((x) => (x.id === g.id ? g : x)) : [...l, g])); setSelId(g.id); setForm(null);
    notify(exists ? `Saved “${g.name}”.` : `Added goal “${g.name}”.`);
  };
  const remove = (g: Goal) => { const i = goals.findIndex((x) => x.id === g.id); setGoals((l) => l.filter((x) => x.id !== g.id)); notify(`Deleted “${g.name}”.`, () => setGoals((l) => [...l.slice(0, i), g, ...l.slice(i)])); };
  return (
    <>
      <Head title="Goals" sub={`Conversions on fieldnote.dev · last ${site.n} days · ${onT} of ${goals.length} on target`} focus={focus}>
        <RangeSeg value={range} onChange={setRange} /><Button variant="primary" icon="plus" onClick={() => setForm({})}>Add goal</Button>
      </Head>
      <div className="td-kpis">
        <Kpi label="Conversions" value={fmt.n(total)} hint={`across ${goals.length} goals`} />
        <Kpi label="Visitors" value={fmt.k(site.visitors)} hint="the base for every rate" tone="signal" />
        <Kpi label="Goal value" value={fmt.c(revenue)} hint="conversions × value" />
        <Kpi label="On target" value={`${onT} / ${goals.length}`} hint={goals.length - onT ? `${goals.length - onT} below target` : 'all goals met'} tone="signal" />
      </div>
      {goals.length === 0 ? <Panel id="tg-e"><Empty title="No goals yet" text="Add a goal to track conversions and see its funnel." /><div className="ta-center"><Button variant="primary" icon="plus" onClick={() => setForm({})}>Add goal</Button></div></Panel> : (
        <div className="ta-split2 is-goals">
          <div className="ta-goals" role="list" aria-label="Goals">{stats.map((s) => <div role="listitem" key={s.goal.id}><Card s={s} on={s.goal.id === sel?.goal.id} onPick={() => setSelId(s.goal.id)} onEdit={() => setForm({ goal: s.goal })} onDelete={() => remove(s.goal)} /></div>)}</div>
          {sel && (
            <div className="ta-sticky">
              <Panel id="tg-f" title={`${sel.goal.name} funnel`} sub={`${fmt.p(sel.rate, 2)} of ${fmt.n(site.visitors)} visitors converted`}><Funnel s={sel} /></Panel>
              <Panel id="tg-c" title="Conversions per day" sub={`${fmt.n(sel.conversions)} in total`}><AreaChart ariaLabel={`Conversions per day for ${sel.goal.name}`} labels={site.labels} height={150} series={[{ id: 'c', label: 'Conversions', data: sel.daily }]} /></Panel>
            </div>
          )}
        </div>
      )}
      {form && <GoalForm goal={form.goal} goals={goals} onSave={save} onClose={() => setForm(null)} />}
    </>
  );
}
