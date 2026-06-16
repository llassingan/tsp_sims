import { describe, expect, it } from 'vitest';
import { nearestNeighbor } from '@/algorithms/nearest-neighbor';
import type { AlgorithmContext } from '@/algorithms/types';
import { makeGraph, type Graph } from '@/lib/graph/types';

function squareGraph(): Graph {
  const weights = new Float32Array([
    0, 1, 2, 1, 1, 0, 1, 2, 2, 1, 0, 1, 1, 2, 1, 0,
  ]);
  const nodes = [
    { id: 0, x: 0, y: 0 },
    { id: 1, x: 1, y: 0 },
    { id: 2, x: 1, y: 1 },
    { id: 3, x: 0, y: 1 },
  ];
  return makeGraph(nodes, weights, 'symmetric');
}

function makeContext(g: Graph, opts: Partial<AlgorithmContext> = {}): AlgorithmContext {
  const controller = new AbortController();
  return {
    graph: g,
    startNode: 0,
    problemType: 'cycle',
    weightRange: [1, 10] as const,
    signal: controller.signal,
    onStep: () => undefined,
    now: () => 0,
    ...opts,
  };
}

function allVisitedOnce(tour: readonly number[], n: number): boolean {
  if (tour.length < n) return false;
  const seen = new Set<number>();
  for (let i = 0; i < n; i++) seen.add(tour[i] ?? -1);
  return seen.size === n && seen.has(0);
}

describe('nearest-neighbor', () => {
  it('4-node square cycle → cost 4', async () => {
    const g = squareGraph();
    const result = await nearestNeighbor.run(makeContext(g));
    expect(result.cost).toBe(4);
  });

  it('4-node square path destination 3 → cost 3', async () => {
    const g = squareGraph();
    const result = await nearestNeighbor.run(
      makeContext(g, { problemType: 'path', destinationNode: 3 }),
    );
    expect(result.cost).toBe(3);
  });

  it('tour visits every node exactly once (cycle)', async () => {
    const g = squareGraph();
    const result = await nearestNeighbor.run(makeContext(g));
    expect(allVisitedOnce(result.tour, g.n)).toBe(true);
  });

  it('unreachable destination → Infinity', async () => {
    const weights = new Float32Array([0, 1, 0, 0, 0, 1, 1, 0, 0]);
    const nodes = [
      { id: 0, x: 0, y: 0 },
      { id: 1, x: 1, y: 0 },
      { id: 2, x: 0, y: 1 },
    ];
    const g = makeGraph(nodes, weights, 'symmetric');
    const result = await nearestNeighbor.run(
      makeContext(g, { problemType: 'path', destinationNode: 2 }),
    );
    expect(result.cost).toBe(Number.POSITIVE_INFINITY);
  });

  it('respects AbortSignal', async () => {
    const n = 200;
    const weights = new Float32Array(n * n);
    const nodes = Array.from({ length: n }, (_, i) => ({ id: i, x: i / n, y: i / n }));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) weights[i * n + j] = 1 + ((i + j) % 5);
      }
    }
    const g = makeGraph(nodes, weights, 'symmetric');
    const controller = new AbortController();
    controller.abort();
    const result = await nearestNeighbor.run(
      makeContext(g, { signal: controller.signal }),
    );
    expect(result.timedOut).toBe(true);
  });

  it('throws when n > 500', async () => {
    const n = 501;
    const weights = new Float32Array(n * n);
    const nodes = Array.from({ length: n }, (_, i) => ({ id: i, x: i / n, y: i / n }));
    const g = makeGraph(nodes, weights, 'symmetric');
    await expect(nearestNeighbor.run(makeContext(g))).rejects.toThrow(/500/);
  });

  it('n=200 completes in < 100ms', async () => {
    const n = 200;
    const weights = new Float32Array(n * n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) weights[i * n + j] = 1 + ((i * 31 + j * 17) % 99);
      }
    }
    const nodes = Array.from({ length: n }, (_, i) => ({ id: i, x: i / n, y: (i * 7) % n / n }));
    const g = makeGraph(nodes, weights, 'symmetric');
    const start = Date.now();
    const result = await nearestNeighbor.run(makeContext(g));
    expect(Date.now() - start).toBeLessThan(100);
    expect(result.timedOut).toBe(false);
  });
});
