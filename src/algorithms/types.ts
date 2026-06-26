/**
 * types.ts — Common Type Definitions for TSP Algorithms
 * =======================================================
 *
 * This file defines the contract that every TSP algorithm in the simulator must
 * satisfy. All algorithms are implemented as pure functions (no DOM or React
 * dependencies) and run inside a Web Worker for non-blocking computation. The
 * types here form the boundary between the worker thread and the UI thread:
 * the worker receives an {@link AlgorithmContext}, processes the graph, and
 * returns an {@link AlgorithmResult}.
 *
 * ## Problem Variants
 *
 * The simulator supports two TSP variants selected by {@link ProblemType}:
 *
 * - **cycle** — classic TSP: find a Hamiltonian cycle that visits every node
 *   exactly once and returns to `startNode`. The total cost includes the
 *   edge from the last node back to the start.
 * - **path**  — Hamiltonian-path variant: find a path that visits every node
 *   exactly once, starting at `startNode` and ending at `destinationNode`.
 *   The return edge is omitted; only the one-way path cost is computed.
 *
 * ## Communication Model (Worker <-> UI)
 *
 * Algorithms emit streaming events via the `onStep` callback so the UI can
 * animate the search in real time. Each event is a discriminated union of
 * {@link AlgorithmStep} types:
 *
 * - `visit`    — a partial tour is being explored (permutation or DFS step)
 * - `improve`  — a new best tour has been found
 * - `prune`    — a branch was discarded by a bound (B&B only)
 * - `progress` — coarse-grained percentage estimate (Held-Karp DP only)
 * - `milestone`— a notable algorithmic checkpoint
 * - `complete` — final result, emitted at the end of computation
 *
 * ## Cancellation
 *
 * Each algorithm receives an `AbortSignal` via {@link AlgorithmContext.signal}.
 * Algorithms MUST periodically check `signal.aborted` and bail out early when
 * the user cancels computation or the global timeout expires. The helpers
 * {@link isAborted} and {@link checkAborted} provide a consistent pattern for
 * this check.
 *
 * ## Time Measurement
 *
 * Instead of `Date.now()`, algorithms use `ctx.now()` for time measurement.
 * This allows the worker harness to substitute a high-resolution timer
 * (e.g. `performance.now()`) and makes testing with mocked time trivial.
 */

import type { Graph } from '@/lib/graph/types';

/** Unique identifier for each algorithm in the registry. */
export type AlgorithmId = 'brute-force' | 'branch-and-bound' | 'held-karp' | 'nearest-neighbor';

/** The TSP variant: find a Hamiltonian cycle or a Hamiltonian path. */
export type ProblemType = 'cycle' | 'path';

/**
 * Graph symmetry mode.
 *
 * - `symmetric`  — cost(i, j) === cost(j, i) for all i, j (default).
 * - `asymmetric` — cost(i, j) may differ from cost(j, i); the graph is a
 *                  complete digraph with potentially different edge weights in
 *                  each direction.
 */
export type GraphType = 'symmetric' | 'asymmetric';

/**
 * The "sandbox" provided to every algorithm's `run()` method.
 *
 * Contains everything the algorithm needs to operate: the graph data, problem
 * parameters, a cancellation signal, an event emitter for streaming progress
 * to the UI, and a time-measurement function.
 */
export interface AlgorithmContext {
  /** The complete weighted graph to search. */
  readonly graph: Graph;
  /** Index of the starting node (the tour must begin here). */
  readonly startNode: number;
  /**
   * For the "path" variant, the required endpoint.
   * Undefined for "cycle" variant.
   */
  readonly destinationNode?: number;
  /** Whether to solve the classic TSP cycle or the Hamiltonian path variant. */
  readonly problemType: ProblemType;
  /** The [min, max] range of edge weights in the graph (for normalization). */
  readonly weightRange: readonly [number, number];
  /**
   * An AbortSignal that is triggered when the user cancels computation or the
   * global timeout expires. Algorithms should check this frequently and bail
   * out with a partial/timedOut result rather than spinning indefinitely.
   */
  readonly signal: AbortSignal;
  /**
   * Callback for emitting streaming events to the UI thread.
   * Each call pushes one {@link AlgorithmStep} into the event channel.
   */
  readonly onStep: (step: AlgorithmStep) => void;
  /**
   * Monotonic timestamp function (milliseconds) for measuring compute duration.
   * Use this instead of `Date.now()` so the harness can provide
   * `performance.now()` in the worker or a mocked clock in tests.
   */
  readonly now: () => number;
}

/**
 * A discriminated union of streaming events emitted during algorithm execution.
 *
 * The UI thread consumes these in order to animate the search:
 *
 * - `visit`     — fired for every partial tour examined. Used to draw the
 *                 current exploration path and the running cost.
 * - `improve`   — fired when a tour cheaper than the previous best is found.
 *                 The UI highlights this as a new incumbent solution.
 * - `prune`     — fired when a branch is discarded without further exploration.
 *                 Includes the bound that caused the prune and a human-readable
 *                 reason string.
 * - `progress`  — coarse-grained completion estimate. `explored` and `total`
 *                 are approximate; `total` may be `'unknown'` for algorithms
 *                 that cannot predict the total search space size.
 * - `milestone` — informational checkpoint (e.g. "DP table filled").
 * - `complete`  — final result, emitted exactly once at the end of successful
 *                 computation.
 */
export type AlgorithmStep =
  | {
      type: 'visit';
      /** The partial or full tour visited so far (ordered node indices). */
      tour: readonly number[];
      /** Running cost of the tour edges traversed so far. */
      costSoFar: number;
      /** Number of nodes in the current tour (including start). */
      depth: number;
    }
  | {
      type: 'improve';
      /** The full tour that achieved a new best cost. */
      tour: readonly number[];
      /** The total cost of the new best tour. */
      cost: number;
    }
  | {
      type: 'prune';
      /** The partial tour that was pruned before completion. */
      partialTour: readonly number[];
      /** The lower bound estimate for the branch (costSoFar + lowerBound). */
      lowerBound: number;
      /** Human-readable reason for the prune (e.g. "bound", "infeasible"). */
      reason: string;
    }
  | {
      type: 'progress';
      /** Approximate number of units explored so far (masks, permutations, etc.). */
      explored: number;
      /** Approximate total units to explore, or `'unknown'` if unpredictable. */
      total: number | 'unknown';
    }
  | {
      type: 'milestone';
      /** Human-readable description of the milestone reached. */
      note: string;
    }
  | {
      type: 'complete';
      /** The final best tour found (empty array if no tour found). */
      tour: readonly number[];
      /** The total cost of the final tour (POSITIVE_INFINITY if no tour). */
      cost: number;
    };

/**
 * The final result returned by every algorithm after `run()` completes (or is
 * cancelled/timed out).
 *
 * This is the structured output consumed by the UI to display the solution and
 * summary statistics.
 */
export interface AlgorithmResult {
  /** The best tour found (node indices in order). May be empty on abort. */
  readonly tour: readonly number[];
  /** Total cost of the best tour, or POSITIVE_INFINITY if none found. */
  readonly cost: number;
  /** Number of partial solutions examined (permutations, DP states, etc.). */
  readonly explored: number;
  /** Number of branches pruned without full exploration (always 0 for BF/HK/NN). */
  readonly pruned: number;
  /** Wall-clock time spent computing, measured via `ctx.now()` (milliseconds). */
  readonly computeTimeMs: number;
  /** True if computation was aborted (by user or timeout) before finishing. */
  readonly timedOut: boolean;
}

/**
 * The contract that every algorithm implementation must satisfy.
 *
 * Each algorithm is a singleton object exported from its own module and
 * registered in {@link ALGORITHMS}. The `run()` method is the entry point
 * called by the Web Worker harness.
 *
 * ## Properties
 *
 * - `id`                 — unique key used in the registry and UI selector.
 * - `name`               — human-readable display name.
 * - `timeComplexity`     — asymptotic worst-case time complexity (e.g. "O(n!)").
 * - `spaceComplexity`    — asymptotic worst-case space complexity.
 * - `maxNodesRecommended`— node count where the algorithm is still comfortably fast.
 * - `maxNodesHard`       — absolute cap; graphs larger than this are rejected.
 * - `optimal`            — whether the algorithm is guaranteed to find the true
 *                          optimal tour (true for BF, B&B, HK; false for NN).
 * - `run(ctx)`           — the async entry point. Receives an
 *                          {@link AlgorithmContext} and returns an
 *                          {@link AlgorithmResult}.
 */
export interface Algorithm {
  readonly id: AlgorithmId;
  readonly name: string;
  readonly timeComplexity: string;
  readonly spaceComplexity: string;
  readonly maxNodesRecommended: number;
  readonly maxNodesHard: number;
  readonly optimal: boolean;
  run(ctx: AlgorithmContext): Promise<AlgorithmResult>;
}

/**
 * Returns true if the given AbortSignal has already been triggered.
 *
 * Useful as a quick guard before entering expensive inner loops:
 *
 * ```
 * if (isAborted(signal)) return;
 * ```
 */
export function isAborted(signal: AbortSignal): boolean {
  return signal.aborted;
}

/**
 * Throws a DOMException with name `"AbortError"` if the signal has been
 * triggered. This is the idiomatic way to bail out of an algorithm when
 * cancellation is detected from inside a synchronous code path.
 *
 * The thrown error is caught by the worker harness and treated as a normal
 * cancellation (result.timedOut = true), not a runtime crash.
 */
export function checkAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}
