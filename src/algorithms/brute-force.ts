import type { Algorithm, AlgorithmContext, AlgorithmResult } from './types';
import { ALGORITHM_LIMITS } from './limits';
import { cost, type Graph } from '@/lib/graph/types';

function checkCap(graph: Graph, max: number): void {
  if (graph.n > max) {
    throw new Error(
      `Graph has ${graph.n} nodes, exceeding hard cap of ${max} for brute-force.`,
    );
  }
}

function* permutations<T>(arr: T[]): Generator<T[]> {
  if (arr.length <= 1) {
    yield [...arr];
    return;
  }
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const perm of permutations(rest)) {
      yield [arr[i] as T, ...perm];
    }
  }
}

function tourCost(
  g: Graph,
  tour: readonly number[],
  problemType: 'cycle' | 'path',
  startNode: number,
  destinationNode: number | undefined,
): number {
  if (tour.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < tour.length - 1; i++) {
    const from = tour[i];
    const to = tour[i + 1];
    if (from === undefined || to === undefined) return Number.POSITIVE_INFINITY;
    total += cost(g, from, to);
  }
  if (problemType === 'cycle') {
    const last = tour[tour.length - 1];
    if (last === undefined) return Number.POSITIVE_INFINITY;
    total += cost(g, last, startNode);
  } else if (destinationNode !== undefined) {
    const last = tour[tour.length - 1];
    if (last !== destinationNode) return Number.POSITIVE_INFINITY;
  }
  return total;
}

function buildOthers(n: number, startNode: number): number[] {
  const others: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i !== startNode) others.push(i);
  }
  return others;
}

function buildResult(
  bestTour: number[],
  bestCost: number,
  explored: number,
  t0: number,
  t1: number,
  timedOut: boolean,
): AlgorithmResult {
  return {
    tour: bestTour,
    cost: bestCost,
    explored,
    pruned: 0,
    computeTimeMs: t1 - t0,
    timedOut,
  };
}

function runCycle(
  ctx: AlgorithmContext,
  bestTour: number[],
  bestCost: number,
  explored: number,
  _t0: number,
  aborted: boolean,
): { bestTour: number[]; bestCost: number; explored: number; aborted: boolean } {
  if (aborted) return { bestTour, bestCost, explored, aborted };
  ctx.onStep({ type: 'complete', tour: bestTour, cost: bestCost });
  void runCycle;
  return { bestTour, bestCost, explored, aborted };
}

export const bruteForce: Algorithm = {
  id: 'brute-force',
  name: 'Brute Force',
  timeComplexity: 'O(n!)',
  spaceComplexity: 'O(n)',
  maxNodesRecommended: ALGORITHM_LIMITS['brute-force'].maxNodesRecommended,
  maxNodesHard: ALGORITHM_LIMITS['brute-force'].maxNodesHard,
  optimal: true,
  async run(ctx: AlgorithmContext): Promise<AlgorithmResult> {
    checkCap(ctx.graph, ALGORITHM_LIMITS['brute-force'].maxNodesHard);
    const t0 = ctx.now();
    const { graph, startNode, problemType, signal, onStep } = ctx;
    const destinationNode = ctx.destinationNode;
    const others = buildOthers(graph.n, startNode);
    let bestTour: number[] = [];
    let bestCost = Number.POSITIVE_INFINITY;
    let explored = 0;
    let aborted = false;
    for (const perm of permutations(others)) {
      if (signal.aborted) {
        aborted = true;
        break;
      }
      const baseTour = [startNode, ...perm];
      const c = tourCost(graph, baseTour, problemType, startNode, destinationNode);
      explored++;
      const tourForStep =
        problemType === 'cycle' ? [...baseTour, startNode] : baseTour;
      onStep({ type: 'visit', tour: tourForStep, costSoFar: c, depth: tourForStep.length });
      if (c < bestCost) {
        bestCost = c;
        bestTour = tourForStep;
        onStep({ type: 'improve', tour: bestTour, cost: bestCost });
      }
    }
    if (aborted) {
      return buildResult(bestTour, bestCost, explored, t0, ctx.now(), true);
    }
    runCycle(ctx, bestTour, bestCost, explored, t0, aborted);
    return buildResult(bestTour, bestCost, explored, t0, ctx.now(), false);
  },
};
