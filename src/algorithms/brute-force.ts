/**
 * brute-force.ts — Brute Force TSP / Hamiltonian-Path Solver
 * ============================================================
 *
 * ## Algorithm Overview
 *
 * The brute-force solver enumerates **every possible permutation** of the
 * non-start nodes and evaluates the total tour cost for each one. It is
 * guaranteed to find the optimal solution but scales as O(n!) — usable only
 * for very small graphs (hard cap at n=11, see {@link ALGORITHM_LIMITS}).
 *
 * ## How it works
 *
 * 1. **Isolate movable nodes** — build an array of all node indices except
 *    `startNode` (the tour always begins at the start).
 *
 * 2. **Generate permutations** — use a recursive (not Heap's) permutation
 *    generator that yields each ordering of the movable nodes exactly once.
 *    For n non-start nodes, this produces (n-1)! permutations.
 *
 * 3. **Compute tour cost incrementally** — for each permutation, prepend
 *    `startNode` and call `tourCost()` which sums edge weights along the
 *    path. The cost computation is O(n) per permutation. For the "cycle"
 *    variant, the edge from the last node back to `startNode` is added.
 *    For the "path" variant, only permutations ending at `destinationNode`
 *    are considered valid (others get cost = Infinity).
 *
 * 4. **Track the best tour** — maintain `bestCost` and `bestTour`. When a
 *    cheaper permutation is found, emit an `'improve'` event so the UI can
 *    highlight the new incumbent.
 *
 * 5. **Emit streaming events** — every permutation triggers a `'visit'` event
 *    (so the UI can animate the exploration) and the final result is emitted
 *    as a `'complete'` event.
 *
 * ## Complexity
 *
 * - **Time**: O(n!) — (n-1)! permutations, each O(n) for cost computation.
 * - **Space**: O(n) — the permutation generator yields one permutation at a
 *   time via JavaScript generators, so only the current tour and best tour
 *   are kept in memory.
 *
 * ## Cancellation
 *
 * The solver checks `signal.aborted` before processing each permutation and
 * breaks out of the loop cleanly, returning a partial result (the best tour
 * found so far) with `timedOut: true`.
 */

import type { Algorithm, AlgorithmContext, AlgorithmResult } from './types';
import { ALGORITHM_LIMITS } from './limits';
import { cost, type Graph } from '@/lib/graph/types';

/**
 * Guards against graphs that exceed the brute-force hard cap.
 *
 * Brute force is factorial in the number of movable nodes. Even modest graphs
 * (n > 11) would cause effectively unbounded computation, so we reject them
 * upfront with a clear error message.
 *
 * @param graph - The graph to validate.
 * @param max   - The maximum allowed node count (from ALGORITHM_LIMITS).
 * @throws Error if graph.n > max.
 */
function checkCap(graph: Graph, max: number): void {
  if (graph.n > max) {
    throw new Error(
      `Graph has ${graph.n} nodes, exceeding hard cap of ${max} for brute-force.`,
    );
  }
}

/**
 * Recursive permutation generator that yields each ordering of the input array
 * exactly once.
 *
 * This is a textbook recursive permutation algorithm (not Heap's in-place
 * algorithm). It picks each element as the first, then recursively permutes
 * the remainder. For an array of length k it yields k! permutations.
 *
 * The generator allocates new arrays at each yield (via spread `[...arr]` at
 * the base case and `[...perm]` in the reconstruction), so the memory per
 * iteration is O(k) but the results are safe to mutate downstream.
 *
 * @typeParam T - The element type of the array.
 * @param arr - The array to permute.
 * @yields Each permutation of `arr`.
 */
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

/**
 * Computes the total cost (sum of edge weights) for a given tour.
 *
 * Edge cases handled:
 * - Tours shorter than 2 nodes → cost is 0.
 * - Missing edges (undefined index) → cost is Infinity (invalid tour).
 * - For "cycle" mode: adds the closing edge `last → startNode`.
 * - For "path" mode: validates that the tour ends at `destinationNode`;
 *   returns Infinity if it doesn't.
 *
 * @param g              - The graph providing edge weights via cost().
 * @param tour           - Ordered array of node indices forming the tour.
 * @param problemType    - 'cycle' (return to start) or 'path' (end at destination).
 * @param startNode      - The starting node (used for the cycle-closing edge).
 * @param destinationNode - Required endpoint for path mode (undefined for cycle).
 * @returns The total edge cost of the tour, or Infinity if invalid.
 */
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

/**
 * Builds the list of "other" nodes — all indices except `startNode`.
 *
 * These are the nodes that will be permuted by the brute-force search.
 * The start node is always fixed as the first element of every tour.
 *
 * @param n         - Total number of nodes in the graph.
 * @param startNode - The fixed starting node.
 * @returns Array of all indices from 0 to n-1, excluding startNode.
 */
function buildOthers(n: number, startNode: number): number[] {
  const others: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i !== startNode) others.push(i);
  }
  return others;
}

/**
 * Assembles the final {@link AlgorithmResult} from the collected statistics.
 *
 * @param bestTour  - The best tour found (may be empty if none was found).
 * @param bestCost  - The cost of the best tour (Infinity if none).
 * @param explored  - Number of permutations examined.
 * @param t0        - Start timestamp from ctx.now().
 * @param t1        - End timestamp from ctx.now().
 * @param timedOut  - Whether computation was aborted.
 * @returns A completed AlgorithmResult object.
 */
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

/**
 * Handles the final step for the "cycle" variant after all permutations
 * have been exhausted. Emits a `'complete'` event and returns the final state.
 *
 * @param ctx       - The algorithm context (for onStep emission).
 * @param bestTour  - Current best tour.
 * @param bestCost  - Current best cost.
 * @param explored  - Number of permutations examined.
 * @param _t0       - Start timestamp (unused, kept for signature consistency).
 * @param aborted   - Whether the search was aborted.
 * @returns The final state tuple (bestTour, bestCost, explored, aborted).
 */
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

/**
 * The Brute Force algorithm implementation.
 *
 * Enumerates all (n-1)! permutations of the non-start nodes, evaluates the
 * total cost for each, and tracks the best (minimum-cost) tour found.
 *
 * **Guaranteed optimal**: yes (exhaustive enumeration).
 * **Time complexity**: O(n!) worst case.
 * **Space complexity**: O(n) (one permutation at a time via generator).
 */
export const bruteForce: Algorithm = {
  id: 'brute-force',
  name: 'Brute Force',
  timeComplexity: 'O(n!)',
  spaceComplexity: 'O(n)',
  maxNodesRecommended: ALGORITHM_LIMITS['brute-force'].maxNodesRecommended,
  maxNodesHard: ALGORITHM_LIMITS['brute-force'].maxNodesHard,
  optimal: true,

  /**
   * Runs the brute-force TSP solver.
   *
   * @param ctx - The {@link AlgorithmContext} providing graph, parameters,
   *              cancellation signal, and event callback.
   * @returns A {@link AlgorithmResult} with the best tour found (or a partial
   *          result if aborted).
   */
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

    // Main loop: iterate over all permutations of the non-start nodes.
    for (const perm of permutations(others)) {
      // Cooperative cancellation check before processing each permutation.
      if (signal.aborted) {
        aborted = true;
        break;
      }

      const baseTour = [startNode, ...perm];
      const c = tourCost(graph, baseTour, problemType, startNode, destinationNode);
      explored++;

      // For 'cycle', the displayed tour includes the return to start for
      // visualization purposes; for 'path', we show the one-way path.
      const tourForStep =
        problemType === 'cycle' ? [...baseTour, startNode] : baseTour;
      onStep({ type: 'visit', tour: tourForStep, costSoFar: c, depth: tourForStep.length });

      // If this tour is cheaper than anything seen so far, update the incumbent.
      if (c < bestCost) {
        bestCost = c;
        bestTour = tourForStep;
        onStep({ type: 'improve', tour: bestTour, cost: bestCost });
      }
    }

    if (aborted) {
      return buildResult(bestTour, bestCost, explored, t0, ctx.now(), true);
    }

    // Emit the final complete event and return the result.
    runCycle(ctx, bestTour, bestCost, explored, t0, aborted);
    return buildResult(bestTour, bestCost, explored, t0, ctx.now(), false);
  },
};
