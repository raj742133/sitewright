'use client';
// The Bills view: upcoming, scheduled and paid bills, a month calendar, and pay now / schedule / autopay with confirmations.
import { useMemo, useState } from 'react';
import { Button, Glyph, PageHeader, Pill, Tabs, cx } from './_dash';
import { ACCTS, OUT_CATS, TODAY, addDays, dShort, dayDiff, dueLabel, money, moneyWhole, type Bill } from './_fin';
import { MONTH_NAMES, billStatus, monthGrid } from './_fin-more';
import { Modal, SearchBox, SelectBox, SelectField, Switch, TextField, parseCents } from './_fin-kit';

export interface BillActions { pay: (b: Bill, acct: string) => void; schedule: (id: string, date: string, acct: string) => void; unschedule: (id: string) => void; auto: (id: string, on: boolean, acct: string) => void; add: (b: Omit<Bill, 'id'>) => void }
type Dlg = { kind: 'pay' | 'schedule' | 'auto'; bill: Bill } | { kind: 'new' } | null;
type TabId = 'up' | 'sched' | 'paid' | 'all';

export function BillsView({ bills, hist, bal, act, onOpenTx }: { bills: Bill[]; hist: Bill[]; bal: Record<string, number>; act: BillActions; onOpenTx: (id: string) => void }) {
  const [tab, setTab] = useState<TabId>('up'); const [q, setQ] = useState(''); const [sort, setSort] = useState('due'); const [day, setDay] = useState<string | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null); const [ym, setYm] = useState<[number, number]>([2026, 10]);
  const all = useMemo(() => [...bills, ...hist], [bills, hist]);
  const open = bills.filter((b) => !b.paid), planned = open.filter((b) => b.auto || b.sched);
  const sumOf = (l: Bill[]) => l.reduce((a, b) => a + b.amt, 0);
  const week = open.filter((b) => dayDiff(b.due, TODAY) <= 7), month = open.filter((b) => b.due.startsWith('2026-10'));
  const projected = bal.ops! - sumOf(planned.filter((b) => (b.acct ?? 'ops') === 'ops'));
  const counts = { up: open.length, sched: planned.length, paid: all.filter((b) => b.paid).length, all: all.length };
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const l = all.filter((b) => (tab === 'all' || (tab === 'up' ? !b.paid : tab === 'paid' ? !!b.paid : !b.paid && (b.auto || b.sched))) && (!day || b.due === day || b.paid === day) && (!s || `${b.name} ${b.cat} ${money(b.amt)}`.toLowerCase().includes(s)));
    const dir = tab === 'paid' ? -1 : 1;
    return l.sort((a, b) => (sort === 'amt' ? b.amt - a.amt : sort === 'name' ? a.name.localeCompare(b.name) : dir * a.due.localeCompare(b.due)) || a.id.localeCompare(b.id));
  }, [all, tab, q, sort, day]);
  const by = useMemo(() => { const m = new Map<string, Bill[]>(); for (const b of all) { const k = b.paid ?? b.due; m.set(k, [...(m.get(k) ?? []), b]); } return m; }, [all]);
  const weeks = monthGrid(ym[0], ym[1]);
  const shift = (d: number) => setYm(([y, m]) => { const n = m + d; return n < 1 ? [y - 1, 12] : n > 12 ? [y + 1, 1] : [y, n]; });
  const status = (b: Bill) => { const s = billStatus(b); return s === 'paid' ? <Pill tone="ok">Paid {dShort(b.paid!)}</Pill> : s === 'auto' ? <Pill tone="info">Autopay {dShort(b.due)}</Pill> : s === 'sched' ? <Pill tone="info">Scheduled {dShort(b.sched!)}</Pill> : <Pill tone={dayDiff(b.due, TODAY) <= 3 ? 'warn' : 'neutral'}>{dueLabel(b.due)}</Pill>; };

  return (
    <div className="tf-wrap tf-bv">
      <PageHeader title="Bills" sub={`${open.length} upcoming · ${money(sumOf(open))} due · Operating has ${money(bal.ops!)}`}><Button variant="primary" icon="plus" onClick={() => setDlg({ kind: 'new' })}>Add bill</Button></PageHeader>
      <div className="tf-stats" role="group" aria-label="Bills summary">
        <div><small>Due in the next 7 days</small><b>{moneyWhole(sumOf(week))}</b><span>{week.length} {week.length === 1 ? 'bill' : 'bills'}</span></div>
        <div><small>Due in October</small><b>{moneyWhole(sumOf(month))}</b><span>{month.length} still open</span></div>
        <div><small>Scheduled and autopay</small><b>{moneyWhole(sumOf(planned))}</b><span>{planned.length} set to pay by themselves</span></div>
        <div><small>Operating after those</small><b className={projected < 0 ? 'is-out' : undefined}>{moneyWhole(projected)}</b><span>now {moneyWhole(bal.ops!)}</span></div>
      </div>
      <div className="tf-bgrid">
        <section className="td-panel tf-blist" aria-label="Bills">
          <Tabs label="Bill status" value={tab} onChange={setTab} tabs={[{ id: 'up', label: 'Upcoming', count: counts.up }, { id: 'sched', label: 'Scheduled', count: counts.sched }, { id: 'paid', label: 'Paid', count: counts.paid }, { id: 'all', label: 'All', count: counts.all }]} />
          <div className="tf-bar">
            <SearchBox value={q} onChange={setQ} placeholder="Search bills" label="Search bills" />
            <SelectBox label="Sort bills" value={sort} onChange={setSort} options={[['due', 'Sort: due date'], ['amt', 'Sort: amount'], ['name', 'Sort: name']]} />
            {day && <button type="button" className="tf-chip" onClick={() => setDay(null)} aria-label={`Remove date filter ${dShort(day)}`}>{dShort(day)}<Glyph name="x" size={11} /></button>}
          </div>
          {rows.length === 0 ? <div className="td-empty"><Glyph name="calendar" size={22} /><b>{tab === 'sched' ? 'Nothing scheduled' : 'No bills here'}</b><p>{tab === 'sched' ? 'Schedule a payment or turn on autopay from the Upcoming tab.' : 'Try another tab or clear the search.'}</p></div> : (
            <ul className="tf-bl">
              {rows.map((b) => { const st = billStatus(b), low = !b.paid && b.amt > bal.ops!; return (
                <li key={b.id} className={cx(b.paid && 'is-paid')}>
                  <span className="tf-bm" aria-hidden="true"><b>{dShort(b.paid ?? b.due).split(' ')[1]}</b>{dShort(b.paid ?? b.due).split(' ')[0]}</span>
                  <span className="tf-bn"><b>{b.name}</b><small>{b.cat} · {b.paid ? 'paid' : `due ${dShort(b.due)}`}{low ? ' · not enough in Operating' : ''}</small></span>
                  <span className="tf-ba">{money(b.amt)}</span>
                  <span className="tf-bs">{status(b)}</span>
                  <span className="tf-bx">
                    {b.paid ? <Button small variant="ghost" onClick={() => onOpenTx(b.tx!)} label={`View payment for ${b.name}`}>View</Button> : <>
                      <label className="tf-auto"><span>Autopay</span><Switch on={!!b.auto} label={`Autopay for ${b.name}`} onChange={(on) => (on ? setDlg({ kind: 'auto', bill: b }) : act.auto(b.id, false, b.acct ?? 'ops'))} /></label>
                      {st === 'sched' ? <Button small onClick={() => act.unschedule(b.id)} label={`Cancel the scheduled payment of ${b.name}`}>Cancel</Button> : <Button small disabled={!!b.auto} onClick={() => setDlg({ kind: 'schedule', bill: b })} label={`Schedule ${b.name}`}>Schedule</Button>}
                      <Button small variant="primary" onClick={() => setDlg({ kind: 'pay', bill: b })} label={`Pay ${b.name} now, ${money(b.amt)}`}>Pay now</Button>
                    </>}
                  </span>
                </li>
              ); })}
            </ul>
          )}
        </section>

        <section className="td-panel tf-cal" aria-label="Bill calendar">
          <header className="td-panel-h"><div><h2>{MONTH_NAMES[ym[1] - 1]} {ym[0]}</h2><p>Select a day to filter the list</p></div><div className="td-panel-a"><Button small variant="ghost" icon="chevron" label="Previous month" onClick={() => shift(-1)} /><Button small variant="ghost" icon="chevron" label="Next month" onClick={() => shift(1)} /></div></header>
          <div className="tf-cal-b" role="grid" aria-label={`${MONTH_NAMES[ym[1] - 1]} ${ym[0]}`}>
            <div role="row" className="tf-cal-w">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d} role="columnheader">{d}</span>)}</div>
            {weeks.map((w, i) => <div role="row" className="tf-cal-r" key={i}>{w.map((d) => {
              const l = by.get(d) ?? [], out = +d.slice(5, 7) !== ym[1], tot = sumOf(l);
              return <button key={d} type="button" role="gridcell" disabled={!l.length} aria-pressed={day === d} aria-label={`${dShort(d)}${l.length ? `, ${l.length} ${l.length === 1 ? 'bill' : 'bills'}, ${money(tot)}` : ', no bills'}`} className={cx('tf-cd', out && 'is-out', d === TODAY && 'is-today', l.length > 0 && 'has')} onClick={() => setDay(day === d ? null : d)}>
                <i>{+d.slice(8, 10)}</i>
                {l.length > 0 && <span className="tf-cd-m">{tot >= 100000 ? `$${(tot / 100000).toFixed(1).replace(/\.0$/, '')}k` : moneyWhole(tot)}</span>}
                {l.length > 0 && <span className="tf-cd-d" aria-hidden="true">{l.slice(0, 3).map((b) => <u key={b.id} className={cx(b.paid ? 'is-paid' : b.auto || b.sched ? 'is-plan' : 'is-open')} />)}</span>}
              </button>; })}</div>)}
          </div>
          <p className="tf-cal-k"><span><u className="is-open" />Open</span><span><u className="is-plan" />Scheduled or autopay</span><span><u className="is-paid" />Paid</span></p>
        </section>
      </div>
      {dlg && <BillDialog dlg={dlg} bal={bal} onClose={() => setDlg(null)} act={act} />}
    </div>
  );
}

function BillDialog({ dlg, bal, onClose, act }: { dlg: NonNullable<Dlg>; bal: Record<string, number>; onClose: () => void; act: BillActions }) {
  const b = dlg.kind === 'new' ? null : dlg.bill;
  const [acct, setAcct] = useState(b?.acct ?? 'ops'); const [date, setDate] = useState(b?.sched ?? (b ? (b.due > TODAY ? addDays(b.due, -1) : TODAY) : ''));
  const [name, setName] = useState(''); const [amt, setAmt] = useState(''); const [due, setDue] = useState(''); const [cat, setCat] = useState('Software'); const [err, setErr] = useState<Record<string, string>>({});
  const opts = ACCTS.map((a) => [a.id, `${a.name} ••${a.mask} · ${money(bal[a.id] ?? 0)}`] as [string, string]);
  const cents = dlg.kind === 'new' ? parseCents(amt) : b!.amt;
  const submit = () => {
    const e: Record<string, string> = {};
    if (dlg.kind === 'new') { if (!name.trim()) e.name = 'Enter who the bill is from.'; if (!(cents > 0)) e.amt = 'Enter an amount greater than $0.00.'; if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || due < TODAY) e.due = 'Choose a due date from today on.'; }
    if (dlg.kind === 'schedule' && (!date || date < TODAY || date > b!.due)) e.date = `Choose a day between ${dShort(TODAY)} and ${dShort(b!.due)}.`;
    if (dlg.kind === 'pay' && cents > (bal[acct] ?? 0)) e.acct = `${ACCTS.find((a) => a.id === acct)!.name} has ${money(bal[acct] ?? 0)}. Pick another account or add funds.`;
    setErr(e); if (Object.keys(e).length) return;
    if (dlg.kind === 'pay') act.pay(b!, acct); else if (dlg.kind === 'schedule') act.schedule(b!.id, date, acct); else if (dlg.kind === 'auto') act.auto(b!.id, true, acct); else act.add({ name: name.trim(), amt: cents, due, cat, acct });
    onClose();
  };
  const after = (bal[acct] ?? 0) - (b?.amt ?? 0);
  const title = { pay: `Pay ${b?.name}`, schedule: `Schedule ${b?.name}`, auto: `Turn on autopay for ${b?.name}`, new: 'Add a bill' }[dlg.kind];
  return (
    <Modal id="tf-bd" title={title} onClose={onClose}>
      <form className="tf-mod-f" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {dlg.kind === 'new' && <><TextField id="tf-bn" label="From" value={name} onChange={setName} error={err.name} placeholder="Vendor name" /><TextField id="tf-bam" label="Amount (USD)" value={amt} onChange={setAmt} error={err.amt} inputMode="decimal" placeholder="0.00" /><TextField id="tf-bdue" label="Due date" type="date" value={due} min={TODAY} onChange={setDue} error={err.due} /><SelectField id="tf-bcat" label="Category" value={cat} onChange={setCat} options={OUT_CATS.map((c) => [c, c])} /></>}
        {b && <p className="tf-bsum"><span>{b.name}</span><b>{money(b.amt)}</b><small>Due {dShort(b.due)} · {b.cat}</small></p>}
        {dlg.kind === 'schedule' && <TextField id="tf-bsd" label="Pay on" type="date" value={date} min={TODAY} max={b!.due} onChange={setDate} error={err.date} hint="Money leaves the account that morning." />}
        <SelectField id="tf-bacct" label={dlg.kind === 'new' ? 'Usually paid from' : 'Pay from'} value={acct} onChange={setAcct} options={opts} error={err.acct} />
        {dlg.kind === 'pay' && <p className="tf-hint">{ACCTS.find((a) => a.id === acct)!.name} goes from {money(bal[acct] ?? 0)} to <b className={after < 0 ? 'is-out' : undefined}>{money(after)}</b>. The payment shows in Transactions right away.</p>}
        {dlg.kind === 'schedule' && <p className="tf-hint">Scheduling replaces autopay for this bill. You can cancel until the morning it pays.</p>}
        {dlg.kind === 'auto' && <p className="tf-hint">Tarn pays {money(b!.amt)} from the chosen account on {dShort(b!.due)}, and on every due date after it. Turning autopay on replaces a scheduled payment. Turn it off any time.</p>}
        <div className="tf-dlg-a"><Button onClick={onClose}>Cancel</Button><Button variant="primary" type="submit">{{ pay: `Pay ${money(b?.amt ?? 0)}`, schedule: 'Schedule payment', auto: 'Turn on autopay', new: 'Add bill' }[dlg.kind]}</Button></div>
      </form>
    </Modal>
  );
}
