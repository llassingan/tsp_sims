import { createRng } from '@/lib/rng';
import { makeGraph, type Graph } from './types';

export type WeightMode = 'random' | 'euclidean';

export interface GenerateOptions {
  readonly n: number;
  readonly type: 'symmetric' | 'asymmetric';
  readonly weightRange: readonly [number, number];
  readonly seed: number;
  readonly weightMode?: WeightMode;
  readonly rng?: () => number;
}

interface EuclideanRange {
  readonly minDist: number;
  readonly maxDist: number;
  readonly wmin: number;
  readonly wmax: number;
}

function euclideanWeight(a: { x: number; y: number }, b: { x: number; y: number }, range: EuclideanRange): number {
  if (range.maxDist <= range.minDist) return Math.round(range.wmin);
  const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  const t = (d - range.minDist) / (range.maxDist - range.minDist);
  return Math.round(range.wmin + t * (range.wmax - range.wmin));
}

function distanceBounds(
  nodes: ReadonlyArray<{ x: number; y: number }>,
): { minDist: number; maxDist: number } {
  let minDist = Number.POSITIVE_INFINITY;
  let maxDist = 0;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (a === undefined || b === undefined) continue;
      const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
      if (d < minDist) minDist = d;
      if (d > maxDist) maxDist = d;
    }
  }
  if (minDist === Number.POSITIVE_INFINITY) return { minDist: 0, maxDist: 0 };
  return { minDist, maxDist };
}

function fillSymmetric(
  weights: Float32Array,
  n: number,
  pick: (i: number, j: number) => number,
): void {
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const w = pick(i, j);
      weights[i * n + j] = w;
      weights[j * n + i] = w;
    }
  }
}

function fillAsymmetric(
  weights: Float32Array,
  n: number,
  pick: (i: number, j: number) => number,
): void {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      weights[i * n + j] = pick(i, j);
    }
  }
}

export function generateGraph(opts: GenerateOptions): Graph {
  const { n, type, weightRange, seed } = opts;
  const rng = opts.rng ?? createRng(seed);
  const [wmin, wmax] = weightRange;
  const mode: WeightMode = opts.weightMode ?? 'random';
  const nodes = Array.from({ length: n }, (_, i) => ({
    id: i,
    x: rng(),
    y: rng(),
  }));
  const weights = new Float32Array(n * n);
  for (let i = 0; i < n; i++) weights[i * n + i] = 0;

  if (mode === 'euclidean') {
    const bounds = distanceBounds(nodes);
    const range: EuclideanRange = { ...bounds, wmin, wmax };
    const pick = (i: number, j: number): number => {
      const a = nodes[i];
      const b = nodes[j];
      if (a === undefined || b === undefined) return wmin;
      const w = euclideanWeight(a, b, range);
      if (type === 'asymmetric' && i !== j) {
        const jitter = Math.round((rng() - 0.5) * Math.max(1, (wmax - wmin) * 0.05));
        return Math.max(1, w + jitter);
      }
      return w;
    };
    if (type === 'symmetric') fillSymmetric(weights, n, pick);
    else fillAsymmetric(weights, n, pick);
  } else if (type === 'symmetric') {
    fillSymmetric(weights, n, () => Math.round(wmin + rng() * (wmax - wmin)));
  } else {
    fillAsymmetric(weights, n, () => Math.round(wmin + rng() * (wmax - wmin)));
  }

  return makeGraph(nodes, weights, type);
}
