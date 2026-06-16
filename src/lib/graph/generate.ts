import { createRng } from '@/lib/rng';
import { makeGraph, type Graph } from './types';

export interface GenerateOptions {
  readonly n: number;
  readonly type: 'symmetric' | 'asymmetric';
  readonly weightRange: readonly [number, number];
  readonly seed: number;
  readonly rng?: () => number;
}

export function generateGraph(opts: GenerateOptions): Graph {
  const { n, type, weightRange, seed } = opts;
  const rng = opts.rng ?? createRng(seed);
  const [wmin, wmax] = weightRange;
  const nodes = Array.from({ length: n }, (_, i) => ({
    id: i,
    x: rng(),
    y: rng(),
  }));
  const weights = new Float32Array(n * n);
  for (let i = 0; i < n; i++) weights[i * n + i] = 0;
  if (type === 'symmetric') {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const w = Math.round(wmin + rng() * (wmax - wmin));
        weights[i * n + j] = w;
        weights[j * n + i] = w;
      }
    }
  } else {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const w = Math.round(wmin + rng() * (wmax - wmin));
        weights[i * n + j] = w;
      }
    }
  }
  return makeGraph(nodes, weights, type);
}
