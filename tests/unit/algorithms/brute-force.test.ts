import { describe, expect, it } from 'vitest';
import { bruteForce } from '@/algorithms/brute-force';
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

function starGraph5(): Graph {
  const weights = new Float32Array(25);
  for (let i = 0; i < 25; i++) weights[i] = 0;
  for (let i = 1; i < 5; i++) {
    weights[0 * 5 + i] = 1;
    weights[i * 5 + 0] = 1;
  }
  for (let i = 1; i < 5; i++) {
    for (let j = 1; j < 5; j++) {
      if (i !== j) {
        weights[i * 5 + j] = 10;
      }
    }
  }
  const nodes = [
    { id: 0, x: 0.5, y: 0.5 },
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 1, y: 0 },
    { id: 3, x: 1, y: 1 },
    { id: 4, x: 0, y: 1 },
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

describe('brute-force', () => {
  it('4-node square cycle → cost 4', async () => {
    const g = squareGraph();
    const ctx = makeContext(g);
    const result = await bruteForce.run(ctx);
    expect(result.cost).toBe(4);
    expect(result.timedOut).toBe(false);
    expect(result.tour.length).toBe(5);
    expect(result.tour[0]).toBe(0);
  });

  it('4-node square path destination 3 → cost 3', async () => {
    const g = squareGraph();
    const ctx = makeContext(g, { problemType: 'path', destinationNode: 3 });
    const result = await bruteForce.run(ctx);
    expect(result.cost).toBe(3);
  });

  it('5-node star cycle → cost 32', async () => {
    const g = starGraph5();
    const ctx = makeContext(g);
    const result = await bruteForce.run(ctx);
    expect(result.cost).toBe(32);
  });

  it('asymmetric 3-node cycle → cost 8', async () => {
    const weights = new Float32Array([0, 1, 5, 2, 0, 3, 4, 6, 0]);
    const nodes = [
      { id: 0, x: 0, y: 0 },
      { id: 1, x: 1, y: 0 },
      { id: 2, x: 0.5, y: 1 },
    ];
    const g = makeGraph(nodes, weights, 'asymmetric');
    const ctx = makeContext(g);
    const result = await bruteForce.run(ctx);
    expect(result.cost).toBe(8);
  });

  it('respects AbortSignal within 1 second', async () => {
    const n = 10;
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
    const ctx = makeContext(g, { signal: controller.signal });
    const start = Date.now();
    const result = await bruteForce.run(ctx);
    expect(Date.now() - start).toBeLessThan(2000);
    expect(result.timedOut).toBe(true);
  });

  it('throws when n > 11', async () => {
    const n = 12;
    const weights = new Float32Array(n * n);
    const nodes = Array.from({ length: n }, (_, i) => ({ id: i, x: i / n, y: i / n }));
    const g = makeGraph(nodes, weights, 'symmetric');
    const ctx = makeContext(g);
    await expect(bruteForce.run(ctx)).rejects.toThrow(/11/);
  });

  it('is deterministic', async () => {
    const g = squareGraph();
    const ctx1 = makeContext(g);
    const ctx2 = makeContext(g);
    const r1 = await bruteForce.run(ctx1);
    const r2 = await bruteForce.run(ctx2);
    expect(r1.cost).toBe(r2.cost);
    expect(r1.tour).toEqual(r2.tour);
    expect(r1.explored).toBe(r2.explored);
  });
});
