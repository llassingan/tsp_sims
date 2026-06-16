import { describe, expect, it } from 'vitest';
import { generateGraph } from '@/lib/graph/generate';

describe('graph realism', () => {
  it('heavier edge in euclidean mode corresponds to farther node pair', () => {
    const g = generateGraph({
      n: 8,
      type: 'symmetric',
      weightRange: [1, 100],
      seed: 7,
      weightMode: 'euclidean',
    });
    const pairs: Array<{ i: number; j: number; d: number; w: number }> = [];
    for (let i = 0; i < g.n; i++) {
      for (let j = i + 1; j < g.n; j++) {
        const a = g.nodes[i]!;
        const b = g.nodes[j]!;
        const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        const w = g.weights[i * g.n + j] ?? 0;
        pairs.push({ i, j, d, w });
      }
    }
    const ranked = [...pairs].sort((a, b) => a.d - b.d);
    const quarter = Math.floor(ranked.length / 4);
    const firstQuarter = ranked.slice(0, quarter);
    const lastQuarter = ranked.slice(-quarter);
    const avg = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;
    const avgWClose = avg(firstQuarter.map((p) => p.w));
    const avgWFar = avg(lastQuarter.map((p) => p.w));
    expect(avgWFar).toBeGreaterThan(avgWClose);
  });
});
