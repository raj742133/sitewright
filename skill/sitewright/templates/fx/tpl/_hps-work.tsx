'use client';
// Selected commissions: a filterable index (filters, selected row, a detail card with a drawing) and the about section.
import { useState } from 'react';
import ScrollReveal from '../ui/ScrollReveal';
import { Plate, type PlateKind } from './_hps-art';

interface Job { id: string; title: string; client: string; kind: string; year: number; plate: PlateKind; blurb: string }
const JOBS: Job[] = [
  { id: 'j1', title: 'The Orchard Year', client: 'Orchard Quarterly', kind: 'Editorial', year: 2026, plate: 'fern', blurb: 'Twelve monthly covers, one botanical study each, painted from cuttings left on the editor\'s desk.' },
  { id: 'j2', title: 'Salt and Tide', client: 'Harrow & Finch Books', kind: 'Books', year: 2025, plate: 'light', blurb: 'Jacket and nineteen interior plates for a collection of coastal essays.' },
  { id: 'j3', title: 'Tea for the Long Evening', client: 'Pennywhistle Tea', kind: 'Packaging', year: 2025, plate: 'teapot', blurb: 'A set of three tins whose lids carry the same teapot at three different hours.' },
  { id: 'j4', title: 'Small Hours', client: 'The Slow Review', kind: 'Editorial', year: 2025, plate: 'cat', blurb: 'A season of night-time spot drawings for a long-form essay column.' },
  { id: 'j5', title: 'A Field Guide to Wet Weather', client: 'Tern Press', kind: 'Books', year: 2024, plate: 'mushroom', blurb: 'Sixty small drawings of what grows when it will not stop raining.' },
  { id: 'j6', title: 'Night Tram', client: 'Hollow Bell Festival', kind: 'Posters', year: 2024, plate: 'tram', blurb: 'A three-colour poster for a week of late concerts, printed on cream stock.' },
];
const KINDS = ['All', 'Books', 'Editorial', 'Packaging', 'Posters'];

export function Work() {
  const [kind, setKind] = useState('All');
  const [sel, setSel] = useState('j1');
  const shown = JOBS.filter((j) => kind === 'All' || j.kind === kind);
  const job = shown.find((j) => j.id === sel) ?? shown[0];
  return (
    <section id="hps-work" tabIndex={-1} className="hps-sec" aria-labelledby="hps-hw">
      <div className="hps-sec-head">
        <p className="hps-eyebrow"><i aria-hidden="true" />Selected commissions</p>
        <h2 id="hps-hw" className="hps-h2">Work for people <em>who like paper.</em></h2>
      </div>
      <div className="hps-chips" role="group" aria-label="Filter commissions by kind">
        {KINDS.map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); const n = JOBS.filter((j) => k === 'All' || j.kind === k)[0]; if (n) setSel(n.id); }}>{k}</button>)}
        <span className="hps-count" role="status">{shown.length} of {JOBS.length} commissions</span>
      </div>
      <div className="hps-work">
        <ul className="hps-jobs">
          {shown.map((j) => (
            <li key={j.id}>
              <button type="button" aria-pressed={job?.id === j.id} onClick={() => setSel(j.id)}>
                <span className="hps-job-y">{j.year}</span>
                <span className="hps-job-t"><b>{j.title}</b><small>{j.client}</small></span>
                <span className="hps-job-k">{j.kind}</span>
              </button>
            </li>
          ))}
        </ul>
        {job && (
          <figure className="hps-job-card hps-paper" key={job.id}>
            <span className="hps-tape hps-tape-a" aria-hidden="true" />
            <div className="hps-job-art"><Plate kind={job.plate} label={`${job.title}, sample drawing`} /></div>
            <figcaption><b>{job.title}</b><span>{job.client}, {job.year}</span><p>{job.blurb}</p></figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}

export function About() {
  return (
    <section id="hps-about" tabIndex={-1} className="hps-sec hps-about" aria-labelledby="hps-ha">
      <div className="hps-sec-head">
        <p className="hps-eyebrow"><i aria-hidden="true" />About</p>
        <h2 id="hps-ha" className="hps-h2">Slow hands, <em>short deadlines kept.</em></h2>
      </div>
      <ScrollReveal className="hps-statement" text="I draw at a table by a north-facing window, mostly in the morning, mostly with a dip pen. A job starts with a week of small ugly sketches, moves to a clean pencil layout you approve, and only then gets inked and washed. You see every stage, and nothing is a surprise." />
      <div className="hps-about-grid">
        <div><h3>On the table</h3><ul className="hps-kit"><li>Walnut ink and a steel nib</li><li>Cold-press paper, 300 gsm</li><li>Six pans of watercolour</li><li>A bone folder, a lot of tape</li></ul></div>
        <div><h3>How a job runs</h3><ol className="hps-steps"><li>A call and a brief</li><li>Thumbnails in a week</li><li>Pencil layout, one round of notes</li><li>Final ink and wash, scanned at 1200 dpi</li></ol></div>
      </div>
    </section>
  );
}
