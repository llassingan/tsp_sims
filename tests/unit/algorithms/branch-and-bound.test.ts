import { describe, expect, it } from 'vitest';
import { branchAndBound } from '@/algorithms/branch-and-bound';
import { bruteForce } from '@/algorithms/brute-force';
import { createRng } from '@/lib/rng';
import { generateGraph } from '@/lib/graph/generate';
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

describe('branch-and-bound', () => {
  it('4-node square cycle → cost 4', async () => {
    const g = squareGraph();
    const result = await branchAndBound.run(makeContext(g));
    expect(result.cost).toBe(4);
  });

  it('4-node square path destination 3 → cost 3', async () => {
    const g = squareGraph();
    const result = await branchAndBound.run(
      makeContext(g, { problemType: 'path', destinationNode: 3 }),
    );
    expect(result.cost).toBe(3);
  });

  it('5-node star cycle → cost 32', async () => {
    const g = starGraph5();
    const result = await branchAndBound.run(makeContext(g));
    expect(result.cost).toBe(32);
  });

  it('prunes at least one branch on star graph', async () => {
    const g = starGraph5();
    const result = await branchAndBound.run(makeContext(g));
    expect(result.pruned).toBeGreaterThan(0);
  });

  it('respects AbortSignal', async () => {
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
    const start = Date.now();
    const result = await branchAndBound.run(makeContext(g, { signal: controller.signal }));
    expect(Date.now() - start).toBeLessThan(2000);
    expect(result.timedOut).toBe(true);
  });

  it('throws when n > 18', async () => {
    const n = 19;
    const weights = new Float32Array(n * n);
    const nodes = Array.from({ length: n }, (_, i) => ({ id: i, x: i / n, y: i / n }));
    const g = makeGraph(nodes, weights, 'symmetric');
    await expect(branchAndBound.run(makeContext(g))).rejects.toThrow(/18/);
  });

  it('agrees with brute-force on n=6 across 5 random seeds', async () => {
    for (let seed = 1; seed <= 5; seed++) {
      const g = generateGraph({
        n: 6,
        type: 'symmetric',
        weightRange: [1, 20],
        seed,
        rng: createRng(seed),
      });
      const bf = await bruteForce.run(makeContext(g));
      const bb = await branchAndBound.run(makeContext(g));
      expect(bb.cost).toBe(bf.cost);
    }
  });

  it('is deterministic', async () => {
    const g = squareGraph();
    const r1 = await branchAndBound.run(makeContext(g));
    const r2 = await branchAndBound.run(makeContext(g));
    expect(r1.cost).toBe(r2.cost);
    expect(r1.tour).toEqual(r2.tour);
  });
});
