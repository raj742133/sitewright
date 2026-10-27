'use client';
// Settings: station capacity and shift hours, plant capacity, a reorder point editor and alert thresholds. Every form validates inline
// (aria-invalid, aria-describedby, focus on the first problem) and saves with a toast; saved values drive the other views.
import { useRef, useState, type RefObject } from 'react';
import { Button, Pill, Tabs, cx } from './_dash';
import { STATION_DEFS, money, type StationId, type Thresholds } from './_ops';
import { statusOf } from './_opsinv';
import type { D, Ops, Plant, StationCfg } from './_opsstate';
import { SearchBox, ViewHeader } from './_opsui';

type Tab = 'stations' | 'reorder' | 'alerts';
type Errs = Record<string, string>;
const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);
const hrs = (t: string) => Number(t.slice(0, 2)) + Number(t.slice(3, 5)) / 60;

function Num({ id, v, set, err, label, w }: { id: string; v: string; set: (v: string) => void; err?: string; label: string; w?: number }) {
  return <span className="to-cellf"><input id={id} className="to-in to-num" style={{ width: w }} inputMode="numeric" value={v} aria-label={label} aria-invalid={err ? true : undefined} aria-describedby={err ? `${id}-e` : undefined} onChange={(e) => set(e.target.value)} />{err && <small id={`${id}-e`} className="to-err">{err}</small>}</span>;
}
function focusFirst(root: RefObject<HTMLElement | null>) { requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); }

export function SettingsView({ ops, d, hRef }: { ops: Ops; d: D; hRef: RefObject<HTMLHeadingElement | null> }) {
  const [tab, setTab] = useState<Tab>('stations'); const root = useRef<HTMLDivElement>(null);
  const [cfg, setCfg] = useState(() => Object.fromEntries(STATION_DEFS.map((s) => [s.id, { cap: String(ops.s.cfg[s.id].cap), start: ops.s.cfg[s.id].start, end: ops.s.cfg[s.id].end }])) as Record<StationId, { cap: string; start: string; end: string }>);
  const [plant, setPlant] = useState({ weekday: String(ops.s.plant.weekday), sat: String(ops.s.plant.sat), sun: String(ops.s.plant.sun) });
  const [ro, setRo] = useState<Record<string, string>>({}); const [q, setQ] = useState('');
  const [thr, setThr] = useState({ critDays: String(ops.s.thr.critDays), onTime: String(ops.s.thr.onTime), utilFloor: String(ops.s.thr.utilFloor), queueMax: String(ops.s.thr.queueMax) });
  const [errs, setErrs] = useState<Errs>({});
  const fail = (e: Errs) => { setErrs(e); if (Object.keys(e).length) focusFirst(root); return Object.keys(e).length > 0; };

  const saveStations = () => {
    const e: Errs = {}; const out = {} as Record<StationId, StationCfg>;
    STATION_DEFS.forEach((s) => { const c = cfg[s.id], cap = int(c.cap);
      if (!(cap >= 1 && cap <= 40)) e[`cap-${s.id}`] = 'Whole number, 1 to 40';
      const len = hrs(c.end) - hrs(c.start); if (!c.start) e[`start-${s.id}`] = 'Set a start'; if (!c.end) e[`end-${s.id}`] = 'Set an end'; else if (c.start && !(len >= 4 && len <= 12)) e[`end-${s.id}`] = 'Shift must be 4 to 12 hours, ending after it starts';
      out[s.id] = { cap, start: c.start, end: c.end }; });
    const p = { weekday: int(plant.weekday), sat: int(plant.sat), sun: int(plant.sun) };
    (['weekday', 'sat', 'sun'] as const).forEach((k) => { if (!(p[k] >= 20 && p[k] <= 400)) e[`plant-${k}`] = 'Whole number, 20 to 400'; });
    if (fail(e)) return; ops.A.saveStations(out); ops.A.savePlant(p as Plant); ops.say('Stations and plant capacity saved');
  };
  const roDirty = Object.entries(ro).filter(([sku, v]) => v !== String(d.parts.find((p) => p.sku === sku)!.reorder));
  const saveRo = () => {
    const e: Errs = {}; const m: Record<string, number> = {}; roDirty.forEach(([sku, v]) => { const n = int(v); if (!(n >= 0 && n <= 5000)) e[`ro-${sku}`] = 'Whole number, 0 to 5000'; else m[sku] = n; });
    if (fail(e)) { setQ(''); return; } ops.A.saveReorder(m); setRo({});
  };
  const saveThr = () => {
    const e: Errs = {}; const t = { critDays: int(thr.critDays), onTime: int(thr.onTime), utilFloor: int(thr.utilFloor), queueMax: int(thr.queueMax) };
    if (!(t.critDays >= 1 && t.critDays <= 30)) e.critDays = 'Whole days, 1 to 30'; if (!(t.onTime >= 50 && t.onTime <= 100)) e.onTime = 'Percent, 50 to 100';
    if (!(t.utilFloor >= 10 && t.utilFloor <= 100)) e.utilFloor = 'Percent, 10 to 100'; if (!(t.queueMax >= 5 && t.queueMax <= 200)) e.queueMax = 'Units, 5 to 200';
    if (fail(e)) return; ops.A.saveThr(t as Thresholds);
  };
  const rows = d.parts.filter((p) => !q.trim() || `${p.sku} ${p.name} ${p.supplier}`.toLowerCase().includes(q.trim().toLowerCase()));
  const switchTab = (t: Tab) => { setErrs({}); setTab(t); };
  const nErr = Object.keys(errs).length;
  const tf = (id: StationId, k: 'cap' | 'start' | 'end', v: string) => setCfg((c) => ({ ...c, [id]: { ...c[id], [k]: v } }));
  return (
    <>
      <ViewHeader hRef={hRef} title="Settings" sub="Capacity, reorder points and alert thresholds for the whole workshop" />
      <section className="td-panel" aria-label="Settings" ref={root as RefObject<HTMLElement>}>
        <div className="to-tabbar"><Tabs label="Settings section" value={tab} onChange={switchTab} tabs={[{ id: 'stations', label: 'Stations' }, { id: 'reorder', label: 'Reorder points', count: roDirty.length || undefined }, { id: 'alerts', label: 'Alert thresholds' }]} /></div>
        {nErr > 0 && <p className="to-errsum" role="alert">{nErr === 1 ? '1 field needs attention' : `${nErr} fields need attention`}. Fix the highlighted values and save again.</p>}
        {tab === 'stations' && (
          <div className="to-set">
            <div className="td-tablewrap"><table className="td-table to-tbl">
              <caption className="td-sr">Station capacity and day shift hours</caption>
              <thead><tr><th scope="col">Station</th><th scope="col">Capacity (units / hr, full crew)</th><th scope="col">Shift start</th><th scope="col">Shift end</th><th scope="col" className="hide-sm">Crew</th></tr></thead>
              <tbody>{STATION_DEFS.map((s) => (
                <tr key={s.id}><td><b>{s.name}</b></td>
                  <td><Num id={`to-cap-${s.id}`} v={cfg[s.id].cap} set={(v) => tf(s.id, 'cap', v)} err={errs[`cap-${s.id}`]} label={`${s.name} capacity`} w={72} /></td>
                  <td><span className="to-cellf"><input id={`to-st-${s.id}`} type="time" className="to-in" value={cfg[s.id].start} aria-label={`${s.name} shift start`} aria-invalid={errs[`start-${s.id}`] ? true : undefined} onChange={(e) => tf(s.id, 'start', e.target.value)} /></span></td>
                  <td><span className="to-cellf"><input id={`to-en-${s.id}`} type="time" className="to-in" value={cfg[s.id].end} aria-label={`${s.name} shift end`} aria-invalid={errs[`end-${s.id}`] ? true : undefined} aria-describedby={errs[`end-${s.id}`] ? `to-en-${s.id}-e` : undefined} onChange={(e) => tf(s.id, 'end', e.target.value)} />{errs[`end-${s.id}`] && <small id={`to-en-${s.id}-e`} className="to-err">{errs[`end-${s.id}`]}</small>}</span></td>
                  <td className="hide-sm td-muted">{ops.s.crew[s.id].length} on day shift</td></tr>))}</tbody>
            </table></div>
            <h3 className="to-h3 to-pad">Plant capacity (units shipped per day)</h3>
            <div className="to-row3">{([['weekday', 'Monday to Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']] as const).map(([k, l]) => <label key={k} className="to-field"><span>{l}</span><Num id={`to-plant-${k}`} v={plant[k]} set={(v) => setPlant((p) => ({ ...p, [k]: v }))} err={errs[`plant-${k}`]} label={`${l} capacity`} w={96} /></label>)}</div>
            <div className="to-savebar"><Button variant="primary" onClick={saveStations}>Save stations</Button></div>
          </div>)}
        {tab === 'reorder' && (
          <div className="to-set">
            <div className="to-bar-t to-bar-f"><SearchBox value={q} onChange={setQ} label="Search parts" placeholder="Search SKU, part or supplier" /><span className="to-sel" role="status">{roDirty.length ? `${roDirty.length} unsaved ${roDirty.length === 1 ? 'change' : 'changes'}` : 'No unsaved changes'}</span></div>
            <div className="td-tablewrap to-rowrap"><table className="td-table to-tbl">
              <caption className="td-sr">Reorder points by part</caption>
              <thead><tr><th scope="col">Part</th><th scope="col" className="is-r hide-sm">On hand</th><th scope="col" className="is-r hide-sm">Use / day</th><th scope="col">Reorder point</th><th scope="col">Status</th></tr></thead>
              <tbody>{rows.map((p) => { const v = ro[p.sku] ?? String(p.reorder), n = int(v), st = statusOf({ ...p, reorder: Number.isNaN(n) ? p.reorder : n }, undefined, ops.s.thr.critDays), dirty = v !== String(p.reorder);
                return <tr key={p.sku} className={cx(dirty && 'is-sel')}><td><div className="td-cellmain"><div><b>{p.name}</b><small className="td-mono">{p.sku} · {p.supplier}</small></div></div></td><td className="is-r hide-sm">{p.onHand}</td><td className="is-r hide-sm">{p.perDay}</td>
                  <td><Num id={`ro-${p.sku}`} v={v} set={(x) => setRo((r) => ({ ...r, [p.sku]: x }))} err={errs[`ro-${p.sku}`]} label={`Reorder point for ${p.name}`} w={84} /></td><td><Pill tone={st.tone}>{st.label}</Pill></td></tr>; })}
              {rows.length === 0 && <tr><td colSpan={5} className="td-none">No parts match.</td></tr>}</tbody>
            </table></div>
            <div className="to-savebar"><Button disabled={roDirty.length === 0} onClick={() => { setRo({}); setErrs({}); }}>Discard</Button><Button variant="primary" disabled={roDirty.length === 0} onClick={saveRo}>Save {roDirty.length || ''} {roDirty.length === 1 ? 'change' : 'changes'}</Button></div>
          </div>)}
        {tab === 'alerts' && (
          <div className="to-set to-alerts">
            {([['critDays', 'Critical stock cover', 'days', 'A part with less cover than this shows as Critical.'], ['onTime', 'On-time target', '%', 'Shown on the KPI and the on-time chart.'], ['utilFloor', 'Utilisation floor', '%', 'The overview flags line utilisation below this.'], ['queueMax', 'Station queue limit', 'units', 'Stations with a longer queue are flagged on the board.']] as const).map(([k, l, u, h]) => (
              <div key={k} className="to-field"><label htmlFor={`to-th-${k}`}>{l}</label><span className="to-unit"><Num id={`to-th-${k}`} v={thr[k]} set={(v) => setThr((t) => ({ ...t, [k]: v }))} err={errs[k]} label={l} w={84} /><em>{u}</em></span><small>{h}</small></div>))}
            <div className="to-savebar"><Button variant="primary" onClick={saveThr}>Save thresholds</Button></div>
          </div>)}
      </section>
    </>
  );
}
void money;
