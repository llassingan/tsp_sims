/**
 * Web Worker Message Protocol
 * ============================
 * Defines the contract between the main (UI) thread and the algorithm Web Worker.
 *
 * Data flow overview:
 *   Main Thread                            Worker Thread
 *   -----------                            -------------
 *   1. Posts WorkerInbound { type: 'run', request: RunRequest }
 *                                          2. Deserializes RunRequest.graph
 *                                          3. Runs the TSP algorithm
 *                                          4. Streams back WorkerEvents:
 *                                             - 'step'   → per-algorithm-step progress
 *                                             - 'result' → final solution (tour + cost)
 *                                             - 'error'  → unexpected failure
 *                                             - 'timeout'→ 5-min hard limit reached
 *   5. Receives WorkerEvents, filters by runId
 *   6. Posts WorkerCancel { type: 'cancel' } to abort a running computation
 *
 * Every outbound WorkerEvent carries a `runId` so the main thread can reject
 * stale events from a prior run that finished after a new run already started.
 * The main thread also uses `runId` to target a specific computation for cancellation.
 *
 * Graph serialization note: the graph's Float32Array weights are sent as a
 * plain number[] because Float32Array does not survive the structured clone
 * algorithm used by postMessage. The worker reconstitutes the Float32Array on
 * receipt (see serializeGraph in algorithm.worker.ts).
 */

import type { AlgorithmId, AlgorithmStep, AlgorithmResult } from '@/algorithms/types';
import type { GraphType, ProblemType } from '@/algorithms/types';

/**
 * Sent from the main thread to the worker to start a new algorithm run.
 * All fields are readonly -- once a run begins its parameters are immutable.
 */
export interface RunRequest {
  /** Unique identifier for this run; echoed back in every WorkerEvent for correlation. */
  readonly runId: string;
  /** Which TSP algorithm to execute (BruteForce, BranchAndBound, HeldKarp, NearestNeighbor). */
  readonly algorithmId: AlgorithmId;
  /** Serialized graph data. Weights are a flat number[] because Float32Array
   *  is not structured-cloneable; the worker reconstitutes it on receipt. */
  readonly graph: {
    readonly nodes: readonly { id: number; x: number; y: number }[];
    readonly weights: number[];
    readonly n: number;
    readonly type: GraphType;
  };
  /** Index of the starting node (0-based). */
  readonly startNode: number;
  /** Destination node index (0-based) for Hamiltonian-path problems, or null for TSP tour problems. */
  readonly destinationNode: number | null;
  /** Whether this is a 'tour' (return to start) or 'path' (fixed endpoints) problem. */
  readonly problemType: ProblemType;
  /** The [min, max] range of generated edge weights, used for display scaling. */
  readonly weightRange: readonly [number, number];
}

/**
 * Events streamed from the worker back to the main thread.
 * Every variant carries a `runId` so the orchestrator can discard events
 * that belong to a superseded or cancelled run.
 */
export type WorkerEvent =
  | {
      /** Matches the originating RunRequest.runId. */
      runId: string;
      type: 'step';
      /** Incremental exploration step: visit, improve, or prune. */
      step: AlgorithmStep;
    }
  | {
      runId: string;
      type: 'result';
      /** Final algorithm output: best tour, cost, and exploration stats. */
      result: AlgorithmResult;
    }
  | {
      runId: string;
      type: 'error';
      /** Human-readable error description. */
      message: string;
    }
  | {
      runId: string;
      type: 'timeout';
    };

/**
 * Posted from the main thread to the worker to initiate a run.
 * The worker responds by streaming back WorkerEvents.
 */
export interface WorkerInbound {
  readonly type: 'run';
  readonly request: RunRequest;
}

/**
 * Posted from the main thread to the worker to abort a running computation.
 * Identified by `runId` so the correct AbortController is signaled.
 */
export interface WorkerCancel {
  readonly type: 'cancel';
  /** Must match the runId of the active run to cancel. */
  readonly runId: string;
}

/**
 * Union of all messages the main thread may send to the worker.
 */
export type WorkerMessage = WorkerInbound | WorkerCancel;
