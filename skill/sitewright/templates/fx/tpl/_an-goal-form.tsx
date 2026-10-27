'use client';
import { useRef, useState, type FormEvent } from 'react';
import { Button } from './_dash';
import { Field, Modal } from './_an-ui';
import { TYPE_LABEL, baseFor, type Goal, type GoalType } from './_an-goals-data';

interface Draft { name: string; type: GoalType; target: string; rate: string; value: string }
type Errors = Partial<Record<keyof Draft, string>>;
const HINT: Record<GoalType, string> = { page: 'A path that starts with /, for example /pricing', event: 'An event name in snake_case, for example demo_booked', time: 'Minutes on site, from 1 to 60' };

function validate(d: Draft, goals: Goal[], editing?: string): Errors {
  const e: Errors = {}; const name = d.name.trim();
  if (name.length < 2) e.name = 'Give the goal a name of at least 2 characters.'; else if (name.length > 40) e.name = 'Keep the name under 40 characters.';
  else if (goals.some((g) => g.id !== editing && g.name.toLowerCase() === name.toLowerCase())) e.name = 'A goal with this name already exists.';
  const t = d.target.trim();
  if (!t) e.target = 'Enter what counts as a conversion.';
  else if (d.type === 'page' && !/^\/[\w\-./]*$/.test(t)) e.target = 'Paths start with / and contain no spaces.';
  else if (d.type === 'event' && !/^[a-z][a-z0-9_]{2,39}$/.test(t)) e.target = 'Use 3 to 40 lowercase letters, digits or underscores.';
  else if (d.type === 'time' && !(Number(t) >= 1 && Number(t) <= 60)) e.target = 'Enter a number of minutes between 1 and 60.';
  const r = Number(d.rate); if (d.rate.trim() === '' || Number.isNaN(r) || r < 0.1 || r > 100) e.rate = 'Enter a target rate between 0.1 and 100.';
  if (d.value.trim() !== '' && !(Number(d.value) >= 0 && Number(d.value) <= 100000)) e.value = 'Enter an amount of 0 or more, or leave it empty.';
  return e;
}

export default function GoalForm({ goal, goals, onSave, onClose }: { goal?: Goal; goals: Goal[]; onSave: (g: Goal) => void; onClose: () => void }) {
  const [d, setD] = useState<Draft>({ name: goal?.name ?? '', type: goal?.type ?? 'event', target: goal?.target ?? '', rate: goal ? String(+(goal.targetRate * 100).toFixed(2)) : '', value: goal ? String(goal.value || '') : '' });
  const [err, setErr] = useState<Errors>({}); const [touched, setTouched] = useState(false); const ref = useRef<HTMLFormElement>(null);
  const set = (k: keyof Draft, v: string) => { const n = { ...d, [k]: v }; setD(n); if (touched) setErr(validate(n, goals, goal?.id)); };
  const submit = (ev: FormEvent) => {
    ev.preventDefault(); const e = validate(d, goals, goal?.id); setErr(e); setTouched(true);
    const bad = Object.keys(e)[0]; if (bad) { (ref.current?.elements.namedItem(bad) as HTMLElement | null)?.focus(); return; }
    const type = d.type, target = d.target.trim();
    onSave({ ...(goal ?? { id: `g${goals.length + 1}-${target.replace(/\W+/g, '').slice(0, 8)}` }), name: d.name.trim(), type, target, targetRate: Number(d.rate) / 100, value: Number(d.value || 0), base: goal && goal.type === type && goal.target === target ? goal.base : baseFor({ type, target }) });
  };
  const n = Object.keys(err).length;
  return (
    <Modal title={goal ? `Edit goal` : 'Add a goal'} onClose={onClose}>
      <form ref={ref} onSubmit={submit} noValidate className="ta-form">
        {n > 0 && <p className="ta-err ta-sum" role="alert">{n} {n === 1 ? 'field needs' : 'fields need'} attention.</p>}
        <Field label="Name" error={err.name} render={(p) => <input {...p} name="name" data-autofocus value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Start free trial" autoComplete="off" />} />
        <div className="ta-two">
          <Field label="Type" render={(p) => <select {...p} name="type" value={d.type} onChange={(e) => set('type', e.target.value)}>{(Object.keys(TYPE_LABEL) as GoalType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select>} />
          <Field label={d.type === 'page' ? 'Page path' : d.type === 'event' ? 'Event name' : 'Minutes'} hint={HINT[d.type]} error={err.target} render={(p) => <input {...p} name="target" value={d.target} onChange={(e) => set('target', e.target.value)} inputMode={d.type === 'time' ? 'numeric' : 'text'} autoComplete="off" />} />
        </div>
        <div className="ta-two">
          <Field label="Target conversion rate (%)" hint="The goal is on target at or above this" error={err.rate} render={(p) => <input {...p} name="rate" value={d.rate} onChange={(e) => set('rate', e.target.value)} inputMode="decimal" placeholder="3.0" />} />
          <Field label="Value per conversion ($)" hint="Optional, used for revenue totals" error={err.value} render={(p) => <input {...p} name="value" value={d.value} onChange={(e) => set('value', e.target.value)} inputMode="decimal" placeholder="0" />} />
        </div>
        <footer><Button onClick={onClose}>Cancel</Button><Button variant="primary" type="submit">{goal ? 'Save changes' : 'Add goal'}</Button></footer>
      </form>
    </Modal>
  );
}
