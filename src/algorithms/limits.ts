/**
 * limits.ts — Per-Algorithm Node Limits and Global Timeout
 * ==========================================================
 *
 * This file defines the maximum graph sizes each algorithm can handle within a
 * reasonable compute budget. The limits serve two purposes:
 *
 * 1. **Recommended limit** (`maxNodesRecommended`) — the largest graph size
 *    for which the algorithm completes comfortably fast (typically under 10
 *    seconds) in the browser. The UI uses this to suggest a default node count.
 *
 * 2. **Hard limit** (`maxNodesHard`) — the absolute maximum. Graphs larger
 *    than this are rejected outright by each algorithm's `checkCap()` guard.
 *    This prevents the browser tab from freezing due to an accidental
 *    exponential explosion. The hard limits are calibrated against a 5-minute
 *    compute budget on a mid-range CPU.
 *
 * ## Limit Rationale per Algorithm
 *
 * | Algorithm          | Recommended | Hard | Rationale                                                                 |
 * |--------------------|-------------|------|---------------------------------------------------------------------------|
 * | Brute Force        | 9           | 11   | (n-1)! permutations. 10! ≈ 3.6M; 11! ≈ 40M — near the edge of 5 min.    |
 * | Branch & Bound     | 15          | 18   | O(n!) worst case, but bounding typically prunes >99% of branches at n=15. |
 * | Held-Karp DP       | 18          | 20   | n^2 * 2^n states. At n=20: 400 * 1M = 400M ops — tight for 5 min budget. |
 * | Nearest Neighbor   | 200         | 500  | Greedy O(n^2) is fast; the 500 cap is driven by rendering, not compute.   |
 *
 * ## Global Hard Timeout
 *
 * `GLOBAL_HARD_TIMEOUT_MS` (5 minutes) is enforced by the worker harness. Even
 * if an algorithm doesn't check `signal.aborted` frequently enough, the harness
 * will abort the worker after this timeout. This is a safety net, not a
 * replacement for cooperative cancellation — algorithms that check the signal
 * regularly will produce a partial result instead of just being killed.
 */

import type { AlgorithmId } from './types';

/**
 * Per-algorithm capacity limits.
 *
 * Both limits are inclusive: a graph with exactly `maxNodesHard` nodes is
 * allowed (but will likely be slow).
 */
export interface AlgorithmLimits {
  /** Graph size for which the algorithm is comfortably fast. */
  readonly maxNodesRecommended: number;
  /** Absolute maximum graph size; larger graphs are rejected. */
  readonly maxNodesHard: number;
}

/**
 * Node limits for each algorithm, keyed by {@link AlgorithmId}.
 *
 * ## Brute Force: maxNodesHard = 11
 *
 * Brute force enumerates all (n-1)! permutations of the non-start nodes.
 * At n=11 there are 10! = 3,628,800 permutations, which takes roughly
 * 10-60 seconds in a browser JavaScript engine. At n=12 (11! = ~40M) it
 * would exceed the 5-minute budget, so 11 is the hard cap with a very
 * conservative recommended cap of 9 (~40K permutations, near-instant).
 *
 * ## Branch & Bound: maxNodesHard = 18
 *
 * Branch and bound is O(n!) worst-case but pruning via lower-bound
 * heuristics typically eliminates the vast majority of branches. At n=18
 * the search tree has 18! ≈ 6.4 * 10^15 nodes, but bounding and pruning
 * bring the explored count down to millions — feasible within 5 minutes.
 * At n=15 it completes in seconds for most graph instances.
 *
 * ## Held-Karp: maxNodesHard = 20
 *
 * The DP table has n * 2^n entries. At n=20 this is 20 * 1,048,576 ≈ 21M
 * cells, each requiring O(n) work for the inner minimization loop, totaling
 * ~400M operations. This fits within a 5-minute budget on modern hardware
 * but is already slow. At n=21 it doubles to ~880M ops — beyond budget.
 *
 * ## Nearest Neighbor: maxNodesHard = 500
 *
 * The greedy Nearest Neighbor algorithm is O(n^2) with no backtracking,
 * so 500^2 = 250K edge lookups — trivial. The limit exists primarily because
 * the UI canvas rendering becomes the bottleneck beyond a few hundred nodes,
 * not because of algorithmic complexity.
 */
export const ALGORITHM_LIMITS: Readonly<Record<AlgorithmId, AlgorithmLimits>> = {
  'brute-force': { maxNodesRecommended: 9, maxNodesHard: 11 },
  'branch-and-bound': { maxNodesRecommended: 15, maxNodesHard: 18 },
  'held-karp': { maxNodesRecommended: 18, maxNodesHard: 20 },
  'nearest-neighbor': { maxNodesRecommended: 200, maxNodesHard: 500 },
};

/**
 * Global timeout enforced by the Web Worker harness (5 minutes = 300,000 ms).
 *
 * If an algorithm exceeds this duration without completing, the harness aborts
 * the worker. Cooperative algorithms that check `signal.aborted` periodically
 * will receive the abort signal earlier and can return a partial result.
 * Non-cooperative algorithms (e.g. an infinite loop in a tight computation)
 * will be forcibly terminated when this timeout fires.
 */
export const GLOBAL_HARD_TIMEOUT_MS = 5 * 60 * 1000;
