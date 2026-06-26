/**
 * held-karp.ts — Held-Karp Dynamic Programming TSP / Hamiltonian-Path Solver
 * ===========================================================================
 *
 * ## Algorithm Overview
 *
 * The Held-Karp algorithm (also known as the Bellman-Held-Karp DP) solves TSP
 * exactly using dynamic programming over subsets of nodes. It is the fastest
 * exact algorithm known for the general TSP, but still exponential: O(n^2 * 2^n).
 *
 * ## How it works
 *
 * 1. **DP state**: `dp[mask][i]` = minimum cost of a path that starts at
 *    `startNode`, visits exactly the set of nodes encoded by `mask` (where
 *    bit j = 1 means node j is visited), and ends at node `i`.
 *
 * 2. **Base case**: `dp[{startNode}][startNode] = 0` — it costs nothing to
 *    "visit" just the start node.
 *
 * 3. **Transition**: for each state `(mask, i)` with finite cost, try all
 *    unvisited neighbors `j` (where bit j = 0 in mask):
 *    ```
 *    dp[mask | {j}][j] = min(dp[mask | {j}][j], dp[mask][i] + cost(i, j))
 *    ```
 *
 * 4. **Bitmask encoding**: masks are integers from 1 to (1<<n)-1. Bit k
 *    being set means node k is in the subset. `fullMask = (1<<n)-1` encodes
 *    the set of all nodes.
 *
 * 5. **Answer extraction (cycle mode)**: the optimal tour cost is:
 *    ```
 *    min over i of dp[fullMask][i] + cost(i, startNode)
 *    ```
 *
 * 6. **Answer extraction (path mode)**: the optimal path cost is simply:
 *    ```
 *    dp[fullMask][destinationNode]
 *    ```
 *
 * 7. **Tour reconstruction**: we maintain a `parent[mask][i]` back-pointer
 *    that stores the predecessor node in the optimal path. Starting from the
 *    end node at fullMask, we trace backwards through the parent table,
 *    then reverse the result to get the forward tour.
 *
 * ## Data structures
 *
 * The DP table is stored as a flat `Float32Array` of size `n * (1<<n)` to
 * minimize memory overhead. `dp[i * (1<<n) + mask]` maps to `dp[mask][i]`.
 * Similarly, `parent` is a flat `Int32Array`. At n=20 this requires
 * `20 * 1,048,576 * (4 + 4) = ~168 MB`.
 *
 * ## Complexity
 *
 * - **Time**: O(n^2 * 2^n) — for each of the 2^n masks, we iterate over n
 *   nodes, and for each node we try up to n outgoing edges.
 * - **Space**: O(n * 2^n) — two flat arrays (dp and parent) of size n * 2^n.
 *
 * ## Progress reporting
 *
 * Since the DP processes masks in increasing order (from 1 to fullMask), we
 * emit `'progress'` events approximately every 1% of masks processed. This
 * gives the UI a coarse but accurate progress bar.
 *
 * ## Cancellation
 *
 * Abort signal is checked once per mask iteration (outer loop). If triggered,
 * we break out and return `{ tour: [], cost: Infinity, timedOut: true }`.
 * Partial results are not returned because the DP table may be incomplete.
 */

import type { Algorithm, AlgorithmContext, AlgorithmResult } from './types';
import { ALGORITHM_LIMITS } from './limits';
import { cost, type Graph } from '@/lib/graph/types';

/**
 * Rejects graphs exceeding the Held-Karp hard cap.
 *
 * @param graph - Graph to validate.
 * @param max   - Maximum allowed nodes.
 * @throws Error if graph is too large.
 */
function checkCap(graph: Graph, max: number): void {
  if (graph.n > max) {
    throw new Error(
      `Graph has ${graph.n} nodes, exceeding hard cap of ${max} for held-karp.`,
    );
  }
}

/** Sentinel value for unreachable DP states. */
const INF = Number.POSITIVE_INFINITY;

/**
 * The Held-Karp DP algorithm implementation.
 *
 * Uses dynamic programming over node subsets (bitmasks) to compute the exact
 * optimal TSP tour or Hamiltonian path. Guaranteed optimal; O(n^2 * 2^n) time
 * and O(n * 2^n) space.
 */
export const heldKarp: Algorithm = {
  id: 'held-karp',
  name: 'Held-Karp DP',
  timeComplexity: 'O(n^2 * 2^n)',
  spaceComplexity: 'O(n * 2^n)',
  maxNodesRecommended: ALGORITHM_LIMITS['held-karp'].maxNodesRecommended,
  maxNodesHard: ALGORITHM_LIMITS['held-karp'].maxNodesHard,
  optimal: true,

  /**
   * Runs the Held-Karp DP TSP solver.
   *
   * @param ctx - The {@link AlgorithmContext}.
   * @returns The {@link AlgorithmResult} with the optimal tour and cost,
   *          or a timedOut result if aborted.
   */
  async run(ctx: AlgorithmContext): Promise<AlgorithmResult> {
    checkCap(ctx.graph, ALGORITHM_LIMITS['held-karp'].maxNodesHard);
    const t0 = ctx.now();
    const { graph, startNode, problemType, signal, onStep } = ctx;
    const n = graph.n;
    const destinationNode = ctx.destinationNode;

    // Bitmask with all n bits set: represents the set of all nodes.
    const fullMask = (1 << n) - 1;

    // Total number of DP table cells: n * 2^n.
    const totalCells = n * (1 << n);

    // Flat DP table: dp[i * (1<<n) + mask] stores the min cost to reach
    // state (mask, i). Using Float32Array for memory efficiency (4 bytes/cell
    // vs 8 bytes for a regular JS number array).
    const dp = new Float32Array(totalCells);

    // Flat parent table: parent[i * (1<<n) + mask] stores the predecessor
    // node that achieved the optimal dp value. -1 means no predecessor.
    const parent = new Int32Array(totalCells);

    // Initialize all DP cells to INF (unreachable) and parents to -1.
    for (let i = 0; i < totalCells; i++) {
      dp[i] = INF;
      parent[i] = -1;
    }

    // Base case: cost 0 to start at startNode with only startNode visited.
    const startMask = 1 << startNode;
    dp[startNode * (1 << n) + startMask] = 0;

    const totalMasks = 1 << n;
    // Emit progress roughly every 1% of masks processed.
    const progressEvery = Math.max(1, Math.floor(totalMasks / 100));
    let explored = 0;
    let aborted = false;

    // --- Main DP loop over masks ---
    // Process masks in increasing order. Because adding a node always
    // increases the mask value, we can iterate linearly from 1 to fullMask
    // without explicitly sorting by set size.
    for (let mask = 1; mask < totalMasks; mask++) {
      // Coarse progress check: emit a progress event approximately every 1%.
      if ((mask & (progressEvery - 1)) === 0) {
        if (signal.aborted) {
          aborted = true;
          break;
        }
        onStep({ type: 'progress', explored: mask, total: totalMasks });
      }

      // Try every node i as the endpoint of the path represented by `mask`.
      for (let i = 0; i < n; i++) {
        // Skip if node i is not in the current mask.
        if (((mask >> i) & 1) === 0) continue;

        const baseIdx = i * totalMasks + mask;
        const current = dp[baseIdx] ?? INF;
        if (current === INF) continue; // Unreachable state, skip.

        // Try extending the path to all unvisited nodes j.
        for (let j = 0; j < n; j++) {
          // Skip if node j is already visited.
          if (((mask >> j) & 1) === 1) continue;

          // For path mode: if this is the penultimate step (one node left to
          // visit), force j to be the destination.
          if (problemType === 'path' && destinationNode !== undefined) {
            // The mask that has all nodes except destinationNode visited.
            if (mask === (fullMask ^ (1 << destinationNode)) && j !== destinationNode) {
              continue;
            }
          }

          const newMask = mask | (1 << j);
          const w = cost(graph, i, j);
          if (w === INF) continue; // Skip if no edge exists (shouldn't happen for complete graph).

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

    // --- Extract the answer from the DP table ---
    let endNode = startNode;
    let bestCost = INF;

    if (problemType === 'path' && destinationNode !== undefined) {
      // Path mode: the answer is simply dp[fullMask][destinationNode].
      endNode = destinationNode;
      bestCost = dp[endNode * totalMasks + fullMask] ?? INF;
    } else {
      // Cycle mode: try all possible endpoints and add the return edge to
      // startNode. Pick the minimum.
      for (let i = 0; i < n; i++) {
        const c = (dp[i * totalMasks + fullMask] ?? INF) + cost(graph, i, startNode);
        if (c < bestCost) {
          bestCost = c;
          endNode = i;
        }
      }
    }

    // --- Reconstruct the tour from the parent back-pointers ---
    const tour: number[] = [];
    if (bestCost !== INF && bestCost < Number.POSITIVE_INFINITY) {
      let cur = endNode;
      let m = fullMask;

      // Walk backwards from the end node, removing one node at a time from
      // the mask and following the parent pointer.
      while (cur !== -1 && m !== 0) {
        tour.push(cur);
        const idx = cur * totalMasks + m;
        const prev = parent[idx] ?? -1;
        const prevMask = m ^ (1 << cur);

        // Safety check: if we can't find a predecessor but we haven't
        // reached the empty mask, something is wrong — break to avoid
        // infinite loop.
        if (prev === -1 && prevMask !== 0) break;
        cur = prev;
        m = prevMask;
        // Safety guard against corrupted parent pointers causing infinite loop.
        if (tour.length > n) break;
      }

      // The reconstruction walked backwards, so reverse to get forward order.
      tour.reverse();

      // For cycle mode, append the return to start for visual consistency.
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
