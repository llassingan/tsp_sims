import { useCallback, useEffect, useRef } from 'react';
import type { RunRequest, WorkerEvent } from '@/workers/protocol';

type Listener = (event: WorkerEvent) => void;

export interface UseAlgorithmWorker {
  run: (req: RunRequest) => void;
  cancel: (runId: string) => void;
}

export function useAlgorithmWorker(onEvent: Listener): UseAlgorithmWorker {
  const workerRef = useRef<Worker | null>(null);
  const listenerRef = useRef(onEvent);
  listenerRef.current = onEvent;

  useEffect(() => {
    const worker = new Worker(new URL('@/workers/algorithm.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    worker.addEventListener('message', (e: MessageEvent<WorkerEvent>) => {
      listenerRef.current(e.data);
    });
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const run = useCallback((req: RunRequest) => {
    const w = workerRef.current;
    if (!w) return;
    w.postMessage({ type: 'run', request: req });
  }, []);

  const cancel = useCallback((runId: string) => {
    const w = workerRef.current;
    if (!w) return;
    w.postMessage({ type: 'cancel', runId });
  }, []);

  return { run, cancel };
}
