import { describe, expect, it } from 'vitest';
import { generateGraph } from '@/lib/graph/generate';
import { createRng } from '@/lib/rng';

describe('generateGraph', () => {
  it('symmetric: weights[i,j] === weights[j,i]', () => {
    const g = generateGraph({
      n: 10,
      type: 'symmetric',
      weightRange: [1, 100],
      seed: 1,
      rng: createRng(1),
    });
    for (let i = 0; i < g.n; i++) {
      for (let j = 0; j < g.n; j++) {
        expect(g.weights[i * g.n + j]).toBe(g.weights[j * g.n + i]);
      }
    }
  });

  it('asymmetric: not required to be symmetric', () => {
    const g = generateGraph({
      n: 6,
      type: 'asymmetric',
      weightRange: [1, 50],
      seed: 2,
      rng: createRng(2),
    });
    let asym = false;
    for (let i = 0; i < g.n; i++) {
      for (let j = i + 1; j < g.n; j++) {
        if (g.weights[i * g.n + j] !== g.weights[j * g.n + i]) asym = true;
      }
    }
    expect(asym).toBe(true);
  });

  it('same seed → byte-identical graph', () => {
    const a = generateGraph({ n: 8, type: 'symmetric', weightRange: [1, 20], seed: 7 });
    const b = generateGraph({ n: 8, type: 'symmetric', weightRange: [1, 20], seed: 7 });
    expect(a.weights.length).toBe(b.weights.length);
    for (let i = 0; i < a.weights.length; i++) {
      expect(a.weights[i]).toBe(b.weights[i]);
    }
  });

  it('weights all in [min, max]', () => {
    const g = generateGraph({
      n: 10,
      type: 'symmetric',
      weightRange: [5, 15],
      seed: 3,
      rng: createRng(3),
    });
    for (let i = 0; i < g.n; i++) {
      for (let j = 0; j < g.n; j++) {
        if (i === j) continue;
        const w = g.weights[i * g.n + j] ?? 0;
        expect(w).toBeGreaterThanOrEqual(5);
        expect(w).toBeLessThanOrEqual(15);
      }
    }
  });

  it('n=10: all 90 edges present, no NaN', () => {
    const g = generateGraph({
      n: 10,
      type: 'symmetric',
      weightRange: [1, 50],
      seed: 4,
      rng: createRng(4),
    });
    let count = 0;
    for (let i = 0; i < g.n; i++) {
      for (let j = i + 1; j < g.n; j++) {
        const w = g.weights[i * g.n + j];
        expect(Number.isNaN(w)).toBe(false);
        expect(w).toBeGreaterThan(0);
        count++;
      }
    }
    expect(count).toBe(45);
  });

  it('euclidean: closest pair gets min weight, farthest gets max weight', () => {
    const [wmin, wmax] = [4, 80];
    const g = generateGraph({
      n: 12,
      type: 'symmetric',
      weightRange: [wmin, wmax],
      seed: 11,
      rng: createRng(11),
      weightMode: 'euclidean',
    });
    let minObserved = Number.POSITIVE_INFINITY;
    let maxObserved = 0;
    for (let i = 0; i < g.n; i++) {
      for (let j = i + 1; j < g.n; j++) {
        const d = Math.sqrt(
          (g.nodes[i]!.x - g.nodes[j]!.x) ** 2 +
            (g.nodes[i]!.y - g.nodes[j]!.y) ** 2,
        );
        if (d === Math.min(...pairwiseDists(g))) minObserved = Math.min(minObserved, g.weights[i * g.n + j]!);
        if (d === Math.max(...pairwiseDists(g))) maxObserved = Math.max(maxObserved, g.weights[i * g.n + j]!);
      }
    }
    expect(minObserved).toBe(wmin);
    expect(maxObserved).toBe(wmax);
  });

  it('euclidean: weights monotonic with distance', () => {
    const g = generateGraph({
      n: 10,
      type: 'symmetric',
      weightRange: [1, 100],
      seed: 13,
      rng: createRng(13),
      weightMode: 'euclidean',
    });
    const pairs: Array<{ d: number; w: number }> = [];
    for (let i = 0; i < g.n; i++) {
      for (let j = i + 1; j < g.n; j++) {
        const d = Math.sqrt(
          (g.nodes[i]!.x - g.nodes[j]!.x) ** 2 +
            (g.nodes[i]!.y - g.nodes[j]!.y) ** 2,
        );
        pairs.push({ d, w: g.weights[i * g.n + j]! });
      }
    }
    pairs.sort((a, b) => a.d - b.d);
    for (let i = 1; i < pairs.length; i++) {
      expect(pairs[i]!.w).toBeGreaterThanOrEqual(pairs[i - 1]!.w);
    }
  });

  it('euclidean: same seed → byte-identical graph', () => {
    const a = generateGraph({
      n: 8,
      type: 'symmetric',
      weightRange: [1, 20],
      seed: 42,
      weightMode: 'euclidean',
    });
    const b = generateGraph({
      n: 8,
      type: 'symmetric',
      weightRange: [1, 20],
      seed: 42,
      weightMode: 'euclidean',
    });
    for (let i = 0; i < a.weights.length; i++) {
      expect(a.weights[i]).toBe(b.weights[i]);
    }
  });
});

function pairwiseDists(g: { nodes: ReadonlyArray<{ x: number; y: number }> }): number[] {
  const out: number[] = [];
  for (let i = 0; i < g.nodes.length; i++) {
    for (let j = i + 1; j < g.nodes.length; j++) {
      out.push(
        Math.sqrt(
          (g.nodes[i]!.x - g.nodes[j]!.x) ** 2 +
            (g.nodes[i]!.y - g.nodes[j]!.y) ** 2,
        ),
      );
    }
  }
  return out;
}
