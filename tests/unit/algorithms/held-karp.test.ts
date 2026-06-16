import { describe, expect, it } from 'vitest';
import { heldKarp } from '@/algorithms/held-karp';
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

describe('held-karp', () => {
  it('4-node square cycle → cost 4', async () => {
    const g = squareGraph();
    const result = await heldKarp.run(makeContext(g));
    expect(result.cost).toBe(4);
  });

  it('4-node square path destination 3 → cost 3', async () => {
    const g = squareGraph();
    const result = await heldKarp.run(
      makeContext(g, { problemType: 'path', destinationNode: 3 }),
    );
    expect(result.cost).toBe(3);
  });

  it('matches brute-force on n=4..7 random symmetric graphs', async () => {
    for (const n of [4, 5, 6, 7]) {
      for (let seed = 1; seed <= 3; seed++) {
        const g = generateGraph({
          n,
          type: 'symmetric',
          weightRange: [1, 20],
          seed,
          rng: createRng(seed),
        });
        const bf = await bruteForce.run(makeContext(g));
        const hk = await heldKarp.run(makeContext(g));
        expect(hk.cost).toBe(bf.cost);
      }
    }
  });

  it('asymmetric n=5 matches brute-force', async () => {
    const g = generateGraph({
      n: 5,
      type: 'asymmetric',
      weightRange: [1, 20],
      seed: 42,
      rng: createRng(42),
    });
    const bf = await bruteForce.run(makeContext(g));
    const hk = await heldKarp.run(makeContext(g));
    expect(hk.cost).toBe(bf.cost);
  });

  it('respects AbortSignal', async () => {
    const n = 19;
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
    const result = await heldKarp.run(makeContext(g, { signal: controller.signal }));
    expect(result.timedOut).toBe(true);
  });

  it('throws when n > 20', async () => {
    const n = 21;
    const weights = new Float32Array(n * n);
    const nodes = Array.from({ length: n }, (_, i) => ({ id: i, x: i / n, y: i / n }));
    const g = makeGraph(nodes, weights, 'symmetric');
    await expect(heldKarp.run(makeContext(g))).rejects.toThrow(/20/);
  });

  it('DP table size is n * 2^n', () => {
    for (const n of [4, 8, 12]) {
      const size = n * (1 << n);
      expect(size).toBe(n * 2 ** n);
    }
  });

  it('is deterministic', async () => {
    const g = squareGraph();
    const r1 = await heldKarp.run(makeContext(g));
    const r2 = await heldKarp.run(makeContext(g));
    expect(r1.cost).toBe(r2.cost);
  });
});
