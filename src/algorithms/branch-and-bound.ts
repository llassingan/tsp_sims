/**
 * branch-and-bound.ts — Branch and Bound TSP / Hamiltonian-Path Solver
 * =====================================================================
 *
 * ## Algorithm Overview
 *
 * Branch and Bound (B&B) is a DFS-based exact TSP solver that uses a
 * **lower-bound heuristic** to prune branches of the search tree that cannot
 * possibly lead to a better tour. It is guaranteed to find the optimal
 * solution (like brute force) but typically explores orders of magnitude
 * fewer permutations thanks to the bounding criterion.
 *
 * ## How it works
 *
 * 1. **DFS traversal** — starting from `startNode`, recursively explore all
 *    unvisited neighbors. The recursion depth equals the number of nodes
 *    visited so far. When depth equals n (all nodes visited), we have a
 *    complete tour.
 *
 * 2. **Lower-bound pruning** — before descending into a branch, compute a
 *    lower-bound estimate of the cheapest possible completion from the
 *    current partial tour. If `currentCost + lowerBound >= bestCost`, the
 *    branch is pruned: no complete tour from this partial path can beat the
 *    current best. The function `lowerBound()` computes this estimate as:
 *
 *    ```
 *    For each unvisited node i:
 *      sum of the two smallest edges incident to i
 *    Divide the total by 2
 *    ```
 *
 *    This is a standard TSP lower bound: every tour must enter and leave
 *    each node exactly once (two edges per node), and the sum of the two
 *    cheapest edges per node divided by 2 gives a valid lower bound on any
 *    complete tour cost.
 *
 * 3. **Lazy bound computation** — unlike textbook B&B which computes the
 *    complete reduced cost matrix, we compute the bound on-the-fly for each
 *    partial tour. This is O(n^2) per bound check but simple to implement
 *    and effective for small-to-medium graphs.
 *
 * 4. **Path variant enforcement** — for Hamiltonian path problems, we ensure
 *    that the last unvisited node is forced to be `destinationNode` by
 *    skipping branches that would leave the destination unreachable.
 *
 * 5. **Event streaming** — emits `'visit'` for each DFS node, `'improve'`
 *    when a better tour is found, `'prune'` when a branch is discarded, and
 *    `'complete'` at the end.
 *
 * ## Complexity
 *
 * - **Time**: O(n!) worst case (no pruning), but usually much less.
 *   Empirically, n=15 runs in seconds; n=18 is near the 5-minute budget.
 * - **Space**: O(n^2) for the visited array + recursion stack (depth O(n)).
 *
 * ## Cancellation
 *
 * The DFS checks `signal.aborted` at the start of each recursive call and
 * short-circuits the entire search tree when cancellation is detected.
 */

import type { Algorithm, AlgorithmContext, AlgorithmResult } from './types';
import { ALGORITHM_LIMITS } from './limits';
import { cost, type Graph } from '@/lib/graph/types';

/**
 * Validates that the graph size does not exceed the B&B hard cap.
 *
 * @param graph - The graph to check.
 * @param max   - Maximum allowed nodes from ALGORITHM_LIMITS.
 * @throws Error if the graph is too large.
 */
function checkCap(graph: Graph, max: number): void {
  if (graph.n > max) {
    throw new Error(
      `Graph has ${graph.n} nodes, exceeding hard cap of ${max} for branch-and-bound.`,
    );
  }
}

/**
 * Returns the sum of the two smallest values in an array of numbers.
 *
 * This is a helper for the lower-bound computation. It scans the array once
 * maintaining the two smallest values seen. Handles edge cases:
 * - Empty array → 0
 * - Single element → that element
 * - Elements that are Infinity → ignored (treated as 0 contribution)
 *
 * @param arr - Array of edge costs incident to a node.
 * @returns Sum of the two smallest finite values in the array.
 */
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

/**
 * Computes a lower-bound estimate for completing a partial tour.
 *
 * The bound is computed as (sum over all nodes of the two cheapest incident
 * edges from among unvisited nodes) / 2. This works because every complete
 * tour must enter and leave each node exactly once (two edges per node), so
 * the cheapest possible tour cannot cost less than half the sum of the two
 * cheapest edges incident to each node — in the best case, those two cheapest
 * edges are exactly the ones used in the tour.
 *
 * Special handling per node type:
 *
 * - **Current node**: only considers outgoing edges to unvisited nodes
 *   (we only need ONE cheapest edge since the incoming edge was already paid).
 *
 * - **Start node (cycle mode)**: only considers incoming edges from unvisited
 *   nodes (the starting edge out was already taken).
 *
 * - **Start node (path mode)**: considers all outgoing edges to unvisited
 *   destinations (the start has no incoming edge to account for).
 *
 * - **Destination node (path mode)**: directly adds the edge cost from the
 *   current node to the destination, since in path mode the destination is
 *   reached in a single deterministic step.
 *
 * - **All other unvisited nodes**: standard two-smallest computation.
 *
 * @param g               - The graph.
 * @param visited         - Boolean array tracking visited nodes.
 * @param startNode       - The starting node index.
 * @param current         - The current (last visited) node index.
 * @param problemType     - 'cycle' or 'path'.
 * @param destinationNode - Required endpoint for 'path' mode.
 * @returns The lower-bound estimate (non-negative number).
 */
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
    // Visited nodes (except the current one) have their two edges already
    // accounted for in the tour cost, so we skip them.
    if (visited[i] && i !== current) continue;

    if (i === current) {
      // Current node: we only need the cheapest OUTGOING edge to an unvisited
      // node, since the incoming edge is already part of currentCost.
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
      // In cycle mode, the start node's outgoing edge was taken at depth 1.
      // We only need the cheapest INCOMING edge from an unvisited node to
      // close the cycle.
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
      // In path mode, the start node has no incoming edge. We take the two
      // cheapest outgoing edges.
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        if (!visited[j] || j === current) row.push(cost(g, i, j));
      }
      total += twoSmallest(row);
      continue;
    }

    if (problemType === 'path' && destinationNode !== undefined && i === destinationNode) {
      // The destination in path mode only needs one incoming edge (there is
      // no outgoing edge from it). We add the direct cost from current to
      // destination as the deterministic incoming edge.
      const fromCurrent = cost(g, current, i);
      total += fromCurrent;
      continue;
    }

    // Standard case for any other unvisited node: sum of two cheapest edges.
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      if (!visited[j] || j === current) row.push(cost(g, i, j));
    }
    total += twoSmallest(row);
  }
  // Divide by 2 because each edge is counted twice in the sum (once from each
  // of its two endpoints).
  return total / 2;
}

/**
 * The Branch and Bound algorithm implementation.
 *
 * Uses DFS with lower-bound pruning to find the optimal TSP tour or
 * Hamiltonian path. Guaranteed optimal, but O(n!) worst case.
 */
export const branchAndBound: Algorithm = {
  id: 'branch-and-bound',
  name: 'Branch & Bound',
  timeComplexity: 'O(n!) worst',
  spaceComplexity: 'O(n^2)',
  maxNodesRecommended: ALGORITHM_LIMITS['branch-and-bound'].maxNodesRecommended,
  maxNodesHard: ALGORITHM_LIMITS['branch-and-bound'].maxNodesHard,
  optimal: true,

  /**
   * Runs the Branch and Bound TSP solver.
   *
   * @param ctx - The {@link AlgorithmContext} with graph, parameters, signal,
   *              and event callback.
   * @returns A {@link AlgorithmResult} with the optimal tour (or partial
   *          result if aborted), plus pruning statistics.
   */
  async run(ctx: AlgorithmContext): Promise<AlgorithmResult> {
    checkCap(ctx.graph, ALGORITHM_LIMITS['branch-and-bound'].maxNodesHard);
    const t0 = ctx.now();
    const { graph, startNode, problemType, signal, onStep } = ctx;
    const n = graph.n;
    const destinationNode = ctx.destinationNode;

    // visited[i] is true when node i has been included in the current path.
    const visited = new Array<boolean>(n).fill(false);
    visited[startNode] = true;

    let bestCost = Number.POSITIVE_INFINITY;
    let bestTour: number[] = [];
    let explored = 0;
    let pruned = 0;
    let aborted = false;

    /**
     * Recursive DFS that builds tours by extending the current path one node
     * at a time.
     *
     * @param current     - The node most recently added to the path.
     * @param currentCost - The total edge cost of the path so far.
     * @param depth       - Number of nodes in the path (including startNode).
     * @param path        - The ordered list of visited node indices.
     */
    const dfs = (current: number, currentCost: number, depth: number, path: number[]): void => {
      // Bail out early if cancellation was requested.
      if (signal.aborted) {
        aborted = true;
        return;
      }

      explored++;
      onStep({ type: 'visit', tour: [...path], costSoFar: currentCost, depth });

      // --- Base case: all nodes visited ---
      if (problemType === 'path' && depth === n && destinationNode !== undefined) {
        // Path mode: if we ended at the destination, this is a valid path.
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
        // Cycle mode: add the return edge to close the tour.
        const total = currentCost + cost(graph, current, startNode);
        if (total < bestCost) {
          bestCost = total;
          bestTour = [...path];
          onStep({ type: 'improve', tour: bestTour, cost: bestCost });
        }
        return;
      }

      // --- Pruning check ---
      // Compute a lower bound on the cost to complete this partial tour.
      // If even the lower bound exceeds the best known tour, prune this branch.
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

      // --- Branch: try all unvisited neighbors ---
      for (let next = 0; next < n; next++) {
        if (visited[next]) continue;

        // For path mode: if only one unvisited node remains, it must be the
        // destination. Skip any other candidate to avoid invalid paths.
        if (problemType === 'path' && destinationNode !== undefined) {
          const remaining = n - depth;
          if (remaining === 1 && next !== destinationNode) continue;
        }

        visited[next] = true;
        path.push(next);
        dfs(next, currentCost + cost(graph, current, next), depth + 1, path);
        path.pop();
        visited[next] = false;

        // If cancellation was detected during the recursive call, stop
        // further branching.
        if (aborted) return;
      }
    };

    // Start DFS from the start node.
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
