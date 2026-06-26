/**
 * Web Worker Entry Point -- TSP Algorithm Runner
 * ==============================================
 * This file is loaded as a DedicatedWorkerGlobalScope by Vite (type: 'module').
 * It executes TSP algorithms off the main UI thread so that expensive
 * computations do not block rendering or user interaction.
 *
 * Lifecycle of a run:
 *   1. Main thread posts a 'run' message containing a serialized RunRequest.
 *   2. The worker creates an AbortController and a 5-minute timeout watchdog
 *      (GLOBAL_HARD_TIMEOUT_MS). The timeout fires AbortController.abort()
 *      to stop runaway computations.
 *   3. serializeGraph() reconstitutes the Float32Array weights from the
 *      plain number[] sent over postMessage (Float32Array is not structured-cloneable).
 *   4. buildContext() assembles an AlgorithmContext -- the unified API that
 *      every algorithm implementation receives. It wires the AbortSignal so
 *      algorithms can periodically check for cancellation, hooks up the
 *      onStep callback to stream step events back to the main thread, and
 *      provides a now() timer for performance instrumentation.
 *   5. The selected algorithm's async run() function is invoked. As it
 *      explores the solution space it calls ctx.onStep(), which posts
 *      'step' WorkerEvents to the main thread.
 *   6. On completion the worker posts a 'result' event (unless aborted).
 *   7. If the algorithm throws AbortError (timeout watchdog or user cancel),
 *      a 'timeout' event is posted. Other errors produce 'error' events.
 *   8. The worker stores AbortControllers keyed by runId in a Map so that
 *      cancel messages from the main thread can target a specific run.
 *   9. In the finally block, the timeout timer is cleared and the
 *      AbortController is removed from the Map.
 *
 * Cancel flow:
 *   When the main thread posts { type: 'cancel', runId }, the worker looks
 *   up the AbortController for that runId and calls abort(). The algorithm's
 *   next signal check will throw an AbortError, caught in the try/catch.
 *
 * Stale event guard:
 *   No guard is needed on the worker side because a cancelled run's
 *   AbortController is immediately aborted; any in-flight onStep calls
 *   are short-circuited by the `if (controller.signal.aborted) return`
 *   check inside buildContext(). The main thread is responsible for
 *   discarding late-arriving events via runId comparison.
 */

/// <reference lib="webworker" />
import { ALGORITHMS } from '@/algorithms';
import { makeGraph } from '@/lib/graph/types';
import { GLOBAL_HARD_TIMEOUT_MS } from '@/algorithms/limits';
import type { AlgorithmContext } from '@/algorithms/types';
import type { RunRequest, WorkerEvent, WorkerMessage } from './protocol';

/** Typed alias for the worker's global scope. */
const ctx = self as unknown as DedicatedWorkerGlobalScope;

/**
 * Registry of AbortControllers, keyed by runId.
 * Allows the main thread to cancel a specific running computation
 * via a 'cancel' message without affecting other runs.
 */
const controllers = new Map<string, AbortController>();

/**
 * Helper to post a typed WorkerEvent back to the main thread.
 */
function post(event: WorkerEvent): void {
  ctx.postMessage(event);
}

/**
 * Reconstitutes graph data from the serialized form received via postMessage.
 *
 * The main thread sends weights as a plain number[] because Float32Array
 * is not supported by the structured clone algorithm. This function
 * creates a new Float32Array from that array so downstream algorithms
 * can use typed-array performance.
 *
 * @param g - The serialized graph from RunRequest.
 * @returns A graph object with Float32Array weights and the original nodes.
 */
function serializeGraph(g: RunRequest['graph']): {
  nodes: ReadonlyArray<{ id: number; x: number; y: number }>;
  weights: Float32Array;
  n: number;
  type: 'symmetric' | 'asymmetric';
} {
  const weights = new Float32Array(g.weights);
  const nodes = g.nodes;
  return {
    nodes,
    weights,
    n: g.n,
    type: g.type,
  };
}

/**
 * Builds an AlgorithmContext from a RunRequest and AbortController.
 *
 * The context is the single argument every algorithm's `run()` function
 * receives. It provides:
 *  - graph:        the TSP graph instance
 *  - startNode:    where the tour/path begins
 *  - signal:       AbortSignal for cooperative cancellation
 *  - onStep:       callback that posts 'step' events to the main thread;
 *                  silently drops steps if already aborted
 *  - now():        high-resolution timer for performance tracking
 *  - destinationNode: included for Hamiltonian-path problems only
 *
 * @param request     - The incoming run request from the main thread.
 * @param controller  - The AbortController for this run (cancellation + timeout).
 * @param runId       - Echoed into every posted WorkerEvent.
 * @returns A fully-wired AlgorithmContext ready to pass to the algorithm.
 */
function buildContext(
  request: RunRequest,
  controller: AbortController,
  runId: string,
): AlgorithmContext {
  const graphObj = serializeGraph(request.graph);
  const graph = makeGraph(graphObj.nodes, graphObj.weights, graphObj.type);
  return {
    graph,
    startNode: request.startNode,
    problemType: request.problemType,
    weightRange: request.weightRange,
    signal: controller.signal,
    onStep: (step) => {
      // Drop the step if we've already been aborted -- avoids posting
      // steps that arrive after a timeout/cancel event.
      if (controller.signal.aborted) return;
      post({ runId, type: 'step', step });
    },
    now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    ...(request.destinationNode !== null
      ? { destinationNode: request.destinationNode }
      : {}),
  };
}

/**
 * Executes a TSP algorithm run in response to a 'run' message from the main thread.
 *
 * Steps:
 *  1. Register an AbortController for this runId.
 *  2. Set a GLOBAL_HARD_TIMEOUT_MS timer that aborts if the algorithm runs too long.
 *  3. Look up the algorithm implementation from the ALGORITHMS registry.
 *  4. Build the AlgorithmContext and invoke algo.run().
 *  5. On success: post a 'result' event (or 'timeout' if the signal was aborted).
 *  6. On AbortError (thrown by timeout watchdog or user cancel): post 'timeout'.
 *  7. On other errors: post 'error' with the error message.
 *  8. In finally: clear the timeout timer and remove the AbortController.
 *
 * @param msg - The inbound 'run' message carrying the RunRequest.
 */
async function run(msg: Extract<WorkerMessage, { type: 'run' }>): Promise<void> {
  const { request } = msg;
  const { runId } = request;
  const controller = new AbortController();
  controllers.set(runId, controller);

  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, GLOBAL_HARD_TIMEOUT_MS);

  try {
    const algo = ALGORITHMS[request.algorithmId];
    if (!algo) {
      post({ runId, type: 'error', message: `Unknown algorithm: ${request.algorithmId}` });
      return;
    }
    const ctx2 = buildContext(request, controller, runId);
    const result = await algo.run(ctx2);
    if (controller.signal.aborted) {
      // Algorithm completed but the timeout fired in the meantime.
      post({ runId, type: 'timeout' });
    } else {
      post({ runId, type: 'result', result });
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // Cooperative cancellation (timeout watchdog or user-initiated cancel).
      post({ runId, type: 'timeout' });
    } else {
      const message = err instanceof Error ? err.message : String(err);
      post({ runId, type: 'error', message });
    }
  } finally {
    clearTimeout(timeoutHandle);
    controllers.delete(runId);
  }
}

/**
 * Handles a 'cancel' message from the main thread by aborting the
 * AbortController associated with the given runId.
 *
 * @param msg - The inbound 'cancel' message.
 */
function cancel(msg: Extract<WorkerMessage, { type: 'cancel' }>): void {
  const c = controllers.get(msg.runId);
  if (c) c.abort();
}

/**
 * Top-level message listener.
 * Dispatches inbound messages to run() or cancel() based on message type.
 */
ctx.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;
  if (msg.type === 'run') {
    // Fire-and-forget: the run() function posts results/steps as they arrive.
    void run(msg);
  } else if (msg.type === 'cancel') {
    cancel(msg);
  }
});
