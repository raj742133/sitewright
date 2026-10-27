'use client';
// Suppliers: a ranked supplier table, and for the selected supplier a page with open purchase orders (chase / receive), a price history chart,
// the contact card with a message dialog, and a new-PO action that opens the purchase order builder for that supplier's parts.
import { useId, useMemo, useState, type RefObject } from 'react';
import { LineChart } from './_ops-charts';
import { Button, Glyph, Pill, Progress, seeded } from './_dash';
import { SUPPLIERS, dateLabel, money, type Part, type Supplier } from './_ops';
import { PoDialog, type PoResult } from './_opsinv';
import type { D, Ops, PO } from './_opsstate';
import { Field, Grid, Modal, Select, ViewHeader, dueInfo, type GCol } from './_opsui';

const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
function history(p: Part): number[] {
  const r = seeded([...p.sku].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)); const drift = (Math.floor(r() * 13) - 3) / 100;
  return MONTHS.map((_, i) => (i === 11 ? p.cost : Math.round(p.cost * (1 - drift * (1 - i / 11)) * (1 + (r() - 0.5) * 0.02) * 100) / 100));
}
function ContactDialog({ s, onClose, onSend }: { s: Supplier; onClose: () => void; onSend: () => void }) {
  const uid = useId(); const [subj, setSubj] = useState('Delivery status and next orders'); const [msg, setMsg] = useState(''); const [err, setErr] = useState<{ s?: string; m?: string }>({});
  const send = () => { const e = { s: subj.trim() ? undefined : 'Add a subject.', m: msg.trim().length >= 10 ? undefined : 'Write at least a sentence (10 characters).' }; setErr(e); if (!e.s && !e.m) onSend(); };
  return (
    <Modal id="to-ct" title={`Message ${s.contact}`} sub={`${s.name} · ${s.email}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon="send" onClick={send}>Send message</Button></>}>
      <div className="to-form">
        <Field id={`${uid}s`} label="Subject" error={err.s}>{(p) => <input {...p} className="to-in" value={subj} onChange={(e) => setSubj(e.target.value)} />}</Field>
        <Field id={`${uid}m`} label="Message" error={err.m} help={`${msg.trim().length} characters`}>{(p) => <textarea {...p} className="to-in to-ta" rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} />}</Field>
      </div>
    </Modal>
  );
}

export function SuppliersView({ ops, d, hRef }: { ops: Ops; d: D; hRef: RefObject<HTMLHeadingElement | null> }) {
  const [sel, setSel] = useState(SUPPLIERS[0]!.name); const [partSku, setPartSku] = useState<string>(''); const [dlg, setDlg] = useState<'mail' | 'po' | null>(null);
  const stat = (s: Supplier) => { const p = d.openPos.filter((x) => x.supplier === s.name); return { open: p.length, late: p.filter((x) => x.due < 0).length, value: p.reduce((a, x) => a + x.qty * x.unit, 0), spend: s.spend + ops.s.pos.filter((x) => x.supplier === s.name && x.placed === 0).reduce((a, x) => a + x.qty * x.unit, 0) }; };
  const rows = useMemo(() => [...SUPPLIERS], []);
  const cur = SUPPLIERS.find((s) => s.name === sel)!, cs = stat(cur), parts = d.parts.filter((p) => p.supplier === sel);
  const part = parts.find((p) => p.sku === partSku) ?? parts[0]!; const hist = useMemo(() => history(part), [part]);
  const change = ((hist[11]! - hist[0]!) / hist[0]!) * 100;
  const pos = d.openPos.filter((p) => p.supplier === sel).sort((a, b) => a.due - b.due);
  const low = parts.filter((p) => p.onHand <= p.reorder), poParts = low.length ? low : parts.slice(0, 2);
  const cols: Array<GCol<Supplier>> = [
    { id: 'name', label: 'Supplier', sort: (a, b) => a.name.localeCompare(b.name), cell: (s) => <button type="button" className="to-link" onClick={() => { setSel(s.name); setPartSku(''); }} aria-pressed={s.name === sel} aria-label={`Open ${s.name}`}><b>{s.name}</b><small>{s.region}</small></button> },
    { id: 'lead', label: 'Lead time', right: true, sort: (a, b) => a.lead - b.lead, cell: (s) => `${s.lead} d` },
    { id: 'ot', label: 'On time', right: true, sort: (a, b) => a.onTime - b.onTime, cell: (s) => <span className="to-cover"><span className={`to-bar${s.onTime < 85 ? ' is-bad' : s.onTime < 93 ? ' is-warn' : ''}`}><i style={{ width: `${s.onTime}%` }} /></span><b>{s.onTime}%</b></span> },
    { id: 'open', label: 'Open POs', right: true, hide: 'sm', sort: (a, b) => stat(a).open - stat(b).open, cell: (s) => { const t = stat(s); return <>{t.open}{t.late > 0 && <span className="to-latec"> · {t.late} late</span>}</>; } },
    { id: 'spend', label: 'Spend · 90 d', right: true, hide: 'md', sort: (a, b) => stat(a).spend - stat(b).spend, cell: (s) => money(stat(s).spend) },
  ];
  const place = (r: PoResult) => { ops.A.commitPo(Object.entries(r.lines).map(([sku, qty]) => ({ sku, qty })), `${r.count === 1 ? r.ids[0] : `${r.ids[0]} to ${r.ids[r.ids.length - 1]}`} placed with ${cur.name}: ${money(r.total)}`); setDlg(null); };
  const poCols: Array<GCol<PO>> = [
    { id: 'id', label: 'PO', cell: (p) => <span className="td-mono">{p.id}</span> },
    { id: 'part', label: 'Part', cell: (p) => <div className="td-cellmain"><div><b>{d.parts.find((x) => x.sku === p.sku)!.name}</b><small>{p.qty} × {money(p.unit)}{p.note ? ` · ${p.note}` : ''}</small></div></div> },
    { id: 'val', label: 'Value', right: true, hide: 'sm', cell: (p) => money(p.qty * p.unit) },
    { id: 'due', label: 'Due', cell: (p) => { const i = dueInfo(p.due); return <span className="to-due"><span>{dateLabel(p.due)}</span><Pill tone={i.tone} dot={false}>{i.label}</Pill></span>; } },
    { id: 'act', label: 'Actions', right: true, cell: (p) => <span className="to-acts"><Button small disabled={p.chased} label={`Chase ${p.id}`} onClick={() => ops.A.chase(p.id)}>{p.chased ? 'Chased' : 'Chase'}</Button><Button small variant="primary" label={`Receive ${p.id}`} onClick={() => ops.A.receive(p.id)}>Receive</Button></span> },
  ];
  return (
    <>
      <ViewHeader hRef={hRef} title="Suppliers" sub={`${SUPPLIERS.length} suppliers · ${d.openPos.length} open purchase orders · ${d.latePos.length} late`} />
      <div className="to-split">
        <section className="td-panel" aria-label="Supplier list"><Grid cols={rows.length ? cols : []} rows={rows} rowKey={(s) => s.name} selected={sel} caption="Suppliers. Column headers sort the table." empty="No suppliers" initial={{ id: 'lead', dir: -1 }} /></section>
        <section className="td-panel to-sup" aria-labelledby="to-sup-h">
          <header className="td-panel-h"><div><h2 id="to-sup-h">{cur.name}</h2><p>{cur.region} · {cur.terms}</p></div>
            <div className="td-panel-a"><Button icon="send" onClick={() => setDlg('mail')}>Contact</Button><Button variant="primary" icon="plus" onClick={() => setDlg('po')}>New PO</Button></div></header>
          <div className="td-panel-b to-sup-b">
            <dl className="to-facts"><div><dt>Lead time</dt><dd>{cur.lead} d</dd></div><div><dt>On time</dt><dd>{cur.onTime}%</dd></div><div><dt>Open PO value</dt><dd>{money(cs.value)}</dd></div><div><dt>Contact</dt><dd className="to-ct"><span>{cur.contact}</span><small>{cur.email}</small></dd></div></dl>
            <Progress value={cur.onTime / 100} tone={cur.onTime < 85 ? 'bad' : 'signal'} label={`${cur.name} on-time delivery rate`} />
            <div className="to-sec-h"><h3 className="to-h3">Price history</h3>
              <Select label="Part" value={part.sku} onChange={setPartSku} options={parts.map((p) => ({ id: p.sku, label: p.name }))} /></div>
            <p className="to-pc"><b>{money(hist[11]!)}</b> per unit now <Pill tone={change > 1 ? 'bad' : change < -1 ? 'ok' : 'neutral'} dot={false}>{change > 0 ? '+' : ''}{change.toFixed(1)}% in 12 months</Pill></p>
            <LineChart labels={MONTHS} data={hist} format={money} name="Unit price" label={`${part.name} unit price from ${MONTHS[0]} to ${MONTHS[11]}`} />
            <h3 className="to-h3">Open purchase orders ({pos.length})</h3>
            <Grid cols={poCols} rows={pos} rowKey={(p) => p.id} caption={`Open purchase orders with ${cur.name}`} empty={<div className="to-empty-l"><Glyph name="check" size={14} />No open purchase orders. Start one with New PO.</div>} />
          </div>
        </section>
      </div>
      {dlg === 'mail' && <ContactDialog s={cur} onClose={() => setDlg(null)} onSend={() => { ops.say(`Message sent to ${cur.contact} at ${cur.name}`); setDlg(null); }} />}
      {dlg === 'po' && <PoDialog parts={poParts} firstPo={ops.s.poSeq} onClose={() => setDlg(null)} onPlace={place} />}
    </>
  );
}
