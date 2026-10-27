'use client';
// The Insights view: month-over-month spend by category, top merchants, detected subscriptions with cancel reminders,
// unusual-spend alerts and the savings goals.
import { useMemo, useState } from 'react';
import { BarChart, Button, Delta, Glyph, PageHeader, Panel, Pill, PALETTE, Segmented, Table, cx, type Col } from './_dash';
import { MONTHS, TODAY, dShort, money, moneyWhole, type Tx } from './_fin';
import { catByMonth, merchants, spendDays, SPEND_CATS, type Alert, type Merchant, type Sub } from './_fin-more';
import { Modal, SelectField } from './_fin-kit';
import { GoalsPanel, type GoalProps } from './_fin-goals';

const OTHER = 'color-mix(in srgb, var(--ink, #15130e) 24%, transparent)';
export interface InsProps { txs: Tx[]; subs: Sub[]; alerts: Alert[]; dismissed: number; onDismiss: (id: string) => void; onRestore: () => void; reminders: Record<string, number>; onRemind: (name: string, days: number | null) => void; onReview: (a: { q?: string; cat?: string }) => void; onMerchant: (name: string) => void; onBills: () => void; goals: GoalProps }

export function InsightsView(p: InsProps) {
  const { txs, subs } = p;
  const [k, setK] = useState<'6' | '8'>('8'); const [hide, setHide] = useState<string[]>([]); const [per, setPer] = useState<'1' | '3' | '8'>('3'); const [kind, setKind] = useState<'all' | 'Subscription' | 'Bill'>('all'); const [rem, setRem] = useState<Sub | null>(null);
  const by = useMemo(() => catByMonth(txs), [txs]);
  const ranked = useMemo(() => SPEND_CATS.map((c) => ({ c, tot: (by.get(c) ?? Array(8).fill(0)).reduce((a, b) => a + b, 0) })).sort((a, b) => b.tot - a.tot).map((x) => x.c), [by]);
  const groups = [...ranked.slice(0, 5).map((c, i) => ({ id: c, label: c, cats: [c], color: PALETTE[i]! })), { id: 'Other', label: 'Other', cats: ranked.slice(5), color: OTHER }];
  const n = +k, labels = MONTHS.slice(8 - n).map((m, i, a) => (i === a.length - 1 ? `${m} MTD` : m));
  const monthly = (cats: string[]) => Array.from({ length: n }, (_, i) => cats.reduce((a, c) => a + (by.get(c)?.[8 - n + i] ?? 0), 0));
  const shown = groups.filter((g) => !hide.includes(g.id));
  const oct = spendDays(txs, 10, 24), sep = spendDays(txs, 9, 24);
  const row = (cats: string[]) => ({ now: cats.reduce((a, c) => a + (oct.get(c) ?? 0), 0), was: cats.reduce((a, c) => a + (sep.get(c) ?? 0), 0) });
  const totNow = [...oct.values()].reduce((a, b) => a + b, 0), totWas = [...sep.values()].reduce((a, b) => a + b, 0);
  const top = merchants(txs, +per), topTotal = top.reduce((a, m) => a + m.total, 0), top8 = top.slice(0, 8);
  const liveSubs = subs.filter((s) => kind === 'all' || s.kind === kind);
  const mcols: Array<Col<Merchant>> = [
    { id: 'm', label: 'Merchant', sort: (a, b) => a.name.localeCompare(b.name), cell: (m) => <div className="tf-mname"><button type="button" onClick={() => p.onMerchant(m.name)} aria-label={`${m.name}, show transactions`}>{m.name}</button><small>{m.cat}</small></div> },
    { id: 'n', label: 'Charges', align: 'right', hideBelow: 'sm', sort: (a, b) => a.n - b.n, cell: (m) => m.n },
    { id: 'l', label: 'Last', hideBelow: 'md', sort: (a, b) => a.last.localeCompare(b.last), cell: (m) => <span className="td-muted">{dShort(m.last)}</span> },
    { id: 't', label: 'Spend', align: 'right', sort: (a, b) => a.total - b.total, cell: (m) => <span className="tf-mbar"><i style={{ width: `${(m.total / top8[0]!.total) * 100}%` }} /><b>{moneyWhole(m.total)}</b></span> },
  ];
  return (
    <div className="tf-wrap tf-iv">
      <PageHeader title="Insights" sub={`Posted activity through ${dShort(TODAY)}, 2026`}><Button icon="trend" onClick={p.onBills}>Review bills</Button></PageHeader>
      <div className="tf-ig1">
        <Panel id="tf-sc" title="Spend by category" sub={`Money out per month, ${MONTHS[8 - n]} to ${MONTHS[7]} · October is month to date`} actions={<Segmented label="Months shown" value={k} onChange={setK} options={[{ id: '6', label: '6 mo' }, { id: '8', label: '8 mo' }]} />}>
          <div className="tf-net"><div><small>October, 1–24</small><b>{moneyWhole(totNow)}</b></div><div><small>September, 1–24</small><b>{moneyWhole(totWas)}</b></div><div><small>Change</small><b><Delta value={totWas ? ((totNow - totWas) / totWas) * 100 : 0} good="down" /></b></div></div>
          <BarChart stacked ariaLabel={`Spend by category per month, ${MONTHS[8 - n]} to ${MONTHS[7]}`} labels={labels} height={220} format={(v) => `$${v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v)}`} series={shown.map((g) => ({ id: g.id, label: g.label, color: g.color, data: monthly(g.cats).map((v) => Math.round(v / 100)) }))} />
          <table className="tf-cmp"><caption className="td-sr">Spend by category, October 1 to 24 against September 1 to 24. Select a row to show or hide it in the chart.</caption>
            <thead><tr><th scope="col">Category</th><th scope="col" className="is-r">Oct 1–24</th><th scope="col" className="is-r hide-sm">Sep 1–24</th><th scope="col" className="is-r">Change</th></tr></thead>
            <tbody>{groups.map((g) => { const r = row(g.cats), off = hide.includes(g.id), d = r.was ? ((r.now - r.was) / r.was) * 100 : null; return (
              <tr key={g.id} className={cx(off && 'is-off')}>
                <th scope="row"><button type="button" aria-pressed={!off} onClick={() => setHide((h) => (off ? h.filter((x) => x !== g.id) : [...h, g.id]))} aria-label={`${g.label}, ${off ? 'hidden' : 'shown'} in the chart`}><i style={{ background: g.color }} />{g.label}</button></th>
                <td className="is-r">{moneyWhole(r.now)}</td><td className="is-r hide-sm td-muted">{moneyWhole(r.was)}</td><td className="is-r">{d === null ? <span className="td-muted">new</span> : <Delta value={d} good="down" />}</td>
              </tr>); })}</tbody>
          </table>
        </Panel>

        <Panel id="tf-al" title="Unusual spend" sub={p.alerts.length ? `${p.alerts.length} to look at` : 'Nothing needs attention'} actions={p.dismissed > 0 && <Button small variant="ghost" onClick={p.onRestore}>Restore {p.dismissed}</Button>}>
          {p.alerts.length === 0 ? <div className="td-empty"><Glyph name="check" size={22} /><b>All quiet</b><p>No new merchants, price changes or spikes right now.</p></div> : (
            <ul className="tf-alerts">{p.alerts.map((a) => (
              <li key={a.id} className={`is-${a.tone}`}>
                <span className="tf-al-dot" aria-hidden="true" />
                <div><b>{a.title}</b><p>{a.detail}</p><div className="tf-al-a"><Button small onClick={() => p.onReview({ q: a.q, cat: a.cat })}>Review transactions</Button><Button small variant="ghost" onClick={() => p.onDismiss(a.id)} label={`Dismiss: ${a.title}`}>Dismiss</Button></div></div>
              </li>))}</ul>
          )}
        </Panel>
      </div>

      <div className="tf-ig2">
        <Panel id="tf-mer" title="Top merchants" sub={`${top8.length} of ${top.length} · ${moneyWhole(top8.reduce((a, m) => a + m.total, 0))} of ${moneyWhole(topTotal)} spent`} actions={<Segmented label="Period" value={per} onChange={setPer} options={[{ id: '1', label: 'Oct' }, { id: '3', label: '3 mo' }, { id: '8', label: '8 mo' }]} />}>
          <Table cols={mcols} rows={top8} rowKey={(m) => m.name} caption="Top merchants by spend. Select a name to open its transactions." />
        </Panel>
        <Panel id="tf-sub" title="Recurring charges" sub={`${liveSubs.length} detected · ${moneyWhole(liveSubs.reduce((a, s) => a + s.last, 0))} a month`} actions={<Segmented label="Kind" value={kind} onChange={setKind} options={[{ id: 'all', label: 'All' }, { id: 'Subscription', label: 'Software' }, { id: 'Bill', label: 'Bills' }]} />}>
          <ul className="tf-subs">{liveSubs.map((s) => { const r = p.reminders[s.name]; return (
            <li key={s.name}>
              <span className="tf-sn"><b>{s.name}</b><small>{s.kind === 'Subscription' ? 'Subscription' : s.cat} · monthly · next {dShort(s.next)}</small></span>
              <span className="tf-sa">{s.change > 0 && <Pill tone="warn" dot={false}>+{Math.round(s.change * 100)}%</Pill>}<b>{money(s.last)}</b></span>
              {s.kind === 'Subscription' ? <Button small variant={r ? 'default' : 'ghost'} icon="bell" onClick={() => setRem(s)} label={r ? `Edit the cancel reminder for ${s.name}` : `Remind me to cancel ${s.name}`}>{r ? `Remind ${dShort(shiftDay(s.next, -r))}` : 'Remind me'}</Button> : <Button small variant="ghost" onClick={p.onBills} label={`Manage ${s.name} in Bills`}>Bills</Button>}
            </li>); })}</ul>
        </Panel>
      </div>
      <GoalsPanel {...p.goals} />
      {rem && <ReminderDialog sub={rem} days={p.reminders[rem.name]} onClose={() => setRem(null)} onSave={(d) => { p.onRemind(rem.name, d); setRem(null); }} />}
    </div>
  );
}
const shiftDay = (iso: string, d: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + d * 864e5).toISOString().slice(0, 10);

function ReminderDialog({ sub, days, onClose, onSave }: { sub: Sub; days?: number; onClose: () => void; onSave: (d: number | null) => void }) {
  const [d, setD] = useState(String(days ?? 7));
  return (
    <Modal id="tf-rm" title={`Cancel reminder for ${sub.name}`} onClose={onClose}>
      <form className="tf-mod-f" onSubmit={(e) => { e.preventDefault(); onSave(+d); }}>
        <p className="tf-bsum"><span>{sub.name}</span><b>{money(sub.last)}</b><small>Renews {dShort(sub.next)}. {money(sub.last * 12)} a year.</small></p>
        <SelectField id="tf-rmd" label="Remind me" value={d} onChange={setD} options={[['3', '3 days before it renews'], ['7', '7 days before it renews'], ['14', '14 days before it renews']]} hint={`You will get a reminder on ${dShort(shiftDay(sub.next, -+d))}.`} />
        <div className="tf-dlg-a">{days !== undefined && <Button variant="ghost" onClick={() => onSave(null)}>Remove reminder</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" type="submit">{days !== undefined ? 'Update reminder' : 'Set reminder'}</Button></div>
      </form>
    </Modal>
  );
}
