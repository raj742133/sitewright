'use client';
// Finance: one screen, five views (Overview, Accounts, Transactions, Bills, Insights) over one set of transactions, bills and goals.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Preview, Shell, useWidth, type NavEntry } from './_dash';
import { ACCTS, IN_CATS, OUT_CATS, SEED, TODAY, acctOf, balances, dShort, money, type Bill, type Tx } from './_fin';
import { GOALS, alerts as findAlerts, detectSubs, paidHistory, type Goal } from './_fin-more';
import { ActionDialog, type Draft, type Mode } from './_fin-ui';
import { Toast, csvCell, download } from './_fin-kit';
import { OverviewView } from './_fin-over';
import { TX_UI0, TransactionsView, type TxUi } from './_fin-tx';
import { AccountsView } from './_fin-acct';
import { BillsView } from './_fin-bills';
import { InsightsView } from './_fin-ins';

const VIEWS = { overview: 'Overview', accounts: 'Accounts', tx: 'Transactions', bills: 'Bills', insights: 'Insights' } as const;
type ViewId = keyof typeof VIEWS;
const isView = (v: string | null): v is ViewId => !!v && v in VIEWS;
interface Toasted { m: string; undo?: () => void; k: number }

export default function FinanceDashboard({ brand = 'Tarn' }: { brand?: string }) {
  const [txs, setTxs] = useState<Tx[]>(SEED.txs); const [bills, setBills] = useState<Bill[]>(SEED.bills); const [goals, setGoals] = useState<Goal[]>(GOALS);
  const [dismissed, setDismissed] = useState<string[]>([]); const [reminders, setReminders] = useState<Record<string, number>>({});
  const [active, setActive] = useState<ViewId>('overview'); const [ui, setUiState] = useState<TxUi>(TX_UI0); const [acctSel, setAcctSel] = useState('ops');
  const [dlg, setDlg] = useState<{ mode: Mode; preset?: { from?: string; to?: string } } | null>(null);
  const [toast, setToast] = useState<Toasted | null>(null); const [live, setLive] = useState('');
  const [root, rw] = useWidth<HTMLDivElement>(); const wide = rw >= 897;
  const txRef = useRef(txs); txRef.current = txs;
  const first = useRef(true); const skip = useRef(false); const seq = useRef(0);

  const bal = useMemo(() => balances(txs, SEED.opening), [txs]);
  const total = ACCTS.reduce((a, x) => a + bal[x.id]!, 0);
  const subs = useMemo(() => detectSubs(txs), [txs]);
  const alertsAll = useMemo(() => findAlerts(txs, subs, money), [txs, subs]);
  const alertsLive = alertsAll.filter((a) => !dismissed.includes(a.id));
  const hist = useMemo(() => paidHistory(txs), [txs]);
  const pendN = txs.filter((t) => t.status === 'pending').length, unpaid = bills.filter((b) => !b.paid).length;

  const say = useCallback((m: string, undo?: () => void) => { setLive(m); setToast({ m, undo, k: ++seq.current }); }, []);
  const setUi = (p: Partial<TxUi>) => setUiState((u) => ({ ...u, ...p }));
  const mutate = (f: (a: Tx[]) => Tx[], m: string) => { const before = txRef.current; setTxs(f(before)); say(m, () => { setTxs(before); say('Undone.'); }); };
  const patch = (a: Tx[], ids: string[], f: (t: Tx) => Tx) => a.map((t) => (ids.includes(t.id) ? f(t) : t));

  /* views */
  useEffect(() => { const v = new URLSearchParams(window.location.search).get('view'); if (isView(v) && v !== 'overview') { skip.current = true; setActive(v); } }, []);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = root.current; (el?.closest('.td-content') as HTMLElement | null)?.scrollTo({ top: 0 });
    if (skip.current) { skip.current = false; return; }
    const h = el?.querySelector('h1') as HTMLElement | null; if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } setLive(`${VIEWS[active]} view`);
  }, [active, root]);
  const nav = (id: string) => { if (isView(id)) setActive(id); };
  const goTx = (p: Partial<TxUi> = {}) => { setUiState({ ...TX_UI0, ...p }); setActive('tx'); };
  useEffect(() => { if (active === 'tx' && wide && !ui.sel) { const t = txs.find((x) => x.status === 'pending'); if (t) setUi({ sel: t.id }); } }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  /* transactions */
  const mk = (n: number, o: Partial<Tx> & Pick<Tx, 'name' | 'amt' | 'acct'>): Tx => ({ id: `t${n}`, date: TODAY, cat: 'Transfer', status: 'posted', kind: o.amt > 0 ? 'in' : 'out', method: 'ACH', ref: `ACH-${70000 + n * 37}`, memo: '', log: [`Created on ${dShort(TODAY)}`], ...o });
  const approve = (ids: string[]) => {
    const l = txRef.current.filter((t) => ids.includes(t.id) && t.status !== 'posted'); if (!l.length) return;
    mutate((a) => patch(a, l.map((t) => t.id), (x) => ({ ...x, status: 'posted', was: undefined, log: [...x.log, `Approved on ${dShort(TODAY)}`] })), l.length === 1 ? `${l[0]!.name} approved. ${acctOf(l[0]!.acct).name} balance ${l[0]!.amt > 0 ? 'increased' : 'decreased'} by ${money(Math.abs(l[0]!.amt))}.` : `${l.length} transactions approved and posted to your balances.`);
  };
  const flag = (id: string) => {
    const t = txRef.current.find((x) => x.id === id)!;
    if (t.status === 'flagged') mutate((a) => patch(a, [id], (x) => ({ ...x, status: x.was ?? 'pending', was: undefined, log: [...x.log, 'Flag cleared'] })), `Flag cleared on ${t.name}.`);
    else mutate((a) => patch(a, [id], (x) => ({ ...x, was: x.status, status: 'flagged', log: [...x.log, `Flagged for review on ${dShort(TODAY)}`] })), `${t.name} flagged for review.`);
  };
  const setCat = (ids: string[], cat: string) => {
    const ok = txRef.current.filter((t) => ids.includes(t.id) && t.cat !== cat && ((t.kind === 'in' && IN_CATS.includes(cat)) || (t.kind === 'out' && OUT_CATS.includes(cat))));
    const skipped = ids.length - ok.length - txRef.current.filter((t) => ids.includes(t.id) && t.cat === cat).length;
    if (!ok.length) return say(skipped ? `Nothing changed: income and expenses cannot move to ${cat}, and transfers keep their category.` : `Already in ${cat}.`);
    mutate((a) => patch(a, ok.map((t) => t.id), (x) => ({ ...x, cat, log: [...x.log, `Category set to ${cat}`] })), `${ok.length} ${ok.length === 1 ? 'transaction' : 'transactions'} moved to ${cat}${skipped ? `, ${skipped} skipped` : ''}.`);
  };
  const exportRows = (rows: Tx[], name: string) => {
    const body = ['Date,Description,Category,Account,Status,Amount', ...rows.map((t) => [t.date, csvCell(t.name), csvCell(t.cat), csvCell(acctOf(t.acct).name), t.status, (t.amt / 100).toFixed(2)].join(','))].join('\n');
    say(download(name, body) ? `Exported ${rows.length} transactions.` : 'Export is not available in this view.');
  };
  const submit = (d: Draft) => {
    const c = +d.amt, n = txs.length + 1; let made: Tx[];
    if (d.mode === 'transfer') made = [mk(n, { name: `Transfer to ${acctOf(d.to).name}`, amt: -c, acct: d.from, kind: 'xfer', method: 'Transfer', memo: `To ${acctOf(d.to).name} ••${acctOf(d.to).mask}` }), mk(n + 1, { name: `Transfer from ${acctOf(d.from).name}`, amt: c, acct: d.to, kind: 'xfer', method: 'Transfer', memo: `From ${acctOf(d.from).name} ••${acctOf(d.from).mask}` })];
    else if (d.mode === 'send') made = [mk(n, { name: d.party.trim(), cat: d.cat, amt: -c, acct: d.from, status: 'pending', memo: d.memo || 'Outgoing payment', log: ['Submitted, waiting for approval'] })];
    else made = [mk(n, { name: d.party.trim(), cat: 'Customer payments', amt: c, acct: d.from, status: 'pending', memo: d.memo || 'Payment request', log: ['Request sent, waiting for payment'] })];
    setTxs((a) => [...a, ...made]); setDlg(null);
    say(d.mode === 'transfer' ? `${money(c)} moved to ${acctOf(d.to).name}.` : d.mode === 'send' ? `Payment of ${money(c)} to ${d.party.trim()} is pending approval.` : `Request for ${money(c)} sent to ${d.party.trim()}.`);
  };

  /* bills */
  const upBill = (id: string, f: (b: Bill) => Bill) => setBills((a) => a.map((b) => (b.id === id ? f(b) : b)));
  const pay = (b: Bill, acct = 'ops') => {
    const n = txs.length + 1; setTxs((a) => [...a, mk(n, { name: b.name, cat: b.cat, acct, amt: -b.amt, memo: 'Bill payment', log: [`Paid on ${dShort(TODAY)}`] })]);
    upBill(b.id, (x) => ({ ...x, paid: TODAY, tx: `t${n}`, auto: false, sched: undefined, acct })); say(`${b.name} paid, ${money(b.amt)} from ${acctOf(acct).name}. Balance is now ${money(bal[acct]! - b.amt)}.`);
  };
  const billAct = {
    pay,
    schedule: (id: string, date: string, acct: string) => { const b = bills.find((x) => x.id === id)!; upBill(id, (x) => ({ ...x, sched: date, auto: false, acct })); say(`${b.name} will be paid on ${dShort(date)} from ${acctOf(acct).name}.`); },
    unschedule: (id: string) => { const b = bills.find((x) => x.id === id)!; upBill(id, (x) => ({ ...x, sched: undefined })); say(`Scheduled payment for ${b.name} cancelled.`, () => { upBill(id, () => b); say('Undone.'); }); },
    auto: (id: string, on: boolean, acct: string) => { const b = bills.find((x) => x.id === id)!; upBill(id, (x) => ({ ...x, auto: on, sched: on ? undefined : x.sched, acct })); say(on ? `Autopay on for ${b.name}. ${money(b.amt)} leaves ${acctOf(acct).name} on ${dShort(b.due)}.` : `Autopay off for ${b.name}.`, on ? undefined : () => { upBill(id, () => b); say('Undone.'); }); },
    add: (b: Omit<Bill, 'id'>) => { setBills((a) => [...a, { ...b, id: `b${a.length + 20}` }].sort((x, y) => x.due.localeCompare(y.due))); say(`${b.name} added, ${money(b.amt)} due ${dShort(b.due)}.`); },
  };

  /* insights */
  const goalAct = {
    save: (g: Goal) => { setGoals((a) => (a.some((x) => x.id === g.id) ? a.map((x) => (x.id === g.id ? g : x)) : [...a, g])); say(`Goal ${g.name} saved.`); },
    remove: (g: Goal) => { const before = goals; setGoals((a) => a.filter((x) => x.id !== g.id)); say(`Goal ${g.name} deleted.`, () => { setGoals(before); say('Undone.'); }); },
    fundManual: (id: string, c: number) => { const g = goals.find((x) => x.id === id)!; setGoals((a) => a.map((x) => (x.id === id ? { ...x, saved: x.saved + c } : x))); say(`${money(c)} added to ${g.name}.`); },
    transfer: (acct: string) => setDlg({ mode: 'transfer', preset: { from: acct === 'ops' ? 'sav' : 'ops', to: acct } }),
  };
  const exportAll = () => exportRows(txs, 'transactions.csv');
  const NAV: NavEntry[] = [{ id: 'overview', label: 'Overview', icon: 'home' }, { id: 'accounts', label: 'Accounts', icon: 'dollar' }, { id: 'tx', label: 'Transactions', icon: 'list', badge: pendN || undefined }, { id: 'bills', label: 'Bills', icon: 'calendar', badge: unpaid || undefined }, { id: 'insights', label: 'Insights', icon: 'chart', badge: alertsLive.length || undefined }];

  return (
    <Shell brand={brand} nav={NAV} active={active} onNav={nav} title={VIEWS[active]} crumbs={[brand, 'Wren & Pike Studio', VIEWS[active]]} searchHint="Search" user={{ name: 'Mara Okafor', role: 'Owner' }}>
      <div className="tf-host" ref={root}><div className="tf-view" key={active}>
        {active === 'overview' && <OverviewView txs={txs} bills={bills} bal={bal} total={total} compose={(m) => setDlg({ mode: m })} goAcct={(id) => { setAcctSel(id); setActive('accounts'); }} goTx={(id, tab) => goTx({ sel: id, tab: tab ?? 'all' })} goBills={() => setActive('bills')} goCat={(c) => c !== 'Other' && goTx({ cat: c })} pay={(b) => pay(b)} exportCsv={exportAll} />}
        {active === 'accounts' && <AccountsView txs={txs} bal={bal} total={total} sel={acctSel} setSel={setAcctSel} onTransfer={(from) => setDlg({ mode: 'transfer', preset: { from } })} onOpenTx={(id) => goTx({ sel: id })} onAll={(a) => goTx({ acct: a })} say={say} />}
        {active === 'tx' && <TransactionsView txs={txs} ui={ui} setUi={setUi} wide={wide} act={{ approve, flag, setCat, exportRows, send: () => setDlg({ mode: 'send' }) }} />}
        {active === 'bills' && <BillsView bills={bills} hist={hist} bal={bal} act={billAct} onOpenTx={(id) => goTx({ sel: id })} />}
        {active === 'insights' && <InsightsView txs={txs} subs={subs} alerts={alertsLive} dismissed={alertsAll.length - alertsLive.length} onDismiss={(id) => { setDismissed((d) => [...d, id]); say('Alert dismissed.', () => { setDismissed((d) => d.filter((x) => x !== id)); say('Undone.'); }); }} onRestore={() => setDismissed([])} reminders={reminders} onRemind={(name, d) => { setReminders((r) => { const n = { ...r }; if (d === null) delete n[name]; else n[name] = d; return n; }); say(d === null ? `Reminder for ${name} removed.` : `We will remind you ${d} days before ${name} renews.`); }} onReview={(a) => goTx({ q: a.q ?? '', cat: a.cat ?? 'all' })} onMerchant={(q) => goTx({ q })} onBills={() => setActive('bills')} goals={{ goals, txs, bal, ...goalAct }} />}
      </div></div>
      {dlg && <ActionDialog mode={dlg.mode} preset={dlg.preset} balances={bal} onClose={() => setDlg(null)} onSubmit={submit} />}
      {toast && <Toast key={toast.k} msg={toast.m} onUndo={toast.undo && (() => { toast.undo!(); })} onClose={() => setToast(null)} />}
      <div className="td-sr" role="status" aria-live="polite">{live}</div>
    </Shell>
  );
}

export function Demo() { return <Preview w={1280} h={150}><FinanceDashboard /></Preview>; }
