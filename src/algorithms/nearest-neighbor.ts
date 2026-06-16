import type { Algorithm, AlgorithmContext, AlgorithmResult } from './types';
import { ALGORITHM_LIMITS } from './limits';
import { cost, type Graph } from '@/lib/graph/types';

function checkCap(graph: Graph, max: number): void {
  if (graph.n > max) {
    throw new Error(
      `Graph has ${graph.n} nodes, exceeding hard cap of ${max} for nearest-neighbor.`,
    );
  }
}

export const nearestNeighbor: Algorithm = {
  id: 'nearest-neighbor',
  name: 'Nearest Neighbor',
  timeComplexity: 'O(n^2)',
  spaceComplexity: 'O(n)',
  maxNodesRecommended: ALGORITHM_LIMITS['nearest-neighbor'].maxNodesRecommended,
  maxNodesHard: ALGORITHM_LIMITS['nearest-neighbor'].maxNodesHard,
  optimal: false,
  async run(ctx: AlgorithmContext): Promise<AlgorithmResult> {
    checkCap(ctx.graph, ALGORITHM_LIMITS['nearest-neighbor'].maxNodesHard);
    const t0 = ctx.now();
    const { graph, problemType, signal, onStep } = ctx;
    const startNode = ctx.startNode;
    const destinationNode = ctx.destinationNode;
    const visited = new Array<boolean>(graph.n).fill(false);
    const tour: number[] = [startNode];
    visited[startNode] = true;
    let current = startNode;
    let costSoFar = 0;
    let explored = 0;
    let aborted = false;

    while (true) {
      if (signal.aborted) {
        aborted = true;
        break;
      }
      const next = chooseNext(graph, current, visited, destinationNode, problemType, tour.length);
      explored += graph.n;
      if (next.next === -1) {
        if (problemType === 'path' && destinationNode !== undefined && current !== destinationNode) {
          return unreachableResult(tour, explored, t0, ctx.now());
        }
        break;
      }
      visited[next.next] = true;
      tour.push(next.next);
      costSoFar += next.edge;
      onStep({ type: 'visit', tour: [...tour], costSoFar, depth: tour.length });
      current = next.next;
      if (tour.length === graph.n) break;
    }

    if (aborted) {
      return {
        tour,
        cost: costSoFar,
        explored,
        pruned: 0,
        computeTimeMs: ctx.now() - t0,
        timedOut: true,
      };
    }

    const finalCost = finalizeCost(graph, current, startNode, problemType, destinationNode, tour.length, costSoFar);
    onStep({ type: 'complete', tour, cost: finalCost });
    return {
      tour,
      cost: finalCost,
      explored,
      pruned: 0,
      computeTimeMs: ctx.now() - t0,
      timedOut: false,
    };
  },
};

interface NextChoice {
  readonly next: number;
  readonly edge: number;
}

function chooseNext(
  graph: Graph,
  current: number,
  visited: readonly boolean[],
  destinationNode: number | undefined,
  problemType: 'cycle' | 'path',
  tourLength: number,
): NextChoice {
  let bestNext = -1;
  let bestEdge = Number.POSITIVE_INFINITY;
  for (let j = 0; j < graph.n; j++) {
    if (visited[j]) continue;
    if (problemType === 'path' && destinationNode !== undefined) {
      const remaining = graph.n - tourLength;
      if (remaining === 1 && j !== destinationNode) continue;
    }
    const c = cost(graph, current, j);
    if (c < bestEdge) {
      bestEdge = c;
      bestNext = j;
    }
  }
  return { next: bestNext, edge: bestEdge };
}

function unreachableResult(
  tour: number[],
  explored: number,
  t0: number,
  t1: number,
): AlgorithmResult {
  return {
    tour,
    cost: Number.POSITIVE_INFINITY,
    explored,
    pruned: 0,
    computeTimeMs: t1 - t0,
    timedOut: false,
  };
}

function finalizeCost(
  graph: Graph,
  current: number,
  startNode: number,
  problemType: 'cycle' | 'path',
  destinationNode: number | undefined,
  tourLength: number,
  costSoFar: number,
): number {
  if (tourLength < graph.n) return Number.POSITIVE_INFINITY;
  if (problemType === 'cycle') return costSoFar + cost(graph, current, startNode);
  if (destinationNode !== undefined && current !== destinationNode) {
    return Number.POSITIVE_INFINITY;
  }
  return costSoFar;
}
