'use client';
import { useState, type FormEvent } from 'react';
import { Avatar, Button, Pill } from './_dash';
import { Field, Modal, type Notify } from './_an-ui';

export type Role = 'Owner' | 'Admin' | 'Analyst' | 'Viewer';
export interface Member { id: string; name: string; email: string; role: Role; invited?: boolean }
export const ROLES: Role[] = ['Admin', 'Analyst', 'Viewer'];
const ROLE_HINT: Record<Role, string> = { Owner: 'Full control, billing and deletion', Admin: 'Manage settings, goals and team', Analyst: 'Edit goals, view everything', Viewer: 'Read-only access' };

/** A confirmation dialog. With `phrase` the person must type it first (for irreversible actions). */
export function Confirm({ title, text, action, phrase, onConfirm, onClose }: { title: string; text: string; action: string; phrase?: string; onConfirm: () => void; onClose: () => void }) {
  const [v, setV] = useState(''); const ok = !phrase || v.trim() === phrase;
  return (
    <Modal title={title} onClose={onClose}>
      <form className="ta-form" onSubmit={(e) => { e.preventDefault(); if (ok) onConfirm(); }}>
        <p className="ta-hint is-body">{text}</p>
        {phrase && <Field label={`Type ${phrase} to confirm`} render={(p) => <input {...p} data-autofocus value={v} onChange={(e) => setV(e.target.value)} autoComplete="off" spellCheck={false} />} />}
        <footer><Button onClick={onClose}>Cancel</Button><button type="submit" className="td-btn is-danger" disabled={!ok} data-autofocus={phrase ? undefined : ''}>{action}</button></footer>
      </form>
    </Modal>
  );
}

export default function Team({ members, setMembers, notify }: { members: Member[]; setMembers: (f: (m: Member[]) => Member[]) => void; notify: Notify }) {
  const [email, setEmail] = useState(''); const [role, setRole] = useState<Role>('Analyst'); const [err, setErr] = useState(''); const [rm, setRm] = useState<Member | null>(null);
  const invite = (e: FormEvent) => {
    e.preventDefault(); const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return setErr('Enter a valid email address, like name@company.com.');
    if (members.some((m) => m.email === v)) return setErr('That person is already on the team.');
    const name = v.split('@')[0]!.split(/[._-]/).map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' ');
    setMembers((l) => [...l, { id: `m-${v}`, name, email: v, role, invited: true }]); setEmail(''); setErr(''); notify(`Invitation sent to ${v}.`);
  };
  return (
    <>
      <ul className="ta-team">
        {members.map((m) => (
          <li key={m.id}>
            <Avatar name={m.name} size={32} />
            <span className="ta-who"><b>{m.name}{m.id === 'dana' && <small> (you)</small>}</b><small>{m.email}</small></span>
            {m.invited && <Pill tone="warn">Invited</Pill>}
            {m.role === 'Owner' || m.id === 'dana' ? <span className="ta-role-fixed" title={ROLE_HINT[m.role]}>{m.role}</span> : (
              <select className="ta-input ta-role" aria-label={`Role for ${m.name}`} value={m.role} onChange={(e) => { const r = e.target.value as Role; setMembers((l) => l.map((x) => (x.id === m.id ? { ...x, role: r } : x))); notify(`${m.name} is now ${r}.`); }}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
            )}
            {m.role === 'Owner' ? <span className="ta-rm-gap" /> : m.id === 'dana' ? <span className="ta-rm-gap" /> : <Button small variant="ghost" icon="x" label={`Remove ${m.name}`} onClick={() => setRm(m)} />}
          </li>
        ))}
      </ul>
      <form className="ta-invite" onSubmit={invite} noValidate>
        <Field label="Invite by email" hint={ROLE_HINT[role]} error={err} render={(p) => <input {...p} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} placeholder="name@company.com" autoComplete="off" />} />
        <div className="ta-field"><label htmlFor="ta-inv-role">Role</label><select id="ta-inv-role" className="ta-input" value={role} onChange={(e) => setRole(e.target.value as Role)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
        <Button type="submit" variant="primary">Send invite</Button>
      </form>
      {rm && <Confirm title={`Remove ${rm.name}?`} text={`${rm.name} will lose access to fieldnote.dev analytics straight away. You can invite them again later.`} action="Remove member" onClose={() => setRm(null)} onConfirm={() => { const m = rm, i = members.indexOf(m); setMembers((l) => l.filter((x) => x.id !== m.id)); setRm(null); notify(`Removed ${m.name}.`, () => setMembers((l) => [...l.slice(0, i), m, ...l.slice(i)])); }} />}
    </>
  );
}
