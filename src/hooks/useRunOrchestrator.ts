/**
 * Run Orchestrator Hook -- Bridge Between Zustand Store and Web Worker
 * ====================================================================
 * This hook wires the simulation's Zustand store to the algorithm Web Worker.
 * It is the central coordinator that translates store state changes into
 * worker commands and translates incoming WorkerEvents back into store
 * mutations.
 *
 * Data flow:
 *
 *   Zustand Store  ──status='running'──>  useRunOrchestrator
 *        ^                                |       |
 *        |                          builds RunRequest  |
 *        |                                |       |
 *        |                          run(request)      |
 *        |                                |       v
 *        |                           useAlgorithmWorker
 *        |                                |
 *        |                           postMessage ────>  Web Worker
 *        |                                                |
 *   store mutations  <──WorkerEvents──  postMessage  <────┘
 *   (steps, best,      (step/result/
 *    explored, etc.)    error/timeout)
 *
 * Stale event rejection:
 *   Every WorkerEvent carries a runId. Before mutating the store, each
 *   handler compares `event.runId` against the store's current `runId`.
 *   If they differ, the event belongs to a superseded or cancelled run
 *   and is silently discarded. This prevents a new run's state from being
 *   corrupted by late-arriving events from a previous run.
 *
 * Run lifecycle:
 *   1. When `status` transitions to 'running' AND a new `runId` is detected,
 *      the hook builds a RunRequest from the current store config and graph.
 *   2. It sends the request to the worker via run().
 *   3. As step events arrive, the hook appends them to the store's step list,
 *      updates currentTour/bestTour, and increments explored/pruned counters.
 *   4. When a result event arrives, the hook finalizes best tour/cost and
 *      sets status to 'completed' (or 'error' if timedOut).
 *   5. When an error or timeout event arrives, the hook sets the store's
 *      error status with the relevant message.
 *   6. When `status` transitions away from 'running', the hook cancels the
 *      active worker computation via cancel().
 */

import { useEffect, useRef } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { useAlgorithmWorker } from './useAlgorithmWorker';
import type { RunRequest, WorkerEvent } from '@/workers/protocol';
import type { AlgorithmStep, AlgorithmResult } from '@/algorithms/types';

/**
 * Handles a 'step' WorkerEvent by appending the step to the store and
 * updating the appropriate counters/tours.
 *
 * Step types and their effects:
 *  - 'visit':  appends the step, updates currentTour (the partial tour being
 *              built), marks the most recent node as visited, and increments
 *              the explored counter.
 *  - 'improve': appends the step and updates bestTour (a new best solution
 *               has been found).
 *  - 'prune':  appends the step and increments the pruned counter.
 *
 * Uses useSimulationStore.getState() (not the hook) to avoid dependency on
 * the store subscription. The runId guard prevents stale events from
 * corrupting the current run's state.
 *
 * @param runId - The runId from the WorkerEvent.
 * @param step  - The algorithm step payload.
 */
function processStepEvent(runId: string, step: AlgorithmStep): void {
  const s = useSimulationStore.getState();
  if (s.runId !== runId) return;
  useSimulationStore.getState().appendSteps(runId, [step]);
  if (step.type === 'visit') {
    useSimulationStore.getState().setCurrent([...step.tour], step.costSoFar);
    const lastNode = step.tour[step.tour.length - 1];
    if (typeof lastNode === 'number') {
      useSimulationStore.getState().markVisited(lastNode);
    }
    useSimulationStore.getState().incrementExplored(1);
  } else if (step.type === 'improve') {
    useSimulationStore.getState().setBest([...step.tour], step.cost);
  } else if (step.type === 'prune') {
    useSimulationStore.getState().incrementPruned(1);
  }
}

/**
 * Handles a 'result' WorkerEvent -- the algorithm has finished successfully.
 *
 * Sets the final best tour/cost, increments explored/pruned by the totals
 * reported in the result, and transitions the store status to 'completed'
 * (or 'error' if the algorithm timed out before posting the result).
 *
 * @param runId  - The runId from the WorkerEvent.
 * @param result - The final algorithm result.
 */
function processResultEvent(runId: string, result: AlgorithmResult): void {
  const s = useSimulationStore.getState();
  if (s.runId !== runId) return;
  useSimulationStore.getState().setBest([...result.tour], result.cost);
  useSimulationStore.getState().incrementExplored(result.explored);
  useSimulationStore.getState().incrementPruned(result.pruned);
  useSimulationStore.getState().setStatus(result.timedOut ? 'error' : 'completed');
  useSimulationStore.getState().finishRun();
}

/**
 * Handles 'error' and 'timeout' WorkerEvents.
 *
 * Sets the store status to 'error' with the provided message (for errors)
 * or a hardcoded timeout message, and calls finishRun() to clean up
 * the running state.
 *
 * @param message   - The error message string (for 'error' events).
 * @param isTimeout - Whether this is a timeout event (true) or error event (false).
 */
function processErrorEvent(message: string, isTimeout: boolean): void {
  if (isTimeout) {
    useSimulationStore.getState().setStatus('error', 'Worker timeout (5 min)');
  } else {
    useSimulationStore.getState().setStatus('error', message);
  }
  useSimulationStore.getState().finishRun();
}

/**
 * The main orchestrator hook. Subscribes to the simulation store and
 * the algorithm worker, bridging them together.
 *
 * Must be called from within a React component (uses useEffect and
 * Zustand subscriptions). No return value -- all state flows through
 * the Zustand store.
 */
export function useRunOrchestrator(): void {
  /**
   * Dispatches incoming WorkerEvents to the appropriate handler based on
   * event type. Created inline so it captures the worker API from the
   * useAlgorithmWorker call below.
   */
  const handleEvent = (event: WorkerEvent): void => {
    if (event.type === 'step') {
      processStepEvent(event.runId, event.step);
    } else if (event.type === 'result') {
      processResultEvent(event.runId, event.result);
    } else if (event.type === 'timeout') {
      processErrorEvent('timeout', true);
    } else if (event.type === 'error') {
      processErrorEvent(event.message, false);
    }
  };
  const { run, cancel } = useAlgorithmWorker(handleEvent);

  /** Tracks the most recent runId that was sent to the worker.
   *  Used to detect when a new run starts and to cancel the previous one. */
  const runIdRef = useRef<string | null>(null);

  // Subscribe to relevant store slices. Using individual selectors
  // minimizes unnecessary re-renders compared to grabbing the whole store.
  const runId = useSimulationStore((s) => s.runId);
  const graph = useSimulationStore((s) => s.graph);
  const config = useSimulationStore((s) => s.config);
  const status = useSimulationStore((s) => s.status);

  useEffect(() => {
    // START: status just became 'running' with a valid runId and graph.
    if (status === 'running' && runId && graph) {
      // Guard: don't re-send the same run if the effect re-fires.
      if (runIdRef.current === runId) return;
      runIdRef.current = runId;

      // Build the RunRequest from the store's current configuration.
      // Weights are converted from Float32Array to number[] because
      // Float32Array is not supported by the structured clone algorithm
      // used by postMessage.
      const request: RunRequest = {
        runId,
        algorithmId: config.algorithmId,
        graph: {
          nodes: graph.nodes,
          weights: Array.from(graph.weights),
          n: graph.n,
          type: graph.type,
        },
        startNode: 0,
        destinationNode: config.problemType === 'path' ? config.destinationNode - 1 : null,
        problemType: config.problemType,
        weightRange: [config.weightMin, config.weightMax],
      };
      run(request);
    }

    // STOP/CANCEL: status transitioned away from 'running'.
    if (status !== 'running' && runIdRef.current) {
      cancel(runIdRef.current);
      runIdRef.current = null;
    }
  }, [status, runId, graph, config, run, cancel]);
}
