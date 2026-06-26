/**
 * nearest-neighbor.ts — Nearest Neighbor Heuristic TSP / Hamiltonian-Path Solver
 * ===============================================================================
 *
 * ## Algorithm Overview
 *
 * The Nearest Neighbor (NN) algorithm is a **greedy heuristic** that builds a
 * tour one node at a time by always choosing the cheapest edge from the current
 * node to any unvisited node. It is fast (O(n^2)) but not guaranteed to find
 * the optimal solution — in fact, NN can produce arbitrarily bad tours (there
 * is no constant-factor approximation guarantee for general TSP).
 *
 * ## How it works
 *
 * 1. Start at `startNode` and mark it as visited.
 *
 * 2. At each step, scan all unvisited nodes and pick the one with the minimum
 *    edge cost from the current node. Move to that node, add it to the tour,
 *    and increment the running cost.
 *
 * 3. Repeat until all nodes are visited.
 *
 * 4. **Cycle mode**: after visiting all nodes, add the return edge from the
 *    last node back to `startNode` to close the cycle.
 *
 * 5. **Path mode**: the last unvisited node is forced to be `destinationNode`
 *    by filtering candidates at the final step. The path ends at the
 *    destination with no return edge.
 *
 * 6. If at any point no unvisited node is reachable (should only happen with
 *    disconnected graphs), the algorithm returns a partial tour with cost
 *    Infinity.
 *
 * ## Complexity
 *
 * - **Time**: O(n^2) — at each of the n steps, we scan all n nodes to find
 *   the minimum-cost neighbor.
 * - **Space**: O(n) — a visited boolean array and the tour array.
 *
 * ## Node limits
 *
 * NN is capped at 500 nodes not because of algorithmic limits (500^2 = 250K
 * operations is trivial), but because the UI canvas rendering becomes the
 * bottleneck with hundreds of nodes.
 *
 * ## Optimality
 *
 * `optimal: false` — this is a heuristic, not an exact algorithm. The
 * returned tour is not guaranteed to have minimum cost. Use Brute Force,
 * Branch & Bound, or Held-Karp for exact solutions.
 *
 * ## Cancellation
 *
 * The loop checks `signal.aborted` before each iteration and returns a
 * partial tour with `timedOut: true` if cancelled.
 */

import type { Algorithm, AlgorithmContext, AlgorithmResult } from './types';
import { ALGORITHM_LIMITS } from './limits';
import { cost, type Graph } from '@/lib/graph/types';

/**
 * Rejects graphs that exceed the Nearest Neighbor hard cap.
 *
 * @param graph - Graph to validate.
 * @param max   - Maximum allowed nodes.
 * @throws Error if graph is too large.
 */
function checkCap(graph: Graph, max: number): void {
  if (graph.n > max) {
    throw new Error(
      `Graph has ${graph.n} nodes, exceeding hard cap of ${max} for nearest-neighbor.`,
    );
  }
}

/**
 * The Nearest Neighbor algorithm implementation.
 *
 * A greedy constructive heuristic: at each step, picks the cheapest edge from
 * the current node to any unvisited node. Fast (O(n^2)) but not guaranteed
 * optimal — `optimal: false`.
 */
export const nearestNeighbor: Algorithm = {
  id: 'nearest-neighbor',
  name: 'Nearest Neighbor',
  timeComplexity: 'O(n^2)',
  spaceComplexity: 'O(n)',
  maxNodesRecommended: ALGORITHM_LIMITS['nearest-neighbor'].maxNodesRecommended,
  maxNodesHard: ALGORITHM_LIMITS['nearest-neighbor'].maxNodesHard,
  optimal: false,

  /**
   * Runs the Nearest Neighbor greedy TSP heuristic.
   *
   * @param ctx - The {@link AlgorithmContext}.
   * @returns The {@link AlgorithmResult} with the greedy tour and its cost,
   *          or a timedOut/unreachable result.
   */
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

    // Greedy construction loop: at each step, pick the cheapest unvisited
    // neighbor and move there.
    while (true) {
      if (signal.aborted) {
        aborted = true;
        break;
      }

      const next = chooseNext(graph, current, visited, destinationNode, problemType, tour.length);
      explored += graph.n;

      // -1 means no reachable unvisited neighbor — the graph is effectively
      // disconnected or we're blocked by the path constraint.
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

      // All nodes visited — exit the loop for cost finalization.
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

/**
 * Result of a single "choose next neighbor" operation.
 */
interface NextChoice {
  /** Index of the chosen next node, or -1 if none is reachable. */
  readonly next: number;
  /** Edge cost from the current node to the chosen next node (0 if none). */
  readonly edge: number;
}

/**
 * Selects the cheapest unvisited neighbor from the current node.
 *
 * Scans all nodes and picks the one with the minimum edge cost. For the
 * path variant, when only one unvisited node remains, it is forced to be
 * the `destinationNode` (any other candidate is skipped).
 *
 * @param graph           - The graph for edge lookup.
 * @param current         - The current node index.
 * @param visited         - Boolean array tracking visited nodes.
 * @param destinationNode - Required endpoint for 'path' mode.
 * @param problemType     - 'cycle' or 'path'.
 * @param tourLength      - Number of nodes currently in the tour.
 * @returns The best (next, edge) pair, or (-1, Infinity) if none reachable.
 */
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

    // In path mode, if this is the final selection (one node remains),
    // enforce that the last node is the destination.
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

/**
 * Returns a result indicating that the destination is unreachable from the
 * current partial tour.
 *
 * This happens in 'path' mode when no unvisited node is reachable from the
 * current node, and we haven't yet reached the destination.
 *
 * @param tour     - The partial tour built so far.
 * @param explored - Number of edge lookups performed.
 * @param t0       - Start timestamp.
 * @param t1       - End timestamp.
 * @returns An AlgorithmResult with cost Infinity.
 */
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

/**
 * Computes the final tour cost after all nodes have been visited.
 *
 * For the 'cycle' variant, adds the closing edge from the last node back to
 * `startNode`. For the 'path' variant, validates that the tour ends at
 * `destinationNode` — if it doesn't, returns Infinity.
 *
 * If not all nodes were visited, returns Infinity.
 *
 * @param graph           - The graph.
 * @param current         - The last visited node.
 * @param startNode       - The starting node.
 * @param problemType     - 'cycle' or 'path'.
 * @param destinationNode - Required endpoint for 'path' mode.
 * @param tourLength      - Total number of nodes visited.
 * @param costSoFar       - Sum of edges traversed so far.
 * @returns The final total cost, or Infinity if the tour is invalid.
 */
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
