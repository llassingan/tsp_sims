/**
 * index.ts — Algorithm Registry and Public API
 * ==============================================
 *
 * This module serves as the central registry for all TSP algorithm
 * implementations. It:
 *
 * 1. **Registers** each algorithm by its {@link AlgorithmId} in a
 *    `Readonly<Record>` map ({@link ALGORITHMS}). This map is consumed by the
 *    Web Worker harness to dispatch a `run()` call to the correct
 *    implementation based on the user's selection.
 *
 * 2. **Exposes `getAlgorithm()`** — a type-safe lookup function that returns
 *    the {@link Algorithm} singleton for a given ID, or throws if the ID is
 *    unrecognized. This is the single entry point used by the worker to
 *    instantiate and run an algorithm.
 *
 * 3. **Re-exports all public types** (`Algorithm`, `AlgorithmId`,
 *    `AlgorithmContext`, `AlgorithmStep`, `AlgorithmResult`) so that consumers
 *    (the worker, the React frontend, and tests) can import everything from
 *    a single path: `@/algorithms`.
 *
 * ## Adding a new algorithm
 *
 * To add a new TSP algorithm to the simulator:
 *
 * 1. Create a new file `src/algorithms/<id>.ts` exporting an `Algorithm`.
 * 2. Add the ID to the `AlgorithmId` union in `types.ts`.
 * 3. Add node limits to `ALGORITHM_LIMITS` in `limits.ts`.
 * 4. Import and register it in `ALGORITHMS` below.
 * 5. Add an entry to the UI algorithm selector (frontend concern, outside
 *    this module).
 */

import type { Algorithm, AlgorithmId } from './types';
import { bruteForce } from './brute-force';
import { branchAndBound } from './branch-and-bound';
import { heldKarp } from './held-karp';
import { nearestNeighbor } from './nearest-neighbor';

/**
 * The algorithm registry: a read-only mapping from {@link AlgorithmId} to
 * the corresponding {@link Algorithm} implementation singleton.
 *
 * Used by the Web Worker harness to dispatch computation requests:
 *
 * ```
 * const alg = ALGORITHMS[selectedId];
 * const result = await alg.run(context);
 * ```
 */
export const ALGORITHMS: Readonly<Record<AlgorithmId, Algorithm>> = {
  'brute-force': bruteForce,
  'branch-and-bound': branchAndBound,
  'held-karp': heldKarp,
  'nearest-neighbor': nearestNeighbor,
};

/**
 * Looks up an {@link Algorithm} by its string ID.
 *
 * @param id - The algorithm identifier (e.g. `'held-karp'`).
 * @returns The corresponding {@link Algorithm} singleton.
 * @throws Error if `id` is not a recognized {@link AlgorithmId}.
 *
 * Usage:
 * ```
 * const alg = getAlgorithm('branch-and-bound');
 * console.log(alg.name); // "Branch & Bound"
 * ```
 */
export function getAlgorithm(id: AlgorithmId): Algorithm {
  const a = ALGORITHMS[id];
  if (!a) throw new Error(`Unknown algorithm: ${id}`);
  return a;
}

export type { Algorithm, AlgorithmId, AlgorithmContext, AlgorithmStep, AlgorithmResult } from './types';
