'use client';
// Settings: the pipeline stages editor (rename, reorder with the keyboard, win probability), display currency, quotas and monthly
// phasing, and the large-deal threshold. Validated inline; saving changes the board, forecast, deals table and reports at once.
import { useMemo, useState, type KeyboardEvent } from 'react';
import { Button, Glyph, Panel, Pill } from './_dash';
import { DEALS, REPS, summarize, type Stage, type StageId } from './_sales';
import { CURS, DEFAULT_CFG, MONTHS, mkFm, teamQuota, useCfg, type Cfg, type Cur } from './_sales-store';
import { Field, ViewHead } from './_sales-ui';

interface Draft { order: StageId[]; names: Record<string, string>; probs: Record<string, string>; cur: Cur; quotas: Record<string, string>; phasing: string[]; large: string }
const toDraft = (c: Cfg): Draft => ({ order: c.stages.filter((s) => s.id !== 'won').map((s) => s.id), names: Object.fromEntries(c.stages.map((s) => [s.id, s.label])), probs: Object.fromEntries(c.stages.map((s) => [s.id, String(s.p)])), cur: c.cur, quotas: Object.fromEntries(Object.entries(c.quotas).map(([k, v]) => [k, String(v)])), phasing: c.phasing.map(String), large: String(c.large) });
const int = (v: string) => (/^\s*\d+\s*$/.test(v) ? Number(v) : NaN);

function validate(d: Draft): { errs: Record<string, string>; cfg: Cfg | null } {
  const errs: Record<string, string> = {}; const seen = new Map<string, string>(); const ids = [...d.order, 'won' as StageId];
  for (const id of ids) { const n = (d.names[id] ?? '').trim(); const k = n.toLowerCase(); if (!n) errs[`n-${id}`] = 'Give the stage a name.'; else if (n.length > 20) errs[`n-${id}`] = 'Keep names to 20 characters.'; else if (seen.has(k)) errs[`n-${id}`] = `Already used by ${seen.get(k)}.`; else seen.set(k, n); }
  let prev = 0, prevName = '';
  for (const id of d.order) { const p = int(d.probs[id] ?? ''); if (Number.isNaN(p) || p < 1 || p > 99) errs[`p-${id}`] = 'Enter a whole number from 1 to 99.'; else if (p < prev) errs[`p-${id}`] = `At least ${prev}%, the same as ${prevName}.`; else { prev = p; prevName = d.names[id]!.trim(); } }
  for (const r of REPS) { const q = int(d.quotas[r.name] ?? ''); if (Number.isNaN(q) || q < 10000 || q > 2000000) errs[`q-${r.name}`] = 'Whole dollars, 10,000 to 2,000,000.'; }
  const ph = d.phasing.map(int); ph.forEach((v, i) => { if (Number.isNaN(v) || v < 0 || v > 100) errs[`ph-${i}`] = '0 to 100.'; });
  if (!ph.some(Number.isNaN) && ph.reduce((a, b) => a + b, 0) !== 100) errs.phsum = `Months add up to ${ph.reduce((a, b) => a + b, 0)}%. They must total 100%.`;
  const large = int(d.large); if (Number.isNaN(large) || large < 10000) errs.large = 'Whole dollars, at least 10,000.';
  if (Object.keys(errs).length) return { errs, cfg: null };
  const stages: Stage[] = ids.map((id) => ({ id, label: d.names[id]!.trim(), p: id === 'won' ? 100 : int(d.probs[id]!) }));
  return { errs, cfg: { stages, cur: d.cur, quotas: Object.fromEntries(REPS.map((r) => [r.name, int(d.quotas[r.name]!)])), phasing: ph as [number, number, number], large } };
}

export function SettingsView({ headRef, onSave, announce }: { headRef: React.Ref<HTMLHeadingElement>; onSave: (c: Cfg) => void; announce: (t: string) => void }) {
  const { cfg } = useCfg(); const [draft, setDraft] = useState<Draft>(() => toDraft(cfg)); const [tried, setTried] = useState(false); const [confirm, setConfirm] = useState(false);
  const { errs, cfg: next } = useMemo(() => validate(draft), [draft]); const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(cfg)); const nErr = Object.keys(errs).length;
  const set = (p: Partial<Draft>) => { setDraft((d) => ({ ...d, ...p })); setTried(false); };
  const show = (k: string) => (tried || (draft && touched.has(k)) ? errs[k] : undefined);
  const [touched, setTouched] = useState<Set<string>>(new Set()); const blur = (k: string) => setTouched((t) => new Set(t).add(k));
  const move = (i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= draft.order.length) return; const o = [...draft.order]; [o[i], o[j]] = [o[j]!, o[i]!]; set({ order: o }); announce(`${draft.names[o[j]!]} moved to position ${j + 1} of ${o.length}`); };
  const key = (e: KeyboardEvent, i: number) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); move(i, e.key === 'ArrowUp' ? -1 : 1); } };
  const save = () => { setTried(true); if (!next) { announce(`${nErr} ${nErr === 1 ? 'field needs' : 'fields need'} attention`); requestAnimationFrame(() => document.querySelector<HTMLElement>('.tv-set [aria-invalid="true"]')?.focus()); return; } onSave(next); setTouched(new Set()); setTried(false); };
  const before = summarize(DEALS, 0, cfg.stages).weighted, after = next ? summarize(DEALS, 0, next.stages).weighted : null; const fm = mkFm(next?.cur ?? cfg.cur);
  const ids = [...draft.order, 'won' as StageId];
  return (
    <>
      <ViewHead ref={headRef} title="Settings" sub="Pipeline stages, currency and Q4 targets. Changes apply to every view when you save." />
      <div className="tv-set">
        <div className="tv-setmain">
          <Panel id="tv-ss" title="Pipeline stages" sub="Rename a stage, set its win probability, and reorder with the arrow keys on the handle. Won always closes the pipeline.">
            <ol className="tv-stages">
              {ids.map((id, i) => { const won = id === 'won'; const nd = DEALS.filter((d) => d.stage === id).length; return (
                <li key={id} className="tv-strow">
                  <span className="tv-pos" aria-hidden="true">{i + 1}</span>
                  {won ? <span className="tv-handle is-off" aria-hidden="true"><Glyph name="check" size={14} /></span> : <button type="button" className="tv-handle" aria-label={`Reorder ${draft.names[id]}, position ${i + 1} of ${draft.order.length}. Use the up and down arrow keys.`} onKeyDown={(e) => key(e, i)}><Glyph name="list" size={14} /></button>}
                  <Field label="Stage name" error={show(`n-${id}`)}>{(a) => <input {...a} value={draft.names[id]} onBlur={() => blur(`n-${id}`)} onChange={(e) => set({ names: { ...draft.names, [id]: e.target.value } })} autoComplete="off" />}</Field>
                  <Field label="Win probability" error={show(`p-${id}`)}>{(a) => won ? <input {...a} value="100" disabled aria-label="Win probability, fixed at 100 percent" /> : <span className="tv-pct"><input {...a} inputMode="numeric" value={draft.probs[id]} onBlur={() => blur(`p-${id}`)} onChange={(e) => set({ probs: { ...draft.probs, [id]: e.target.value } })} /><em>%</em></span>}</Field>
                  <span className="tv-stn">{nd} {nd === 1 ? 'deal' : 'deals'}</span>
                  {won ? <span className="tv-mv" aria-hidden="true" /> : <span className="tv-mv"><Button small variant="ghost" icon="up" label={`Move ${draft.names[id]} up`} disabled={i === 0} onClick={() => move(i, -1)} /><Button small variant="ghost" icon="down" label={`Move ${draft.names[id]} down`} disabled={i === draft.order.length - 1} onClick={() => move(i, 1)} /></span>}
                </li>); })}
            </ol>
          </Panel>
          <Panel id="tv-sc" title="Currency and targets" sub="Targets are entered in US dollars. The currency changes how amounts are shown everywhere.">
            <div className="tv-grid">
              <Field label="Display currency" hint={`${CURS[draft.cur].name}${draft.cur === 'USD' ? '' : `, 1 USD = ${CURS[draft.cur].rate} ${draft.cur} (fixed for the quarter)`}`}>{(a) => <select {...a} value={draft.cur} onChange={(e) => set({ cur: e.target.value as Cur })}>{(Object.keys(CURS) as Cur[]).map((c) => <option key={c} value={c}>{c} · {CURS[c].sym}</option>)}</select>}</Field>
              <Field label="Large-deal threshold (USD)" error={show('large')} hint="Deals at or above this amount are flagged as large.">{(a) => <input {...a} inputMode="numeric" value={draft.large} onBlur={() => blur('large')} onChange={(e) => set({ large: e.target.value })} />}</Field>
            </div>
            <h3 className="tv-sub">Q4 quota by rep (USD)</h3>
            <div className="tv-grid is-3">{REPS.map((r) => <Field key={r.name} label={r.name} error={show(`q-${r.name}`)}>{(a) => <input {...a} inputMode="numeric" value={draft.quotas[r.name]} onBlur={() => blur(`q-${r.name}`)} onChange={(e) => set({ quotas: { ...draft.quotas, [r.name]: e.target.value } })} />}</Field>)}</div>
            <h3 className="tv-sub">Monthly phasing of the team target</h3>
            <div className="tv-grid is-3">{MONTHS.map((m, i) => <Field key={m} label={`${m} (%)`} error={show(`ph-${i}`)}>{(a) => <input {...a} inputMode="numeric" value={draft.phasing[i]} aria-describedby={errs.phsum && show('phsum') ? 'tv-phsum' : a['aria-describedby']} onBlur={() => blur(`ph-${i}`)} onChange={(e) => set({ phasing: draft.phasing.map((v, k) => (k === i ? e.target.value : v)) })} />}</Field>)}</div>
            {show('phsum') && <p id="tv-phsum" className="tv-err">{errs.phsum}</p>}
          </Panel>
        </div>
        <aside className="tv-setside" aria-label="Preview">
          <Panel id="tv-sp" title="Board preview" sub="How the pipeline reads with these settings">
            <ol className="tv-prev">{ids.map((id) => <li key={id}><i className={`ts-sd is-${id}`} aria-hidden="true" /><span>{draft.names[id]?.trim() || '—'}</span><b>{id === 'won' ? 'Won' : `${draft.probs[id] || '—'}%`}</b></li>)}</ol>
            <dl className="tv-facts is-col">
              <div><dt>Weighted open pipeline</dt><dd>{after === null ? 'Fix the errors to preview' : <>{fm.m(after)} {Math.abs(after - before) >= 1 && <Pill tone={after > before ? 'ok' : 'warn'} dot={false}>{after > before ? '+' : '−'}{fm.m(Math.abs(after - before))}</Pill>}</>}</dd></div>
              <div><dt>Team quota</dt><dd>{fm.m(next ? teamQuota(next) : teamQuota(cfg))}</dd></div>
              <div><dt>Monthly target</dt><dd>{next ? next.phasing.map((p, i) => `${MONTHS[i]} ${fm.k((teamQuota(next) * p) / 100)}`).join(' · ') : '—'}</dd></div>
            </dl>
          </Panel>
        </aside>
      </div>
      <div className="tv-savebar" role="region" aria-label="Save settings">
        <span className="tv-savest" role="status" aria-live="polite">{tried && nErr ? <span className="tv-err">{nErr} {nErr === 1 ? 'field needs' : 'fields need'} attention</span> : dirty ? <><i className="tv-unsaved" aria-hidden="true" />Unsaved changes</> : 'All changes saved'}</span>
        <span className="tv-grow" />
        {confirm ? <span className="tv-confirm" role="alertdialog" aria-label="Reset settings"><span>Reset every setting to its default?</span><Button small variant="primary" onClick={() => { set(toDraft(DEFAULT_CFG)); setConfirm(false); setTouched(new Set()); announce('Settings reset to defaults. Save to apply.'); }}>Reset</Button><Button small variant="ghost" onClick={() => setConfirm(false)}>Keep</Button></span> : <Button variant="ghost" onClick={() => setConfirm(true)}>Reset to defaults</Button>}
        <Button disabled={!dirty} onClick={() => { setDraft(toDraft(cfg)); setTried(false); setTouched(new Set()); announce('Changes discarded'); }}>Discard</Button>
        <Button variant="primary" disabled={!dirty} onClick={save}>Save changes</Button>
      </div>
    </>
  );
}
