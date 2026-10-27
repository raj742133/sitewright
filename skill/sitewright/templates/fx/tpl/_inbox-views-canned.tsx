'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Panel, cx } from './_dash';
import { Ico } from './_inbox';
import { Field } from './_inbox-views-ui';

export interface Canned { id: string; label: string; text: string }
/** Create, edit and delete canned replies. Saves immediately (they are shared snippets, not a settings form) and says so with a toast. */
export default function CannedEditor({ items, onChange }: { items: Canned[]; onChange: (next: Canned[], msg: string, undo?: Canned[]) => void }) {
  const [sel, setSel] = useState<string>(items[0]?.id ?? 'new'); const cur = items.find((c) => c.id === sel);
  const [label, setLabel] = useState(cur?.label ?? ''); const [text, setText] = useState(cur?.text ?? ''); const [err, setErr] = useState<{ label?: string; text?: string }>({});
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { const c = items.find((x) => x.id === sel); setLabel(c?.label ?? ''); setText(c?.text ?? ''); setErr({}); }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = (cur?.label ?? '') !== label || (cur?.text ?? '') !== text;
  const validate = () => {
    const e: { label?: string; text?: string } = {}; const l = label.trim(), t = text.trim();
    if (!l) e.label = 'Give the reply a name so agents can find it.'; else if (l.length > 40) e.label = `Keep the name under 40 characters (${l.length}).`; else if (items.some((c) => c.id !== sel && c.label.toLowerCase() === l.toLowerCase())) e.label = 'Another canned reply already has this name.';
    if (!t) e.text = 'The reply cannot be empty.'; else if (t.length < 10) e.text = 'Write at least a full sentence (10 characters).'; else if (t.length > 800) e.text = `Keep it under 800 characters (${t.length}).`;
    setErr(e); return !e.label && !e.text;
  };
  const save = () => {
    if (!validate()) return;
    if (cur) { onChange(items.map((c) => (c.id === sel ? { ...c, label: label.trim(), text: text.trim() } : c)), `Saved “${label.trim()}”`); }
    else { const id = `cr${Date.now().toString(36)}${items.length}`; onChange([...items, { id, label: label.trim(), text: text.trim() }], `Created “${label.trim()}”`); setSel(id); }
  };
  const del = () => { if (!cur) return; const next = items.filter((c) => c.id !== sel); onChange(next, `Deleted “${cur.label}”`, items); setSel(next[0]?.id ?? 'new'); };
  return (
    <div className="tv-canned">
      <Panel title="Canned replies" sub={`${items.length} shared with the team`} id="cl" flush actions={<Button small icon="plus" onClick={() => { setSel('new'); setLabel(''); setText(''); setErr({}); setTimeout(() => first.current?.focus(), 0); }}>New reply</Button>}>
        <ul className="tv-cl" aria-label="Canned replies">
          {items.map((c) => <li key={c.id}><button type="button" className={cx(sel === c.id && 'is-sel')} aria-current={sel === c.id ? 'true' : undefined} onClick={() => setSel(c.id)}><b>{c.label}</b><span>{c.text}</span></button></li>)}
          {sel === 'new' && <li><button type="button" className="is-sel" aria-current="true"><b>{label.trim() || 'New reply'}</b><span>Not saved yet</span></button></li>}
          {!items.length && sel !== 'new' && <li className="tv-quiet">No canned replies yet.</li>}
        </ul>
      </Panel>
      <Panel title={cur ? 'Edit reply' : 'New reply'} sub="Use {first} to insert the customer’s first name." id="ce"
        actions={cur ? <Button small variant="ghost" icon="x" onClick={del} label={`Delete ${cur.label}`}>Delete</Button> : undefined}>
        <form className="tv-form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <Field label="Name" error={err.label}>{(a) => <input {...a} ref={first} value={label} maxLength={80} onChange={(e) => { setLabel(e.target.value); if (err.label) setErr({ ...err, label: undefined }); }} placeholder="e.g. Refund issued" />}</Field>
          <Field label="Message" error={err.text} hint={`${text.trim().length} / 800`}>{(a) => <textarea {...a} rows={6} value={text} onChange={(e) => { setText(e.target.value); if (err.text) setErr({ ...err, text: undefined }); }} placeholder="Hi {first}, …" />}</Field>
          <div className="tv-preview"><span><Ico name="bolt" size={12} />Preview for Maya</span><p>{text.trim() ? text.replace(/\{first\}/g, 'Maya') : 'Your message appears here.'}</p></div>
          <div className="tv-form-a"><Button type="submit" variant="primary">{cur ? 'Save changes' : 'Create reply'}</Button>{cur && dirty && <Button variant="ghost" onClick={() => { setLabel(cur.label); setText(cur.text); setErr({}); }}>Revert</Button>}</div>
        </form>
      </Panel>
    </div>
  );
}
