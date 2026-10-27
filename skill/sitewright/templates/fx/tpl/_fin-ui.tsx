'use client';
// Pieces of the finance dashboard that are not in the kit: the transaction detail drawer and the Send / Request / Transfer dialog.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Button, Glyph, Pill, cx } from './_dash';
import { ACCTS, IN_CATS, OUT_CATS, acctOf, dLong, dShort, isPosted, money, type Tx } from './_fin';

const TONE = { posted: 'ok', pending: 'warn', flagged: 'bad' } as const;
const LABEL = { posted: 'Posted', pending: 'Pending', flagged: 'Flagged' } as const;
export const StatusPill = ({ s }: { s: Tx['status'] }) => <Pill tone={TONE[s]}>{LABEL[s]}</Pill>;
export const Amt = ({ t }: { t: Tx }) => <span className={cx('tf-amt', t.kind === 'in' && 'is-in', t.status !== 'posted' && t.status !== 'flagged' && 'is-soft')}>{money(t.amt, t.kind === 'in')}</span>;

export function Drawer({ t, onClose, onApprove, onFlag, onCat, bodyRef, sheet }: { t: Tx | null; onClose: () => void; onApprove: (id: string) => void; onFlag: (id: string) => void; onCat: (id: string, cat: string) => void; bodyRef: React.RefObject<HTMLElement | null>; sheet?: boolean }) {
  if (!t) return <aside className="tf-drawer is-empty" ref={bodyRef} aria-label="Transaction details"><div className="td-empty"><Glyph name="file" size={22} /><b>No transaction selected</b><p>Pick a row to see its details and approve or flag it.</p></div></aside>;
  const a = acctOf(t.acct);
  const effect = t.status === 'posted' ? `Moved ${money(t.amt, true)} ${t.amt > 0 ? 'into' : 'out of'} ${a.name}.` : t.status === 'flagged' ? (isPosted(t) ? 'Already counted in the balance. Clear the flag to mark it reviewed.' : 'Held. Not counted in the balance until you approve it.') : `Approving moves ${money(t.amt, true)} ${t.amt > 0 ? 'into' : 'out of'} ${a.name}.`;
  const rowsD: Array<[string, string]> = [['Date', dLong(t.date)], ['Account', `${a.name} ••${a.mask}`], ['Method', t.method], ['Reference', t.ref], ['Memo', t.memo]];
  return (
    <aside className={cx('tf-drawer', sheet && 'is-sheet')} ref={bodyRef} tabIndex={-1} aria-label={`Details for ${t.name}`} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="tf-dh"><span className="td-muted">Transaction</span><Button variant="ghost" small icon="x" label="Close details" onClick={onClose} /></div>
      <div className="tf-dtop"><b className={cx('tf-big', t.kind === 'in' && 'is-in')}>{money(t.amt, t.kind === 'in')}</b><span>{t.name}</span><StatusPill s={t.status} /></div>
      <dl className="tf-dl">{rowsD.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={k === 'Reference' ? 'td-mono' : undefined}>{v}</dd></div>)}</dl>
      {t.kind !== 'xfer' && <label className="tf-dcat"><span>Category</span><span className="tf-select"><select value={t.cat} onChange={(e) => onCat(t.id, e.target.value)} aria-label="Category">{(t.kind === 'in' ? IN_CATS : OUT_CATS).map((c) => <option key={c}>{c}</option>)}</select><Glyph name="down" size={12} /></span></label>}
      <p className="tf-effect">{effect}</p>
      <ol className="tf-log" aria-label="Activity">{t.log.map((l, i) => <li key={i}>{l}</li>)}</ol>
      <div className="tf-da">
        <Button variant="primary" icon="check" disabled={t.status === 'posted'} onClick={() => onApprove(t.id)}>{t.status === 'posted' ? 'Approved' : 'Approve'}</Button>
        <Button onClick={() => onFlag(t.id)}>{t.status === 'flagged' ? 'Clear flag' : 'Flag'}</Button>
      </div>
    </aside>
  );
}

export type Mode = 'send' | 'request' | 'transfer';
export interface Draft { mode: Mode; party: string; amt: string; from: string; to: string; cat: string; memo: string }
const COPY = { send: ['Send money', 'To', 'From account', 'Send payment'], request: ['Request money', 'From', 'Deposit into', 'Send request'], transfer: ['Transfer between accounts', '', 'From', 'Move money'] } as const;

export function ActionDialog({ mode, balances, onClose, onSubmit, preset }: { mode: Mode; balances: Record<string, number>; onClose: () => void; onSubmit: (d: Draft) => void; preset?: { from?: string; to?: string } }) {
  const [d, setD] = useState<Draft>({ mode, party: '', amt: '', from: preset?.from ?? 'ops', to: preset?.to ?? (preset?.from === 'sav' ? 'ops' : 'sav'), cat: 'Contractors', memo: '' });
  const [err, setErr] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setD((x) => ({ ...x, [k]: v })); setErr(''); };
  useEffect(() => { const prev = document.activeElement as HTMLElement | null; (ref.current?.querySelector('input,select') as HTMLElement | null)?.focus(); return () => prev?.focus?.(); }, []);
  const cents = Math.round(parseFloat(d.amt.replace(/[$,\s]/g, '')) * 100);
  const submit = () => {
    if (mode !== 'transfer' && !d.party.trim()) return setErr(mode === 'send' ? 'Enter who you are paying.' : 'Enter who you are requesting from.');
    if (!(cents > 0)) return setErr('Enter an amount greater than $0.00.');
    if (mode !== 'request' && cents > (balances[d.from] ?? 0)) return setErr(`${acctOf(d.from).name} has ${money(balances[d.from] ?? 0)} available.`);
    if (mode === 'transfer' && d.from === d.to) return setErr('Choose two different accounts.');
    onSubmit({ ...d, amt: String(cents) });
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab') return;
    const f = Array.from(ref.current?.querySelectorAll<HTMLElement>('input,select,button:not(:disabled)') ?? []); if (!f.length) return;
    const first = f[0]!, last = f[f.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const [title, partyL, acctL, cta] = COPY[mode];
  const sel = (id: string, v: string, on: (v: string) => void, opts: Array<[string, string]>) => <select id={id} value={v} onChange={(e) => on(e.target.value)}>{opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>;
  const aOpts = (skip?: string): Array<[string, string]> => ACCTS.filter((a) => a.id !== skip).map((a) => [a.id, `${a.name} ••${a.mask} · ${money(balances[a.id] ?? 0)}`]);
  return (
    <div className="tf-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tf-dialog" role="dialog" aria-modal="true" aria-labelledby="tf-dlg-t" ref={ref} onKeyDown={onKey}>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
          <div className="tf-dlg-h"><h2 id="tf-dlg-t">{title}</h2><Button variant="ghost" small icon="x" label="Close" onClick={onClose} /></div>
          {mode !== 'transfer' && <label className="tf-f"><span>{partyL}</span><input value={d.party} onChange={(e) => set('party', e.target.value)} placeholder={mode === 'send' ? 'Payee name' : 'Customer name'} autoComplete="off" /></label>}
          <label className="tf-f"><span>Amount (USD)</span><input inputMode="decimal" value={d.amt} onChange={(e) => set('amt', e.target.value)} placeholder="0.00" autoComplete="off" /></label>
          <label className="tf-f"><span>{acctL}</span>{sel('tf-from', d.from, (v) => set('from', v), aOpts())}</label>
          {mode === 'transfer' && <label className="tf-f"><span>To</span>{sel('tf-to', d.to, (v) => set('to', v), aOpts(d.from))}</label>}
          {mode === 'send' && <label className="tf-f"><span>Category</span>{sel('tf-cat', d.cat, (v) => set('cat', v), OUT_CATS.map((c) => [c, c]))}</label>}
          {mode !== 'transfer' && <label className="tf-f"><span>Memo <em>optional</em></span><input value={d.memo} onChange={(e) => set('memo', e.target.value)} autoComplete="off" /></label>}
          <p className="tf-err" role="alert">{err}</p>
          <p className="tf-hint">{mode === 'transfer' ? 'Transfers between your accounts post right away.' : mode === 'send' ? 'Payments wait as Pending until you approve them in Transactions.' : 'The request shows as a pending deposit until the customer pays.'}</p>
          <div className="tf-dlg-a"><Button onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" icon={mode === 'send' ? 'send' : undefined}>{cta}</Button></div>
        </form>
      </div>
    </div>
  );
}
