'use client';
import { useState } from 'react';
import { Button, Panel, Segmented, Tabs } from './_dash';
import { TEAM, type Conv, type Priority } from './_inbox';
import { NOTIF_ROWS, PRIORITIES, type Settings } from './_inbox-store';
import CannedEditor, { type Canned } from './_inbox-views-canned';
import { Field, SelectField, Switch, ViewHead } from './_inbox-views-ui';

type Tab = 'canned' | 'sla' | 'assign' | 'notify';
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const num = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s) : NaN);

/** Validation for the SLA table: whole numbers in range, and a lower priority never gets a tighter target than the one above it. */
export function slaErrors(s: Settings) {
  const out: Partial<Record<Priority, { frt?: string; res?: string }>> = {};
  PRIORITIES.forEach((p, i) => {
    const e: { frt?: string; res?: string } = {}; const f = num(s.sla[p].frt), r = num(s.sla[p].res);
    if (!(f >= 1 && f <= 1440)) e.frt = 'Enter whole minutes, 1 to 1440.'; else if (i > 0) { const up = num(s.sla[PRIORITIES[i - 1]!].frt); if (up > f) e.frt = `Cannot be shorter than ${cap(PRIORITIES[i - 1]!)} (${up}m).`; }
    if (!(r >= 1 && r <= 336)) e.res = 'Enter whole hours, 1 to 336.'; else if (i > 0) { const up = num(s.sla[PRIORITIES[i - 1]!].res); if (up > r) e.res = `Cannot be shorter than ${cap(PRIORITIES[i - 1]!)} (${up}h).`; }
    if (e.frt || e.res) out[p] = e;
  });
  return out;
}
export const capErrors = (s: Settings) => TEAM.filter((a) => { const c = num(s.agents[a]!.cap); return !(c >= 1 && c <= 50); });

export interface SettingsProps {
  canned: Canned[]; onCanned: (next: Canned[], msg: string, undo?: Canned[]) => void; draft: Settings; saved: Settings; setDraft: (s: Settings) => void;
  onSave: () => void; onDiscard: () => void; convs: Conv[]; onApplyRules: () => number;
}
export default function SettingsView(p: SettingsProps) {
  const [tab, setTab] = useState<Tab>('canned'); const d = p.draft;
  const dirtySla = JSON.stringify([d.sla, d.bizHours]) !== JSON.stringify([p.saved.sla, p.saved.bizHours]);
  const dirtyAs = JSON.stringify([d.method, d.agents, d.rules]) !== JSON.stringify([p.saved.method, p.saved.agents, p.saved.rules]);
  const dirtyNo = JSON.stringify([d.notif, d.quiet]) !== JSON.stringify([p.saved.notif, p.saved.quiet]);
  const dirty = dirtySla || dirtyAs || dirtyNo;
  const se = slaErrors(d), ce = capErrors(d); const bad = tab === 'sla' ? Object.keys(se).length > 0 : tab === 'assign' ? ce.length > 0 || p.draft.rules.some((r) => !r.tag.trim()) : false;
  const anyBad = Object.keys(se).length > 0 || ce.length > 0;
  const set = (f: (s: Settings) => Settings) => p.setDraft(f(d));
  const tabs = [{ id: 'canned' as const, label: 'Canned replies', count: p.canned.length }, { id: 'sla' as const, label: dirtySla ? 'SLA rules •' : 'SLA rules' }, { id: 'assign' as const, label: dirtyAs ? 'Assignment •' : 'Assignment' }, { id: 'notify' as const, label: dirtyNo ? 'Notifications •' : 'Notifications' }];
  const [newTag, setNewTag] = useState(''); const [tagErr, setTagErr] = useState(''); const [newAgent, setNewAgent] = useState(TEAM[0]!);
  const addRule = () => { const t = newTag.trim().toLowerCase().replace(/\s+/g, '-'); if (!t) return setTagErr('Type the tag this rule matches.'); if (d.rules.some((r) => r.tag === t)) return setTagErr('A rule for this tag already exists.'); setTagErr(''); set((s) => ({ ...s, rules: [...s.rules, { id: `r${s.rules.length + 1}${t}`, tag: t, agent: newAgent }] })); setNewTag(''); };
  const waiting = p.convs.filter((c) => c.status !== 'resolved' && !c.assignee && d.rules.some((r) => c.cust.tags.includes(r.tag))).length;
  return (
    <>
      <ViewHead title="Settings" sub="How your team answers: reusable replies, response targets, routing and alerts.">
        {tab !== 'canned' && <><Button variant="ghost" disabled={!dirty} onClick={p.onDiscard}>Discard</Button><Button variant="primary" disabled={!dirty || anyBad} onClick={p.onSave}>Save changes</Button></>}
      </ViewHead>
      <Tabs label="Settings sections" value={tab} tabs={tabs} onChange={setTab} />
      {tab !== 'canned' && dirty && bad && <p className="tv-banner is-bad" role="status">Fix the highlighted fields to save.</p>}
      {tab !== 'canned' && dirty && !bad && !anyBad && <p className="tv-banner" role="status">You have unsaved changes. They apply to everyone on the team once saved.</p>}
      {tab === 'canned' && <CannedEditor items={p.canned} onChange={p.onCanned} />}
      {tab === 'sla' && (
        <Panel title="Response targets by priority" sub="The clock on each conversation counts down to the first-response target. Reports measure breaches against these." id="sl" flush>
          <div className="tv-tablewrap"><table className="tv-grid">
            <caption className="td-sr">SLA targets by priority</caption>
            <thead><tr><th scope="col">Priority</th><th scope="col">First response (minutes)</th><th scope="col">Resolution (hours)</th></tr></thead>
            <tbody>{PRIORITIES.map((pr) => (
              <tr key={pr}><th scope="row">{cap(pr)}</th>
                <td><Field label={`${cap(pr)} first response, minutes`} error={se[pr]?.frt}>{(a) => <input {...a} inputMode="numeric" value={d.sla[pr].frt} onChange={(e) => set((s) => ({ ...s, sla: { ...s.sla, [pr]: { ...s.sla[pr], frt: e.target.value } } }))} />}</Field></td>
                <td><Field label={`${cap(pr)} resolution, hours`} error={se[pr]?.res}>{(a) => <input {...a} inputMode="numeric" value={d.sla[pr].res} onChange={(e) => set((s) => ({ ...s, sla: { ...s.sla, [pr]: { ...s.sla[pr], res: e.target.value } } }))} />}</Field></td></tr>))}</tbody>
          </table></div>
          <div className="tv-row"><div><b>Count business hours only</b><small>Pause the clock outside Mon to Fri, 08:00 to 18:00 UTC.</small></div><Switch label="Count business hours only" checked={d.bizHours} onChange={(v) => set((s) => ({ ...s, bizHours: v }))} /></div>
        </Panel>
      )}
      {tab === 'assign' && (
        <div className="tv-g2 tv-assign">
          <Panel title="Routing" sub="How new conversations find an owner." id="ar">
            <Segmented label="Routing method" value={d.method} options={[{ id: 'load', label: 'Least busy' }, { id: 'round', label: 'Round robin' }, { id: 'manual', label: 'Manual' }]} onChange={(m) => set((s) => ({ ...s, method: m }))} />
            <p className="tv-hint">{d.method === 'load' ? 'Goes to the available agent with the fewest open conversations.' : d.method === 'round' ? 'Takes turns between available agents.' : 'Stays unassigned until someone picks it up.'}</p>
            <ul className="tv-agents">{TEAM.map((a) => (
              <li key={a}><span><b>{a}</b><small>{p.convs.filter((c) => c.status === 'open' && c.assignee === a).length} open now</small></span>
                <Field label={`${a} open conversation limit`} error={ce.includes(a) ? 'Whole number, 1 to 50.' : undefined}>{(x) => <input {...x} inputMode="numeric" value={d.agents[a]!.cap} onChange={(e) => set((s) => ({ ...s, agents: { ...s.agents, [a]: { ...s.agents[a]!, cap: e.target.value } } }))} />}</Field>
                <Switch label={`${a} is available for new conversations`} checked={d.agents[a]!.on} onChange={(v) => set((s) => ({ ...s, agents: { ...s.agents, [a]: { ...s.agents[a]!, on: v } } }))} /></li>))}</ul>
          </Panel>
          <Panel title="Rules by tag" sub="The first rule whose tag matches the customer wins." id="au"
            actions={<Button small icon="bolt" disabled={!waiting || dirtyAs} onClick={() => p.onApplyRules()} label="Apply rules to unassigned conversations">{`Apply to ${waiting} waiting`}</Button>}>
            <ul className="tv-rules">{d.rules.map((r) => (
              <li key={r.id}><span className="ti-chip">{r.tag}</span><span className="td-muted">assign to</span>
                <SelectField value={r.agent} label={`Agent for tag ${r.tag}`} onChange={(v) => set((s) => ({ ...s, rules: s.rules.map((x) => (x.id === r.id ? { ...x, agent: v } : x)) }))} options={TEAM.map((a) => ({ id: a, label: a }))} />
                <button type="button" className="tv-x" aria-label={`Remove rule for ${r.tag}`} onClick={() => set((s) => ({ ...s, rules: s.rules.filter((x) => x.id !== r.id) }))}>×</button></li>))}
              {!d.rules.length && <li className="tv-quiet">No rules. Conversations follow the routing method.</li>}</ul>
            <form className="tv-rule-f" onSubmit={(e) => { e.preventDefault(); addRule(); }} noValidate>
              <Field label="Tag" error={tagErr}>{(a) => <input {...a} value={newTag} placeholder="e.g. vip" onChange={(e) => { setNewTag(e.target.value); setTagErr(''); }} />}</Field>
              <SelectField value={newAgent} onChange={setNewAgent} label="Assign new rule to" options={TEAM.map((a) => ({ id: a, label: a }))} />
              <Button type="submit" small>Add rule</Button>
            </form>
            {dirtyAs && <p className="tv-hint">Save changes before applying rules.</p>}
          </Panel>
        </div>
      )}
      {tab === 'notify' && (
        <Panel title="Notify me when" sub="Choose where each alert reaches you." id="nf" flush>
          <div className="tv-tablewrap"><table className="tv-grid tv-notif">
            <caption className="td-sr">Notification channels</caption>
            <thead><tr><th scope="col">Event</th><th scope="col">Email</th><th scope="col">Desktop</th><th scope="col">Mobile</th></tr></thead>
            <tbody>{NOTIF_ROWS.map((r) => (
              <tr key={r.id}><th scope="row"><b>{r.label}</b><small>{r.hint}</small></th>
                {(['email', 'desktop', 'mobile'] as const).map((ch) => <td key={ch}><Switch label={`${r.label}: ${ch}`} checked={d.notif[r.id]![ch]} onChange={(v) => set((s) => ({ ...s, notif: { ...s.notif, [r.id]: { ...s.notif[r.id]!, [ch]: v } } }))} /></td>)}</tr>))}</tbody>
          </table></div>
          <div className="tv-row"><div><b>Quiet hours</b><small>Mute desktop and mobile alerts from 20:00 to 08:00 your time. Urgent SLA alerts still come through.</small></div><Switch label="Quiet hours" checked={d.quiet} onChange={(v) => set((s) => ({ ...s, quiet: v }))} /></div>
        </Panel>
      )}
    </>
  );
}
