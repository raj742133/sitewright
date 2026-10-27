'use client';
// Accounts: a searchable company list with a full account page beside it: ARR, contacts, open deals and a timeline.
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Avatar, Button, Empty, Glyph, Panel, Pill, Segmented, Sparkline, cx } from './_dash';
import { closeNote, dateLabel, prob, sum, type Deal } from './_sales';
import { ACCOUNTS, arrOf, ago, fill, useCfg, type Account } from './_sales-store';
import { StagePill, ViewHead, type Ops } from './_sales-ui';

type Kind = 'all' | 'customer' | 'prospect'; type SortId = 'arr' | 'name' | 'pipeline';

export function AccountsView({ ops, headRef, initial }: { ops: Ops; headRef: React.Ref<HTMLHeadingElement>; initial?: string }) {
  const { cfg, fm } = useCfg(); const { deals } = ops;
  const [q, setQ] = useState(''); const [kind, setKind] = useState<Kind>('all'); const [sort, setSort] = useState<SortId>('arr');
  const [sel, setSel] = useState(() => ACCOUNTS.find((a) => a.name === initial)?.id ?? 'kestrelaero'); const [picked, setPicked] = useState(!!initial);
  const list = useRef<HTMLUListElement>(null);
  const stats = (a: Account) => { const mine = deals.filter((d) => d.company === a.name); const open = mine.filter((d) => d.stage !== 'won'); return { arr: arrOf(a, deals), open, pipeline: sum(open), weighted: sum(open, (d) => (d.amount * prob(d, cfg.stages)) / 100) }; };
  const rows = useMemo(() => {
    const r = ACCOUNTS.map((a) => ({ a, s: stats(a) })).filter(({ a, s }) => (kind === 'all' || (kind === 'customer') === (s.arr > 0)) && (!q.trim() || `${a.name} ${a.industry} ${a.owner}`.toLowerCase().includes(q.trim().toLowerCase())));
    return r.sort((x, y) => (sort === 'name' ? x.a.name.localeCompare(y.a.name) : sort === 'arr' ? y.s.arr - x.s.arr : y.s.pipeline - x.s.pipeline) || x.a.name.localeCompare(y.a.name));
  }, [deals, q, kind, sort, cfg.stages]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = rows.find((r) => r.a.id === sel) ?? rows[0]; const total = rows.reduce((t, r) => t + r.s.arr, 0);
  const choose = (id: string, focus = false) => { setSel(id); setPicked(true); if (focus) list.current?.querySelector<HTMLElement>(`[data-acc="${id}"]`)?.focus(); };
  const key = (e: KeyboardEvent, i: number) => { const n = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : -1; if (n < 0 || !rows[n]) return; e.preventDefault(); choose(rows[n]!.a.id, true); };

  return (
    <>
      <ViewHead ref={headRef} title="Accounts" sub={`${rows.length} companies · ${fm.m(total)} ARR in view`} />
      <div className={cx('tv-ac', picked && 'is-detail')}>
        <Panel id="tv-al" className="tv-aclist" flush>
          <div className="tv-actools">
            <label className="ts-search"><span className="td-sr">Search accounts</span><Glyph name="search" size={14} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies" /></label>
            <div className="tv-acrow"><Segmented<Kind> label="Account type" value={kind} onChange={setKind} options={[{ id: 'all', label: 'All' }, { id: 'customer', label: 'Customers' }, { id: 'prospect', label: 'Prospects' }]} />
              <label className="tv-mini"><span className="td-sr">Sort accounts</span><select value={sort} onChange={(e) => setSort(e.target.value as SortId)}><option value="arr">Sort: ARR</option><option value="pipeline">Sort: Open pipeline</option><option value="name">Sort: Name</option></select></label></div>
          </div>
          {rows.length === 0 ? <Empty title="No accounts match" text="Try another search or type." /> : (
            <ul className="tv-aclistul" ref={list} role="listbox" aria-label="Accounts">
              {rows.map(({ a, s }, i) => (
                <li key={a.id} role="option" aria-selected={cur?.a.id === a.id}>
                  <button type="button" data-acc={a.id} tabIndex={cur?.a.id === a.id ? 0 : -1} className={cx('tv-acitem', cur?.a.id === a.id && 'is-on')} onClick={() => choose(a.id)} onKeyDown={(e) => key(e, i)}>
                    <span className="tv-logo" aria-hidden="true">{a.name[0]}</span>
                    <span className="tv-acn"><b>{a.name}</b><small>{a.industry} · {a.region}</small></span>
                    <span className="tv-acv"><b>{s.arr ? fm.k(s.arr) : '—'}</b><small>{s.open.length ? `${s.open.length} open · ${fm.k(s.pipeline)}` : 'no open deals'}</small></span>
                  </button>
                </li>))}
            </ul>)}
        </Panel>
        {cur ? <AccountPage key={cur.a.id} a={cur.a} s={cur.s} ops={ops} onBack={() => setPicked(false)} /> : <Panel id="tv-ae"><Empty title="Select an account" text="Pick a company to see its contacts, deals and timeline." /></Panel>}
      </div>
    </>
  );
}

function AccountPage({ a, s, ops, onBack }: { a: Account; s: { arr: number; open: Deal[]; pipeline: number; weighted: number }; ops: Ops; onBack: () => void }) {
  const { cfg, fm } = useCfg(); const mine = ops.deals.filter((d) => d.company === a.name); const won = mine.filter((d) => d.stage === 'won');
  const tl = ops.log.filter((e) => mine.some((d) => d.id === e.deal)).slice(0, 8); const customer = s.arr > 0;
  const trend = a.trend.map((v, i, arr) => (i === arr.length - 1 ? s.arr : v));
  return (
    <section className="tv-acpage" aria-labelledby="tv-acn">
      <button type="button" className="tv-back" onClick={onBack}><Glyph name="chevron" size={14} className="tv-flip" />All accounts</button>
      <header className="tv-achead">
        <span className="tv-logo is-lg" aria-hidden="true">{a.name[0]}</span>
        <div><h2 id="tv-acn">{a.name}</h2><p>{a.industry} · {a.region} · {a.size.toLocaleString('en-US')} employees</p></div>
        <div className="tv-acpills"><Pill tone={customer ? 'ok' : 'neutral'}>{customer ? 'Customer' : 'Prospect'}</Pill><span className="tv-own"><Avatar name={a.owner} size={20} />{a.owner}</span></div>
      </header>
      <div className="tv-acstats">
        <div><span>ARR</span><b>{s.arr ? fm.m(s.arr) : '—'}</b><small>{customer ? `Customer since ${a.since ? dateLabel(a.since) + ' ' + a.since.slice(0, 4) : '—'}` : 'Not a customer yet'}</small></div>
        <div><span>Open pipeline</span><b>{fm.m(s.pipeline)}</b><small>{s.open.length} open {s.open.length === 1 ? 'deal' : 'deals'}</small></div>
        <div><span>Weighted</span><b>{fm.m(s.weighted)}</b><small>open × win probability</small></div>
        <div><span>Won this quarter</span><b>{fm.m(sum(won))}</b><small>{won.length} {won.length === 1 ? 'deal' : 'deals'}</small>{trend.length > 1 && <Sparkline data={trend} width={72} height={22} />}</div>
      </div>
      <div className="tv-acgrid">
        <Panel id="tv-ad" title="Deals" sub={`${mine.length} on this account`} flush>
          {mine.length === 0 ? <Empty title="No deals" text="This account has no deals in the pipeline right now." /> : (
            <ul className="tv-dealrows">{mine.map((d) => <li key={d.id}><button type="button" onClick={() => ops.openDeal(d.id)}><span className="tv-acn"><b>{d.title}</b><small><StagePill id={d.stage} /> · {d.stage === 'won' ? `Closed ${dateLabel(d.close)}` : `closes ${closeNote(d)}`}</small></span><span className="tv-amt">{fm.m(d.amount)}</span></button></li>)}</ul>)}
        </Panel>
        <Panel id="tv-ac" title="Contacts" sub={`${a.contacts.length} people`} flush>
          <ul className="tv-contacts">{a.contacts.map((c) => <li key={c.email}><Avatar name={c.name} size={28} /><span className="tv-acn"><b>{c.name}</b><small>{c.role}</small><small className="tv-mail">{c.email}</small></span><span className="tv-ctag"><Pill tone={c.tag === 'Primary' ? 'info' : 'neutral'} dot={false}>{c.tag}</Pill><small>{c.ago === 0 ? 'Today' : `${c.ago}d ago`}</small></span></li>)}</ul>
        </Panel>
        <Panel id="tv-at" title="Timeline" sub="Latest activity on this account" actions={<Button small icon="plus" onClick={() => ops.goActivity(mine[0]?.id)} >Log activity</Button>}>
          {tl.length === 0 ? <p className="tv-quiet">No activity logged yet.</p> : <ol className="tv-tl">{tl.map((e) => { const d = mine.find((x) => x.id === e.deal)!; return <li key={e.id}><p><b>{e.who}</b> {e.verb} <button type="button" className="tv-link" onClick={() => ops.openDeal(d.id)}>{d.title}</button> {fill(e.text, cfg, fm, d)}</p><time>{ago(e.ts)}</time></li>; })}{a.since && <li><p><b>{a.name}</b> became a customer.</p><time>{dateLabel(a.since)} {a.since.slice(0, 4)}</time></li>}</ol>}
        </Panel>
      </div>
    </section>
  );
}
