'use client';
// The Accounts view: the account list on the left, and for the selected account its balance history, details, limits,
// recent activity and statements.
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { AreaChart, Button, Delta, Glyph, PageHeader, Panel, Pill, Segmented, Sparkline } from './_dash';
import { ACCTS, TODAY, acctOf, dShort, money, moneyWhole, type Tx } from './_fin';
import { acctSeries, dayLabels, limits, statements, type Stmt } from './_fin-more';
import { Meter, csvCell, download } from './_fin-kit';
import { Amt } from './_fin-ui';

const OPENED: Record<string, string> = { ops: 'Jan 12, 2023', pay: 'Jan 12, 2023', tax: 'Mar 3, 2023', sav: 'Aug 21, 2024' };
const FULL: Record<string, string> = { ops: '000107714821', pay: '000107717730', tax: '000107711294', sav: '000107719056' };
const ROUTING = '110000000';

export function AccountsView({ txs, bal, total, sel, setSel, onTransfer, onOpenTx, onAll, say }: { txs: Tx[]; bal: Record<string, number>; total: number; sel: string; setSel: (id: string) => void; onTransfer: (from: string) => void; onOpenTx: (id: string) => void; onAll: (acct: string) => void; say: (m: string) => void }) {
  const a = acctOf(sel); const [days, setDays] = useState<'30' | '90' | '180'>('90'); const [shown, setShown] = useState(false);
  useEffect(() => setShown(false), [sel]);
  const n = +days;
  const spark = useMemo(() => Object.fromEntries(ACCTS.map((x) => [x.id, acctSeries(txs, bal, x.id, 30)])), [txs, bal]);
  const hist = useMemo(() => acctSeries(txs, bal, sel, n), [txs, bal, sel, n]);
  const labels = useMemo(() => dayLabels(n), [n]);
  const stmts = useMemo(() => statements(txs, bal, sel), [txs, bal, sel]);
  const recent = useMemo(() => txs.filter((t) => t.acct === sel).sort((x, y) => y.date.localeCompare(x.date) || +y.id.slice(1) - +x.id.slice(1)).slice(0, 8), [txs, sel]);
  const lim = limits(txs, a);
  const chg = hist[n - 1]! - hist[0]!, pct = hist[0]! ? (chg / hist[0]!) * 100 : 0;
  const lo = Math.min(...hist), hi = Math.max(...hist), avg = Math.round(hist.reduce((x, y) => x + y, 0) / n);
  const interest = a.id === 'sav' ? txs.filter((t) => t.acct === 'sav' && t.cat === 'Interest' && t.status === 'posted').reduce((x, t) => x + t.amt, 0) : 0;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = ACCTS.findIndex((x) => x.id === sel), d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
    e.preventDefault(); const nx = ACCTS[(i + d + ACCTS.length) % ACCTS.length]!; setSel(nx.id); setTimeout(() => (e.currentTarget.querySelector(`[data-acct="${nx.id}"]`) as HTMLElement | null)?.focus(), 0);
  };
  const dl = (s: Stmt) => {
    const body = ['Date,Description,Category,Status,Amount,Reference', ...s.lines.map((t) => [t.date, csvCell(t.name), csvCell(t.cat), t.status, (t.amt / 100).toFixed(2), t.ref].join(','))].join('\n');
    const head = `Statement,${csvCell(`${a.name} ••${a.mask}`)}\nPeriod,${s.from} to ${s.to}\nOpening balance,${(s.open / 100).toFixed(2)}\nClosing balance,${(s.close / 100).toFixed(2)}\n\n`;
    say(download(`${a.name.toLowerCase().replace(/\W+/g, '-')}-${s.from.slice(0, 7)}.csv`, head + body) ? `Downloaded the ${s.label} statement for ${a.name}.` : 'Downloads are not available in this view.');
  };
  const copy = async (label: string, v: string) => { try { await navigator.clipboard.writeText(v); say(`${label} copied.`); } catch { say('Copy is not available in this view.'); } };
  const details: Array<[string, string, string?]> = [['Account number', shown ? FULL[sel]! : `••••••••${a.mask}`, 'Account number'], ['Routing number', shown ? ROUTING : '•••••••••', 'Routing number'], ['Type', a.type], ['Opened', OPENED[sel]!], ['Status', 'Active, in good standing'], ...(a.id === 'sav' ? [['Interest earned', `${money(interest)} since March`] as [string, string]] : [])];

  return (
    <div className="tf-wrap tf-acv">
      <PageHeader title="Accounts" sub={`${ACCTS.length} accounts · ${money(total)} total · as of ${dShort(TODAY)}, 2026`}><Button icon="plus" onClick={() => onTransfer(sel)}>Transfer from {a.name}</Button></PageHeader>
      <div className="tf-acgrid">
        <section className="td-panel tf-aclist" aria-label="Accounts">
          <div role="radiogroup" aria-label="Choose an account" onKeyDown={onKey}>
            {ACCTS.map((x) => { const s = spark[x.id]!, d = s[29]! - s[0]!; return (
              <button key={x.id} type="button" role="radio" aria-checked={sel === x.id} tabIndex={sel === x.id ? 0 : -1} data-acct={x.id} className="tf-acrow" onClick={() => setSel(x.id)}>
                <span className="tf-acrow-t"><b>{x.name}</b>{x.primary && <Pill tone="accent" dot={false}>Primary</Pill>}</span>
                <small>{x.type} <span className="td-mono">••{x.mask}</span></small>
                <strong>{money(bal[x.id]!)}</strong>
                <span className="tf-acrow-s"><Sparkline data={s} width={72} height={22} tone={d >= 0 ? 'signal' : 'bad'} fill={false} /><em className={d >= 0 ? 'is-in' : 'is-out'}>{moneyWhole(d, true)}</em><small>30d</small></span>
              </button>
            ); })}
          </div>
          <p className="tf-aclist-f"><span>Total</span><b>{money(total)}</b></p>
        </section>

        <div className="tf-acdet">
          <Panel id="tf-hist" title={`${a.name} balance`} sub={`${a.type} ••${a.mask} · end of day`} actions={<Segmented label="Range" value={days} onChange={setDays} options={[{ id: '30', label: '30 days' }, { id: '90', label: '90 days' }, { id: '180', label: '6 months' }]} />}>
            <div className="tf-hist-h"><b>{money(bal[sel]!)}</b><Delta value={pct} /><span>{moneyWhole(chg, true)} in {days} days</span></div>
            <AreaChart ariaLabel={`${a.name} balance, last ${days} days`} labels={labels} height={210} format={(v) => (v === 0 ? '$0' : v >= 1e5 ? `$${Math.round(v / 1e3)}k` : `$${(v / 1e3).toFixed(1)}k`)} tipFormat={(v) => moneyWhole(v * 100)} series={[{ id: 'b', label: 'Balance', data: hist.map((v) => Math.round(v / 100)), color: 'var(--signal, #0f766e)' }]} />
            <p className="tf-hist-x"><span>Low <b>{moneyWhole(lo)}</b></span><span>Average <b>{moneyWhole(avg)}</b></span><span>High <b>{moneyWhole(hi)}</b></span></p>
          </Panel>

          <div className="tf-two">
            <Panel id="tf-det" title="Details" actions={<Button small variant="ghost" icon={shown ? 'x' : 'search'} onClick={() => { setShown(!shown); say(shown ? 'Account numbers hidden.' : 'Account numbers shown.'); }}>{shown ? 'Hide numbers' : 'Reveal numbers'}</Button>}>
              <dl className="tf-dl tf-dl-flush">{details.map(([k, v, c]) => <div key={k}><dt>{k}</dt><dd className={c ? 'td-mono tf-dd' : undefined}>{v}{c && <button type="button" className="tf-copy" aria-label={`Copy ${k.toLowerCase()}`} disabled={!shown} onClick={() => copy(k, k === 'Routing number' ? ROUTING : FULL[sel]!)}><Glyph name="link" size={13} /></button>}</dd></div>)}</dl>
            </Panel>
            <Panel id="tf-lim" title="Limits" sub="Resets daily and on the 1st">
              <ul className="tf-lims">{lim.map((l) => <li key={l.label}><span>{l.label}</span><b>{l.money ? `${money(l.used)} of ${moneyWhole(l.cap)}` : `${l.used} of ${l.cap}`}</b><Meter value={l.used} cap={l.cap} label={`${l.label}: ${Math.round((l.used / l.cap) * 100)}% used`} /></li>)}</ul>
            </Panel>
          </div>

          <div className="tf-two">
            <Panel id="tf-rec" title="Recent activity" actions={<Button small variant="ghost" onClick={() => onAll(sel)}>View all</Button>}>
              {recent.length === 0 ? <p className="td-muted">No activity yet.</p> : <ul className="tf-acts-l">{recent.map((t) => <li key={t.id}><button type="button" onClick={() => onOpenTx(t.id)} aria-label={`${t.name}, ${dShort(t.date)}, open in Transactions`}><span className="tf-al-d">{dShort(t.date)}</span><span className="tf-al-n"><b>{t.name}</b><small>{t.cat}{t.status !== 'posted' ? ` · ${t.status}` : ''}</small></span><Amt t={t} /></button></li>)}</ul>}
            </Panel>
            <Panel id="tf-stm" title="Statements" sub="Monthly, newest first">
              <ul className="tf-stmts">{stmts.map((s) => <li key={s.id}><span className="tf-st-n"><b>{s.label}</b><small>{s.partial ? `In progress, through ${dShort(s.to)}` : `${s.n} transactions`} · {moneyWhole(s.open)} to {moneyWhole(s.close)}</small></span><Button small icon="file" label={`Download ${s.label} statement for ${a.name}`} onClick={() => dl(s)}><span className="hide-sm">CSV</span></Button></li>)}</ul>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
