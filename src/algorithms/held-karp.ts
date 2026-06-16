import type { Algorithm, AlgorithmContext, AlgorithmResult } from './types';
import { ALGORITHM_LIMITS } from './limits';
import { cost, type Graph } from '@/lib/graph/types';

function checkCap(graph: Graph, max: number): void {
  if (graph.n > max) {
    throw new Error(
      `Graph has ${graph.n} nodes, exceeding hard cap of ${max} for held-karp.`,
    );
  }
}

const INF = Number.POSITIVE_INFINITY;

export const heldKarp: Algorithm = {
  id: 'held-karp',
  name: 'Held-Karp DP',
  timeComplexity: 'O(n^2 * 2^n)',
  spaceComplexity: 'O(n * 2^n)',
  maxNodesRecommended: ALGORITHM_LIMITS['held-karp'].maxNodesRecommended,
  maxNodesHard: ALGORITHM_LIMITS['held-karp'].maxNodesHard,
  optimal: true,
  async run(ctx: AlgorithmContext): Promise<AlgorithmResult> {
    checkCap(ctx.graph, ALGORITHM_LIMITS['held-karp'].maxNodesHard);
    const t0 = ctx.now();
    const { graph, startNode, problemType, signal, onStep } = ctx;
    const n = graph.n;
    const destinationNode = ctx.destinationNode;
    const fullMask = (1 << n) - 1;
    const totalCells = n * (1 << n);
    const dp = new Float32Array(totalCells);
    const parent = new Int32Array(totalCells);
    for (let i = 0; i < totalCells; i++) {
      dp[i] = INF;
      parent[i] = -1;
    }
    dp[startNode * (1 << n) + (1 << startNode)] = 0;
    const totalMasks = 1 << n;
    const progressEvery = Math.max(1, Math.floor(totalMasks / 100));
    let explored = 0;
    let aborted = false;

    for (let mask = 1; mask < totalMasks; mask++) {
      if ((mask & (progressEvery - 1)) === 0) {
        if (signal.aborted) {
          aborted = true;
          break;
        }
        onStep({ type: 'progress', explored: mask, total: totalMasks });
      }
      for (let i = 0; i < n; i++) {
        if (((mask >> i) & 1) === 0) continue;
        const baseIdx = i * totalMasks + mask;
        const current = dp[baseIdx] ?? INF;
        if (current === INF) continue;
        for (let j = 0; j < n; j++) {
          if (((mask >> j) & 1) === 1) continue;
          if (problemType === 'path' && destinationNode !== undefined) {
            if (mask === (fullMask ^ (1 << destinationNode)) && j !== destinationNode) {
              continue;
            }
          }
          const newMask = mask | (1 << j);
          const w = cost(graph, i, j);
          if (w === INF) continue;
          const newCost = current + w;
          const targetIdx = j * totalMasks + newMask;
          if (newCost < dp[targetIdx]!) {
            dp[targetIdx] = newCost;
            parent[targetIdx] = i;
            explored++;
          }
        }
      }
    }

    if (aborted) {
      return {
        tour: [],
        cost: INF,
        explored,
        pruned: 0,
        computeTimeMs: ctx.now() - t0,
        timedOut: true,
      };
    }

    let endNode = startNode;
    let bestCost = INF;
    if (problemType === 'path' && destinationNode !== undefined) {
      endNode = destinationNode;
      bestCost = dp[endNode * totalMasks + fullMask] ?? INF;
    } else {
      for (let i = 0; i < n; i++) {
        const c = (dp[i * totalMasks + fullMask] ?? INF) + cost(graph, i, startNode);
        if (c < bestCost) {
          bestCost = c;
          endNode = i;
        }
      }
    }

    const tour: number[] = [];
    if (bestCost !== INF && bestCost < Number.POSITIVE_INFINITY) {
      let cur = endNode;
      let m = fullMask;
      while (cur !== -1 && m !== 0) {
        tour.push(cur);
        const idx = cur * totalMasks + m;
        const prev = parent[idx] ?? -1;
        const prevMask = m ^ (1 << cur);
        if (prev === -1 && prevMask !== 0) break;
        cur = prev;
        m = prevMask;
        if (tour.length > n) break;
      }
      tour.reverse();
      if (problemType === 'cycle') {
        tour.push(startNode);
      }
    }

    onStep({ type: 'complete', tour, cost: bestCost });
    return {
      tour,
      cost: bestCost,
      explored,
      pruned: 0,
      computeTimeMs: ctx.now() - t0,
      timedOut: false,
    };
  },
};
