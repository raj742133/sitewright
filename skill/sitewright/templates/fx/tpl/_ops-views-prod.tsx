'use client';
// Production: a station board (one column per station with its queue), then the selected station in detail: cycle time chart, blocked reason with
// unblock / report-block actions, crew roster with reassign, and a shift selector.
import { useState, type RefObject } from 'react';
import { Avatar, Button, Glyph, Pill, Progress, Segmented, cx, fmt, seeded } from './_dash';
import { LABEL, NEXT, SHIFT_CREWS, STATION_DEFS, STATUS_TONE, dateLabel, stationName, type LiveStation, type StationId } from './_ops';
import { BLOCK_REASONS, isLate, units, type D, type Ops } from './_opsstate';
import { LineChart } from './_ops-charts';
import { Field, Modal, Select, ViewHeader, dueInfo } from './_opsui';

type Shift = 'day' | 'evening' | 'night';
const SHIFTS: Array<{ id: Shift; label: string; when: string }> = [{ id: 'day', label: 'Day', when: 'Today, now' }, { id: 'evening', label: 'Evening', when: 'Yesterday' }, { id: 'night', label: 'Night', when: 'Overnight' }];
const hh = (t: string) => Number(t.slice(0, 2));
const FIX = ['Release reserve stock', 'Approve substitute part', 'Fixed on the floor'];

function BlockDialog({ st, ops, mode, onClose }: { st: LiveStation; ops: Ops; mode: 'block' | 'unblock'; onClose: () => void }) {
  const [reason, setReason] = useState(BLOCK_REASONS[0]!); const [detail, setDetail] = useState(''); const [how, setHow] = useState(FIX[0]!); const [err, setErr] = useState('');
  const submit = () => {
    if (mode === 'block') { if (detail.trim().length < 3) { setErr('Describe the problem in a few words.'); return; } ops.A.block(st.id, `${reason}: ${detail.trim()}`); } else ops.A.unblock(st.id, how.toLowerCase());
    onClose();
  };
  return (
    <Modal id="to-blk" title={mode === 'block' ? `Report a block at ${st.name}` : `Unblock ${st.name}`} sub={mode === 'unblock' ? st.reason : 'Parts stop flowing here until it is cleared.'} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>{mode === 'block' ? 'Block station' : 'Unblock station'}</Button></>}>
      {mode === 'block' ? (
        <div className="to-form">
          <Field id="to-blk-r" label="Reason">{(p) => <select {...p} className="to-in" value={reason} onChange={(e) => setReason(e.target.value)}>{BLOCK_REASONS.map((r) => <option key={r}>{r}</option>)}</select>}</Field>
          <Field id="to-blk-d" label="What happened" error={err} help="Shown on the board to the whole line.">{(p) => <input {...p} className="to-in" value={detail} onChange={(e) => { setDetail(e.target.value); setErr(''); }} />}</Field>
        </div>
      ) : (
        <fieldset className="to-radios"><legend>How was it resolved?</legend>{FIX.map((f) => <label key={f}><input type="radio" name="how" checked={how === f} onChange={() => setHow(f)} />{f}</label>)}</fieldset>
      )}
    </Modal>
  );
}

export function ProductionView({ ops, d, hRef, setOpen }: { ops: Ops; d: D; hRef: RefObject<HTMLHeadingElement | null>; setOpen: (id: string) => void }) {
  const [shift, setShift] = useState<Shift>('day'); const [sel, setSel] = useState<StationId>('drivetrain'); const [dlg, setDlg] = useState<'block' | 'unblock' | null>(null);
  const st = d.stations.find((x) => x.id === sel)!, def = STATION_DEFS.find((x) => x.id === sel)!, cfg = ops.s.cfg[sel], blk = ops.s.blocks[sel];
  const start = hh(cfg.start), len = Math.max(2, Math.min(12, hh(cfg.end) - start)); const k = shift === 'day' ? 0 : shift === 'evening' ? 1 : 2;
  const hours = Array.from({ length: len }, (_, i) => `${String((start + k * len + i) % 24).padStart(2, '0')}:00`);
  const stopAt = shift !== 'day' ? len : Math.max(1, Math.min(len, (blk ? 9 : 11) - start + 1));
  const r = seeded(sel.length * 31 + k * 7 + 5);
  const actual = hours.slice(0, stopAt).map((_, i) => Math.round(def.cycle * (1 + (r() - 0.45) * 0.16 + (shift === 'night' ? 0.08 : 0) + (blk && i === stopAt - 1 ? 0.12 : 0)) * 10) / 10);
  const target = Math.round(def.cycle * 0.95 * 10) / 10;
  const crew = shift === 'day' ? st.crew : SHIFT_CREWS[shift === 'evening' ? 'evening' : 'night'][sel];
  const done = Math.round((shift === 'day' ? st.thr || (blk ? target : 0) : st.target * def.eff) * (shift === 'day' ? stopAt : len));
  const queueOrders = (id: StationId) => ops.s.orders.filter((o) => o.status === 'production' && o.stage === id);
  const over = st.q > ops.s.thr.queueMax;
  return (
    <>
      <ViewHeader hRef={hRef} title="Production" sub={`${d.stations.filter((x) => x.status === 'running').length} running · ${d.blocked.length} blocked · ${fmt.n(d.stations.reduce((a, x) => a + x.q, 0))} units in the queue`}>
        <Segmented label="Shift" value={shift} onChange={setShift} options={SHIFTS.map((s) => ({ id: s.id, label: s.label }))} />
      </ViewHeader>
      <section className="td-panel" aria-label="Station board">
        <div className="to-board">
          {d.stations.map((s, i) => {
            const qs = queueOrders(s.id), nx = NEXT[s.id], isBlk = s.status === 'blocked';
            return (
              <div key={s.id} className={cx('to-col', sel === s.id && 'is-on', isBlk && 'is-blocked')}>
                <button type="button" className="to-col-h" aria-pressed={sel === s.id} onClick={() => setSel(s.id)} aria-label={`${s.name}, ${LABEL[s.status]}, ${s.q} units queued. Show details`}>
                  <span className="to-col-t"><em>{i + 1}</em>{s.name}<Pill tone={STATUS_TONE[s.status]}>{LABEL[s.status]}</Pill></span>
                  <span className="to-col-s"><b>{s.q}</b> units · {s.thr.toFixed(1)}/{s.target.toFixed(1)} per hr</span>
                </button>
                <ul className="to-cards" aria-label={`${s.name} queue`}>
                  {qs.length === 0 && <li className="to-cards-e">Nothing queued</li>}
                  {qs.map((o) => { const i2 = dueInfo(o.due); return (
                    <li key={o.id} className="to-card">
                      <button type="button" className="to-link" onClick={() => setOpen(o.id)} aria-label={`Open order ${o.id}, ${o.customer}`}><b>{o.id}</b><small>{o.customer}</small></button>
                      <span className="to-card-f"><span>{units(o)} units</span><Pill tone={isLate(o) ? 'bad' : i2.tone} dot={false}>{i2.label}</Pill>
                        <Button small variant="ghost" icon="chevron" disabled={isBlk} label={isBlk ? `${s.name} is blocked` : `${o.id}: ${nx ? `move to ${stationName(nx)}` : 'mark ready'}`} onClick={() => ops.A.advance(o.id)} /></span>
                    </li>); })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
      <div className="to-det">
        <section className="td-panel" aria-labelledby="to-cyc-t">
          <header className="td-panel-h"><div><h2 id="to-cyc-t">{st.name}: cycle time per hour</h2><p>{SHIFTS.find((x) => x.id === shift)!.label} shift · minutes per unit, target {target} min</p></div></header>
          <div className="td-panel-b">
            <LineChart label={`${st.name} cycle time per hour, ${shift} shift, in minutes`} labels={hours.slice(0, stopAt)} data={actual} target={target} name="Cycle time" targetName="Target" height={240} format={(v) => `${v.toFixed(1)} min`} />
            <p className="to-note">{shift === 'day' && blk ? <><Glyph name="clock" size={13} />No readings since {blk.since}: the station is blocked.</> : <><Glyph name="clock" size={13} />{fmt.n(done)} units completed in {stopAt} h{shift === 'day' ? ' so far' : ''}, average cycle {(actual.reduce((a, b) => a + b, 0) / actual.length).toFixed(1)} min.</>}</p>
          </div>
        </section>
        <section className="td-panel" aria-labelledby="to-sd-t">
          <header className="td-panel-h"><div><h2 id="to-sd-t">{st.name} station</h2><p>{cfg.start}–{cfg.end} · capacity {st.target.toFixed(1)} per hour</p></div><Pill tone={STATUS_TONE[st.status]}>{LABEL[st.status]}</Pill></header>
          <div className="td-panel-b to-sd">
            {st.status === 'blocked' ? (
              <div className="to-block" role="group" aria-label="Blocked reason"><b>{st.reason ?? 'No operators assigned'}</b><small>{blk ? `Since ${blk.since} · ${st.q} units waiting` : 'Move an operator here to restart the station.'}</small>
                {blk && <Button variant="primary" onClick={() => setDlg('unblock')}>Unblock…</Button>}</div>
            ) : <div className="to-block is-ok"><b>{st.status === 'idle' ? 'Idle: waiting on upstream stations' : 'Flowing'}</b><small>{st.thr.toFixed(1)} of {st.target.toFixed(1)} per hour{over ? ` · queue over the ${ops.s.thr.queueMax} unit limit` : ''}</small><Button onClick={() => setDlg('block')}>Report a block…</Button></div>}
            <div className="to-sd-m"><span>Queue<b className={cx(over && 'is-bad')}>{st.q}</b></span><span>Utilisation<b>{fmt.p(st.target ? st.thr / st.target : 0, 0)}</b></span><span>Cycle<b>{def.cycle} min</b></span></div>
            <Progress value={st.target ? st.thr / st.target : 0} tone={st.status === 'blocked' ? 'bad' : 'signal'} label={`${st.name} throughput against target`} />
            <h3 className="to-h3">Crew · {SHIFTS.find((x) => x.id === shift)!.label} shift</h3>
            <ul className="to-crew">
              {crew.length === 0 && <li className="td-muted">Nobody assigned.</li>}
              {crew.map((n) => (
                <li key={n}><Avatar name={n} size={24} /><span className="to-crew-n">{n}</span>
                  {shift === 'day' ? <Select label={`Reassign ${n}`} value={'' as StationId | ''} onChange={(v) => v && ops.A.moveCrew(n, sel, v)} options={[{ id: '', label: 'Reassign…' }, ...STATION_DEFS.filter((x) => x.id !== sel).map((x) => ({ id: x.id, label: x.name }))] as Array<{ id: StationId | ''; label: string }>} /> : <span className="td-muted">{dateLabel(shift === 'evening' ? -1 : 0)}</span>}
                </li>))}
            </ul>
            {shift !== 'day' && <small className="td-muted">Crew changes apply to the running day shift only.</small>}
          </div>
        </section>
      </div>
      {dlg && <BlockDialog st={st} ops={ops} mode={dlg} onClose={() => setDlg(null)} />}
    </>
  );
}
