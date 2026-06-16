import type { Algorithm, AlgorithmContext, AlgorithmResult } from './types';
import { ALGORITHM_LIMITS } from './limits';
import { cost, type Graph } from '@/lib/graph/types';

function checkCap(graph: Graph, max: number): void {
  if (graph.n > max) {
    throw new Error(
      `Graph has ${graph.n} nodes, exceeding hard cap of ${max} for branch-and-bound.`,
    );
  }
}

function twoSmallest(arr: readonly number[]): number {
  if (arr.length === 0) return 0;
  if (arr.length === 1) return arr[0] ?? 0;
  let a = Number.POSITIVE_INFINITY;
  let b = Number.POSITIVE_INFINITY;
  for (const v of arr) {
    if (v < a) {
      b = a;
      a = v;
    } else if (v < b) {
      b = v;
    }
  }
  return (a === Number.POSITIVE_INFINITY ? 0 : a) + (b === Number.POSITIVE_INFINITY ? 0 : b);
}

function lowerBound(
  g: Graph,
  visited: boolean[],
  startNode: number,
  current: number,
  problemType: 'cycle' | 'path',
  destinationNode: number | undefined,
): number {
  const n = g.n;
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (visited[i] && i !== current) continue;
    if (i === current) {
      let smallest = Number.POSITIVE_INFINITY;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        if (!visited[j]) {
          const c = cost(g, i, j);
          if (c < smallest) smallest = c;
        }
      }
      total += smallest === Number.POSITIVE_INFINITY ? 0 : smallest;
      continue;
    }
    if (i === startNode && problemType === 'cycle') {
      let smallest = Number.POSITIVE_INFINITY;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        if (!visited[j]) {
          const c = cost(g, j, i);
          if (c < smallest) smallest = c;
        }
      }
      total += smallest === Number.POSITIVE_INFINITY ? 0 : smallest;
      continue;
    }
    if (i === startNode && problemType === 'path') {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        if (!visited[j] || j === current) row.push(cost(g, i, j));
      }
      total += twoSmallest(row);
      continue;
    }
    if (problemType === 'path' && destinationNode !== undefined && i === destinationNode) {
      const fromCurrent = cost(g, current, i);
      total += fromCurrent;
      continue;
    }
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      if (!visited[j] || j === current) row.push(cost(g, i, j));
    }
    total += twoSmallest(row);
  }
  return total / 2;
}

export const branchAndBound: Algorithm = {
  id: 'branch-and-bound',
  name: 'Branch & Bound',
  timeComplexity: 'O(n!) worst',
  spaceComplexity: 'O(n^2)',
  maxNodesRecommended: ALGORITHM_LIMITS['branch-and-bound'].maxNodesRecommended,
  maxNodesHard: ALGORITHM_LIMITS['branch-and-bound'].maxNodesHard,
  optimal: true,
  async run(ctx: AlgorithmContext): Promise<AlgorithmResult> {
    checkCap(ctx.graph, ALGORITHM_LIMITS['branch-and-bound'].maxNodesHard);
    const t0 = ctx.now();
    const { graph, startNode, problemType, signal, onStep } = ctx;
    const n = graph.n;
    const destinationNode = ctx.destinationNode;

    const visited = new Array<boolean>(n).fill(false);
    visited[startNode] = true;
    let bestCost = Number.POSITIVE_INFINITY;
    let bestTour: number[] = [];
    let explored = 0;
    let pruned = 0;
    let aborted = false;

    const dfs = (current: number, currentCost: number, depth: number, path: number[]): void => {
      if (signal.aborted) {
        aborted = true;
        return;
      }
      explored++;
      onStep({ type: 'visit', tour: [...path], costSoFar: currentCost, depth });

      if (problemType === 'path' && depth === n && destinationNode !== undefined) {
        if (current === destinationNode) {
          if (currentCost < bestCost) {
            bestCost = currentCost;
            bestTour = [...path];
            onStep({ type: 'improve', tour: bestTour, cost: bestCost });
          }
        }
        return;
      }
      if (problemType === 'cycle' && depth === n) {
        const total = currentCost + cost(graph, current, startNode);
        if (total < bestCost) {
          bestCost = total;
          bestTour = [...path];
          onStep({ type: 'improve', tour: bestTour, cost: bestCost });
        }
        return;
      }

      const lb = lowerBound(graph, visited, startNode, current, problemType, destinationNode);
      if (currentCost + lb >= bestCost) {
        pruned++;
        onStep({
          type: 'prune',
          partialTour: [...path],
          lowerBound: currentCost + lb,
          reason: 'bound',
        });
        return;
      }

      for (let next = 0; next < n; next++) {
        if (visited[next]) continue;
        if (problemType === 'path' && destinationNode !== undefined) {
          const remaining = n - depth;
          if (remaining === 1 && next !== destinationNode) continue;
        }
        visited[next] = true;
        path.push(next);
        dfs(next, currentCost + cost(graph, current, next), depth + 1, path);
        path.pop();
        visited[next] = false;
        if (aborted) return;
      }
    };

    dfs(startNode, 0, 1, [startNode]);

    if (aborted) {
      return {
        tour: bestTour,
        cost: bestCost === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : bestCost,
        explored,
        pruned,
        computeTimeMs: ctx.now() - t0,
        timedOut: true,
      };
    }

    onStep({ type: 'complete', tour: bestTour, cost: bestCost });

    return {
      tour: bestTour,
      cost: bestCost,
      explored,
      pruned,
      computeTimeMs: ctx.now() - t0,
      timedOut: false,
    };
  },
};
