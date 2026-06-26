/**
 * Web Worker Lifecycle Hook
 * =========================
 * Lazily creates and manages a single Web Worker instance for the lifetime
 * of the React component that invokes this hook. The worker executes TSP
 * algorithms off the main thread and streams back WorkerEvents.
 *
 * Architecture decisions:
 *  - Lazy creation on mount: the Worker is constructed once inside a
 *    useEffect with an empty dependency array. It is automatically
 *    terminated on unmount to prevent leaking browser threads.
 *  - Ref-based listener pattern: the onEvent callback is stored in a
 *    mutable ref (listenerRef) and updated on every render. This avoids
 *    the stale-closure problem without needing to add onEvent to the
 *    useEffect dependency array, which would restart the worker on every
 *    callback identity change.
 *  - Stable run/cancel callbacks: exported via useCallback with empty
 *    dependency arrays so they never cause downstream re-renders. They
 *    access the worker through workerRef which is stable.
 *
 * Returned API:
 *  - run(request):  posts a WorkerMessage { type: 'run', request }
 *                   to the worker, initiating an algorithm run.
 *  - cancel(runId): posts a WorkerMessage { type: 'cancel', runId }
 *                    to abort a specific running computation.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { RunRequest, WorkerEvent } from '@/workers/protocol';

/** Callback invoked for every WorkerEvent received from the worker thread. */
type Listener = (event: WorkerEvent) => void;

/** Return type of the useAlgorithmWorker hook. */
export interface UseAlgorithmWorker {
  /** Sends a RunRequest to the worker, starting a new algorithm computation. */
  run: (req: RunRequest) => void;
  /** Aborts the computation identified by runId. */
  cancel: (runId: string) => void;
}

/**
 * Creates and manages a Web Worker for off-main-thread TSP algorithm execution.
 *
 * The worker is created once on mount (via useEffect []) and terminated on
 * unmount. Inbound WorkerEvents are forwarded to the provided `onEvent`
 * callback through a ref to avoid stale closure issues.
 *
 * @param onEvent - Listener called for every WorkerEvent the worker posts.
 * @returns An object with stable `run` and `cancel` functions.
 */
export function useAlgorithmWorker(onEvent: Listener): UseAlgorithmWorker {
  /** Holds the Worker instance. null before mount or after unmount. */
  const workerRef = useRef<Worker | null>(null);
  /**
   * Mutable ref to the latest onEvent callback.
   * Updated on every render so the worker's message listener always calls
   * the most recent callback without re-creating the worker.
   */
  const listenerRef = useRef(onEvent);
  listenerRef.current = onEvent;

  useEffect(() => {
    // Create the Web Worker as a module (Vite handles the URL resolution
    // for src/workers/algorithm.worker.ts via import.meta.url).
    const worker = new Worker(new URL('@/workers/algorithm.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    // Forward every message from the worker to the current listener callback.
    worker.addEventListener('message', (e: MessageEvent<WorkerEvent>) => {
      listenerRef.current(e.data);
    });
    // Terminate the worker when the consuming component unmounts.
    // This is a hard termination -- the worker thread is killed immediately.
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  /** Posts a run request to the worker. No-op if the worker has been terminated. */
  const run = useCallback((req: RunRequest) => {
    const w = workerRef.current;
    if (!w) return;
    w.postMessage({ type: 'run', request: req });
  }, []);

  /** Posts a cancel request to the worker for the given runId. No-op if terminated. */
  const cancel = useCallback((runId: string) => {
    const w = workerRef.current;
    if (!w) return;
    w.postMessage({ type: 'cancel', runId });
  }, []);

  return { run, cancel };
}
