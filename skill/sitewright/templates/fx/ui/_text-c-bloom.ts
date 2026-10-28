/* Word graph + layout for SemanticBloom (neutral, original vocabulary). */

export type WordGraph = Record<string, string[]>;

export const DEFAULT_GRAPH: WordGraph = {
  Light: ['Glow', 'Prism', 'Dawn', 'Shadow', 'Spectrum', 'Mirror'],
  Glow: ['Ember', 'Halo', 'Pulse', 'Warmth'],
  Prism: ['Angle', 'Glass', 'Spectrum', 'Facet'],
  Dawn: ['Horizon', 'Quiet', 'Mist', 'Warmth'],
  Shadow: ['Dusk', 'Depth', 'Silhouette'],
  Spectrum: ['Hue', 'Wave', 'Rainbow'],
  Mirror: ['Reflection', 'Glass', 'Echo'],
  Echo: ['Wave', 'Quiet', 'Pulse'],
};

/** Symmetric adjacency, first-seen order, no self links. */
export function neighbours(graph: WordGraph, word: string): string[] {
  const out: string[] = [];
  const add = (w: string) => { if (w !== word && !out.includes(w)) out.push(w); };
  (graph[word] ?? []).forEach(add);
  for (const [k, list] of Object.entries(graph)) if (list.includes(word)) add(k);
  return out;
}

export function allWords(graph: WordGraph): string[] {
  const set = new Set<string>();
  for (const [k, list] of Object.entries(graph)) { set.add(k); list.forEach((w) => set.add(w)); }
  return [...set];
}

export interface NodeState { x: number; y: number; vx: number; vy: number; s: number; vs: number }

/** Target slot of the i-th of n satellites around the centre, on a gently drifting, slightly irregular ellipse. */
export function slot(i: number, n: number, w: number, h: number, t: number): { x: number; y: number } {
  const a = -Math.PI / 2 + (i / Math.max(1, n)) * Math.PI * 2 + Math.sin(t * 0.35 + i * 1.7) * 0.07 + t * 0.02;
  const irregular = 0.86 + ((i * 0.618) % 1) * 0.14;
  const rx = Math.max(60, w * 0.5 - 62) * irregular;
  const ry = Math.max(46, h * 0.5 - 30) * irregular;
  return { x: w / 2 + Math.cos(a) * rx, y: h / 2 + Math.sin(a) * ry };
}
