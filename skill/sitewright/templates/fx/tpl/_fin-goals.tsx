'use client';
// Savings goals: progress read from the linked account (or entered by hand), a pace check, edit / add funds / delete.
import { useState } from 'react';
import { Button, Panel, Pill, Progress } from './_dash';
import { ACCTS, TODAY, dShort, money, moneyWhole, type Tx } from './_fin';
import { goalInfo, type Goal } from './_fin-more';
import { Modal, SelectField, TextField, parseCents } from './_fin-kit';

export interface GoalProps { goals: Goal[]; txs: Tx[]; bal: Record<string, number>; save: (g: Goal) => void; remove: (g: Goal) => void; fundManual: (id: string, cents: number) => void; transfer: (acct: string) => void }
type D = { kind: 'edit'; g: Goal | null } | { kind: 'fund'; g: Goal } | { kind: 'del'; g: Goal } | null;

export function GoalsPanel(p: GoalProps) {
  const [d, setD] = useState<D>(null);
  const info = p.goals.map((g) => ({ g, i: goalInfo(g, p.txs, p.bal) }));
  const saved = info.reduce((a, x) => a + x.i.cur, 0), target = p.goals.reduce((a, g) => a + g.target, 0);
  return (
    <Panel id="tf-go" title="Savings goals" sub={p.goals.length ? `${moneyWhole(saved)} saved of ${moneyWhole(target)} across ${p.goals.length} goals` : 'Set a target and watch it fill'} actions={<Button small icon="plus" onClick={() => setD({ kind: 'edit', g: null })}>New goal</Button>}>
      {p.goals.length === 0 ? <div className="td-empty"><b>No goals yet</b><p>Create one for taxes, equipment or a cash runway.</p></div> : (
        <ul className="tf-goals">{info.map(({ g, i }) => (
          <li key={g.id}>
            <div className="tf-g-h"><b>{g.name}</b><Pill tone={i.state === 'done' ? 'ok' : i.state === 'behind' ? 'warn' : i.state === 'on' ? 'info' : 'neutral'}>{{ done: 'Reached', behind: 'Behind pace', on: 'On track', manual: 'Manual' }[i.state]}</Pill></div>
            <p className="tf-g-n"><b>{money(i.cur)}</b> of {moneyWhole(g.target)} · {Math.round(i.pct * 100)}%</p>
            <Progress value={i.pct} tone={i.state === 'behind' ? 'primary' : 'signal'} label={`${g.name}: ${Math.round(i.pct * 100)}% of the target`} />
            <p className="tf-g-m">By {dShort(g.by)}, {i.days} days left · {g.acct ? `in ${ACCTS.find((a) => a.id === g.acct)!.name}` : 'tracked by hand'}</p>
            <p className="tf-g-m">{i.state === 'done' ? 'Target met.' : `Needs ${moneyWhole(i.need)} a month${i.pace !== null ? `; pacing ${moneyWhole(i.pace, true)}` : ''}.`}</p>
            <div className="tf-g-a"><Button small onClick={() => (g.acct ? p.transfer(g.acct) : setD({ kind: 'fund', g }))} label={`Add funds to ${g.name}`}>Add funds</Button><Button small variant="ghost" onClick={() => setD({ kind: 'edit', g })} label={`Edit ${g.name}`}>Edit</Button><Button small variant="ghost" onClick={() => setD({ kind: 'del', g })} label={`Delete ${g.name}`}>Delete</Button></div>
          </li>))}</ul>
      )}
      {d?.kind === 'edit' && <EditGoal g={d.g} onClose={() => setD(null)} onSave={(g) => { p.save(g); setD(null); }} />}
      {d?.kind === 'fund' && <FundGoal g={d.g} onClose={() => setD(null)} onSave={(c) => { p.fundManual(d.g.id, c); setD(null); }} />}
      {d?.kind === 'del' && <Modal id="tf-gd" title={`Delete ${d.g.name}?`} onClose={() => setD(null)}><p className="tf-hint">The goal is removed. Money in {d.g.acct ? 'the linked account' : 'your accounts'} is not touched. You can undo this from the message that follows.</p><div className="tf-dlg-a"><Button onClick={() => setD(null)}>Keep goal</Button><Button variant="primary" onClick={() => { p.remove(d.g); setD(null); }}>Delete goal</Button></div></Modal>}
    </Panel>
  );
}

function EditGoal({ g, onClose, onSave }: { g: Goal | null; onClose: () => void; onSave: (g: Goal) => void }) {
  const [name, setName] = useState(g?.name ?? ''); const [amt, setAmt] = useState(g ? String(g.target / 100) : ''); const [by, setBy] = useState(g?.by ?? ''); const [acct, setAcct] = useState(g?.acct ?? ''); const [err, setErr] = useState<Record<string, string>>({});
  const submit = () => {
    const e: Record<string, string> = {}, c = parseCents(amt);
    if (!name.trim()) e.name = 'Give the goal a name.'; else if (name.trim().length > 40) e.name = 'Keep the name under 40 characters.';
    if (!(c > 0)) e.amt = 'Enter a target greater than $0.00.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(by) || by <= TODAY) e.by = 'Choose a date after today.';
    setErr(e); if (Object.keys(e).length) return;
    onSave({ id: g?.id ?? `g${Date.now() % 1e6}`, name: name.trim(), target: c, by, acct: acct || null, saved: g?.saved ?? 0 });
  };
  return (
    <Modal id="tf-ge" title={g ? `Edit ${g.name}` : 'New savings goal'} onClose={onClose}>
      <form className="tf-mod-f" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <TextField id="tf-gn" label="Name" value={name} onChange={setName} error={err.name} placeholder="Equipment refresh" />
        <TextField id="tf-ga" label="Target (USD)" value={amt} onChange={setAmt} error={err.amt} inputMode="decimal" placeholder="0.00" />
        <TextField id="tf-gb" label="Reach it by" type="date" value={by} min={TODAY} onChange={setBy} error={err.by} />
        <SelectField id="tf-gl" label="Progress comes from" value={acct} onChange={setAcct} options={[['', 'Entered by hand'], ...ACCTS.map((a) => [a.id, `${a.name} ••${a.mask} balance`] as [string, string])]} hint="Linked goals follow the account balance." />
        <div className="tf-dlg-a"><Button onClick={onClose}>Cancel</Button><Button variant="primary" type="submit">{g ? 'Save changes' : 'Create goal'}</Button></div>
      </form>
    </Modal>
  );
}
function FundGoal({ g, onClose, onSave }: { g: Goal; onClose: () => void; onSave: (c: number) => void }) {
  const [amt, setAmt] = useState(''); const [err, setErr] = useState('');
  return (
    <Modal id="tf-gf" title={`Add funds to ${g.name}`} onClose={onClose}>
      <form className="tf-mod-f" noValidate onSubmit={(e) => { e.preventDefault(); const c = parseCents(amt); if (!(c > 0)) return setErr('Enter an amount greater than $0.00.'); onSave(c); }}>
        <TextField id="tf-gfa" label="Amount (USD)" value={amt} onChange={(v) => { setAmt(v); setErr(''); }} error={err} inputMode="decimal" placeholder="0.00" hint={`Now ${money(g.saved)} of ${moneyWhole(g.target)}.`} />
        <div className="tf-dlg-a"><Button onClick={onClose}>Cancel</Button><Button variant="primary" type="submit">Add funds</Button></div>
      </form>
    </Modal>
  );
}
