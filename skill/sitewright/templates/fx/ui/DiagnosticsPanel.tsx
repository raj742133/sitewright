'use client';
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { drawCube, drawLayers, drawMesh, MESH_CELLS } from './_tu-diagrams';
import { useCanvas2D, type CanvasEnv } from './_tu-ui-kit';

export type DiagnosticsView = 'layers' | 'nodes' | 'mesh';
export interface DiagnosticsPanelProps {
  /** Controlled view. */
  view?: DiagnosticsView;
  defaultView?: DiagnosticsView;
  onViewChange?: (view: DiagnosticsView) => void;
  /** Panel heading. */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

const VIEWS: { id: DiagnosticsView; label: string; alt: string; stats: [string, string][] }[] = [
  { id: 'layers', label: 'Layers', alt: 'Four translucent planes stacked in perspective, linked by vertical channels with pulses travelling between them while a scan line sweeps the active plane.', stats: [['Layers', '4'], ['Links', '5'], ['Scan', 'live']] },
  { id: 'nodes', label: 'Nodes', alt: 'A three by three by three lattice of nodes rotating inside a dashed cube, with one hot node and its neighbours highlighted.', stats: [['Nodes', '27'], ['Edges', '54'], ['Hot', '1']] },
  { id: 'mesh', label: 'Mesh', alt: 'A wireframe surface rippling in perspective with one tall anomaly drifting across it and a ring spreading outward.', stats: [['Cells', String(MESH_CELLS)], ['Anomaly', '1'], ['Drift', 'low']] },
];

/** A diagnostics card with three Canvas 2D illustrations (stacked layer planes, a node cube, a rippling mesh), chosen by an accessible tab list. Arrow keys move between tabs; reduced motion shows a still frame. */
export default function DiagnosticsPanel({ view, defaultView = 'layers', onViewChange, title = 'System diagnostics', className, style }: DiagnosticsPanelProps) {
  const [inner, setInner] = useState<DiagnosticsView>(defaultView);
  const cur = view ?? inner;
  const idx = Math.max(0, VIEWS.findIndex((v) => v.id === cur));
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const draw = (e: CanvasEnv) => (cur === 'layers' ? drawLayers(e) : cur === 'nodes' ? drawCube(e) : drawMesh(e));
  const { canvasRef } = useCanvas2D(draw, { staticT: 4.1 });
  const pick = (i: number, focus = false) => {
    const v = VIEWS[(i + VIEWS.length) % VIEWS.length]!;
    if (view === undefined) setInner(v.id);
    onViewChange?.(v.id);
    if (focus) tabs.current[(i + VIEWS.length) % VIEWS.length]?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') pick(idx + 1, true);
    else if (e.key === 'ArrowLeft') pick(idx - 1, true);
    else if (e.key === 'Home') pick(0, true);
    else if (e.key === 'End') pick(VIEWS.length - 1, true);
    else return;
    e.preventDefault();
  };
  const v = VIEWS[idx]!;
  return (
    <section className={`ui-diagnostics-panel-root ${className ?? ''}`} style={style} aria-label={title}>
      <header className="ui-diagnostics-panel-head">
        <h3 className="ui-diagnostics-panel-title">{title}</h3>
        <span className="ui-diagnostics-panel-chip"><i aria-hidden="true" />Nominal</span>
        <div className="ui-diagnostics-panel-tabs" role="tablist" aria-label="Illustration" onKeyDown={onKey}>
          {VIEWS.map((t, i) => (
            <button key={t.id} ref={(el) => { tabs.current[i] = el; }} type="button" role="tab" id={`${id}-t-${t.id}`} aria-selected={i === idx} aria-controls={`${id}-p`} tabIndex={i === idx ? 0 : -1} className="ui-diagnostics-panel-tab" onClick={() => pick(i)}>{t.label}</button>
          ))}
        </div>
      </header>
      <div className="ui-diagnostics-panel-body" role="tabpanel" id={`${id}-p`} aria-labelledby={`${id}-t-${v.id}`}>
        <canvas ref={canvasRef} className="ui-diagnostics-panel-cv" role="img" aria-label={v.alt} />
        <dl className="ui-diagnostics-panel-stats">
          {v.stats.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}
        </dl>
      </div>
    </section>
  );
}

export function Demo() {
  return <DiagnosticsPanel />;
}
