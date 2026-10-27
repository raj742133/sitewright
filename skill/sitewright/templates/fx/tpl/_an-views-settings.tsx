'use client';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, Glyph, Pill } from './_dash';
import { Field, Head, Toggle, type Notify } from './_an-ui';
import Team, { Confirm, type Member } from './_an-settings-team';

export const SITE = 'fieldnote.dev';
export interface SiteSettings { domains: string[]; retention: string; opts: { outbound: boolean; dnt: boolean; hash: boolean }; members: Member[]; deleted: boolean; resetQueued: boolean; verified: boolean }
export const SEED_SETTINGS: SiteSettings = {
  domains: [SITE, `www.${SITE}`, `docs.${SITE}`, `staging.${SITE}`], retention: '24', opts: { outbound: true, dnt: true, hash: false }, deleted: false, resetQueued: false, verified: false,
  members: [{ id: 'marcus', name: 'Marcus Hale', email: 'marcus@fieldnote.dev', role: 'Owner' }, { id: 'dana', name: 'Dana Ortiz', email: 'dana@fieldnote.dev', role: 'Admin' }, { id: 'priya', name: 'Priya Raman', email: 'priya@fieldnote.dev', role: 'Analyst' }, { id: 'tomas', name: 'Tomás Ibarra', email: 'tomas@fieldnote.dev', role: 'Viewer' }, { id: 'lena', name: 'Lena Fischer', email: 'lena@studio-nord.de', role: 'Viewer', invited: true }],
};
const RETENTION = [{ v: '3', l: '3 months' }, { v: '12', l: '12 months' }, { v: '24', l: '24 months' }, { v: '0', l: 'Keep forever' }];
const retLabel = (v: string) => RETENTION.find((r) => r.v === v)!.l;
const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

const Section = ({ title, text, children, danger }: { title: string; text: string; children: ReactNode; danger?: boolean }) => (
  <section className={danger ? 'ta-sec is-danger' : 'ta-sec'}><div className="ta-sec-h"><h2>{title}</h2><p>{text}</p></div><div className="ta-sec-b">{children}</div></section>
);

function Snippet({ s, set, notify }: { s: SiteSettings; set: (f: (s: SiteSettings) => SiteSettings) => void; notify: Notify }) {
  const [copied, setCopied] = useState(false); const [busy, setBusy] = useState(false);
  const attrs = [`data-domain="${SITE}"`, s.opts.outbound && 'data-outbound="true"', s.opts.dnt && 'data-dnt="true"', s.opts.hash && 'data-hash="true"'].filter(Boolean).map((a) => `\n  ${a}`).join('');
  const code = `<script defer${attrs}\n  src="https://cdn.fieldnote.dev/v2/track.js"></script>`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch { const t = document.createElement('textarea'); t.value = code; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch { /* ignore */ } t.remove(); }
    setCopied(true); notify('Tracking snippet copied to the clipboard.'); setTimeout(() => setCopied(false), 2000);
  };
  const verify = () => { setBusy(true); setTimeout(() => { setBusy(false); set((x) => ({ ...x, verified: true })); notify('Snippet found on fieldnote.dev. Events are arriving.'); }, 900); };
  const opt = (k: 'outbound' | 'dnt' | 'hash', label: string) => <Toggle checked={s.opts[k]} onChange={(v) => set((x) => ({ ...x, opts: { ...x.opts, [k]: v } }))} label={label} />;
  return (
    <>
      <div className="ta-code"><pre tabIndex={0} aria-label="Tracking snippet"><code>{code}</code></pre><Button small onClick={copy} icon={copied ? 'check' : 'file'}>{copied ? 'Copied' : 'Copy'}</Button></div>
      <div className="ta-opts">{opt('outbound', 'Track outbound links')}{opt('dnt', 'Respect Do Not Track')}{opt('hash', 'Hash-based routing')}</div>
      <div className="ta-status">{s.verified ? <Pill tone="ok">Receiving data · last event 12 seconds ago</Pill> : <Pill tone="warn">Not verified yet</Pill>}<Button small onClick={verify} disabled={busy}>{busy ? 'Checking…' : s.verified ? 'Verify again' : 'Verify installation'}</Button></div>
    </>
  );
}

function Domains({ s, set, notify }: { s: SiteSettings; set: (f: (s: SiteSettings) => SiteSettings) => void; notify: Notify }) {
  const [v, setV] = useState(''); const [err, setErr] = useState('');
  const add = (e: FormEvent) => {
    e.preventDefault(); const d = v.trim().toLowerCase();
    if (!d) return setErr('Enter a domain, for example app.fieldnote.dev.');
    if (/^https?:\/\//.test(d) || d.includes('/')) return setErr('Use the bare domain, without https:// or a path.');
    if (!DOMAIN_RE.test(d)) return setErr('That does not look like a valid domain.');
    if (s.domains.includes(d)) return setErr('This domain is already allowed.');
    if (s.domains.length >= 10) return setErr('You can allow up to 10 domains.');
    set((x) => ({ ...x, domains: [...x.domains, d] })); setV(''); setErr(''); notify(`${d} can now send events.`);
  };
  const del = (d: string) => { const i = s.domains.indexOf(d); set((x) => ({ ...x, domains: x.domains.filter((y) => y !== d) })); notify(`Removed ${d}.`, () => set((x) => ({ ...x, domains: [...x.domains.slice(0, i), d, ...x.domains.slice(i)] }))); };
  return (
    <>
      <ul className="ta-domains">{s.domains.map((d) => <li key={d}><Glyph name="globe" size={14} /><span className="td-mono">{d}</span>{d === SITE ? <Pill tone="info" dot={false}>Primary</Pill> : <Button small variant="ghost" icon="x" label={`Remove ${d}`} onClick={() => del(d)} />}</li>)}</ul>
      <form className="ta-add" onSubmit={add} noValidate><Field label="Add a domain" error={err} hint="Events from other domains are ignored." render={(p) => <input {...p} value={v} onChange={(e) => { setV(e.target.value); setErr(''); }} placeholder="app.fieldnote.dev" autoComplete="off" spellCheck={false} />} /><Button type="submit">Add domain</Button></form>
    </>
  );
}

export default function SettingsView({ s, set, notify, focus }: { s: SiteSettings; set: (f: (s: SiteSettings) => SiteSettings) => void; notify: Notify; focus: boolean }) {
  const [ret, setRet] = useState(s.retention); const [dlg, setDlg] = useState<'reset' | 'delete' | null>(null);
  const shorter = ret !== '0' && (s.retention === '0' || Number(ret) < Number(s.retention));
  const setMembers = (f: (m: Member[]) => Member[]) => set((x) => ({ ...x, members: f(x.members) }));
  return (
    <>
      <Head title="Settings" sub={`${SITE} · site ID fn_8k2q41`} focus={focus} />
      <div className="ta-settings">
        <Section title="Tracking snippet" text="Paste this in the head of every page. Options below change the snippet."><Snippet s={s} set={set} notify={notify} /></Section>
        <Section title="Allowed domains" text="Only events from these domains are counted."><Domains s={s} set={set} notify={notify} /></Section>
        <Section title="Data retention" text="How long raw events are kept. Aggregated reports are always kept.">
          <div className="ta-ret"><Field label="Keep events for" hint={shorter ? `Events older than ${retLabel(ret).toLowerCase()} will be deleted within 24 hours.` : `Currently keeping events for ${retLabel(s.retention).toLowerCase()}.`} render={(p) => <select {...p} value={ret} onChange={(e) => setRet(e.target.value)}>{RETENTION.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select>} />
            <Button variant="primary" disabled={ret === s.retention} onClick={() => { set((x) => ({ ...x, retention: ret })); notify(`Retention set to ${retLabel(ret).toLowerCase()}.`); }}>Save</Button>
            {ret !== s.retention && <Button variant="ghost" onClick={() => setRet(s.retention)}>Reset</Button>}</div>
        </Section>
        <Section title="Team" text="People who can open this site. Roles control what they can change."><Team members={s.members} setMembers={setMembers} notify={notify} /></Section>
        <Section danger title="Danger zone" text="These actions affect every member of the team.">
          <ul className="ta-danger">
            <li><div><b>Reset all statistics</b><p>{s.resetQueued ? 'A reset is queued and finishes within 24 hours.' : 'Deletes every pageview and event. Goals and settings stay.'}</p></div>{s.resetQueued ? <Button onClick={() => { set((x) => ({ ...x, resetQueued: false })); notify('Reset cancelled. Nothing was deleted.'); }}>Cancel reset</Button> : <button type="button" className="td-btn is-danger-o" onClick={() => setDlg('reset')}>Reset statistics</button>}</li>
            <li><div><b>Delete this site</b><p>Removes {SITE}, its goals and its data permanently.</p></div><button type="button" className="td-btn is-danger-o" onClick={() => setDlg('delete')}>Delete site</button></li>
          </ul>
        </Section>
      </div>
      {dlg === 'reset' && <Confirm title="Reset all statistics?" text="Every pageview and event for this site will be deleted. You can cancel the reset for 24 hours." action="Queue reset" phrase={SITE} onClose={() => setDlg(null)} onConfirm={() => { set((x) => ({ ...x, resetQueued: true })); setDlg(null); notify('Reset queued. You can cancel it for 24 hours.'); }} />}
      {dlg === 'delete' && <Confirm title="Delete fieldnote.dev?" text="The site, its goals and all of its data will be removed. This cannot be undone after 24 hours." action="Delete site" phrase={SITE} onClose={() => setDlg(null)} onConfirm={() => { set((x) => ({ ...x, deleted: true })); setDlg(null); notify('Site deleted.', () => set((x) => ({ ...x, deleted: false }))); }} />}
    </>
  );
}
