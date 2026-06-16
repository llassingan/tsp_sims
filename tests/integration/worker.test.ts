import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RunRequest, WorkerEvent } from '@/workers/protocol';

function buildSquareRequest(runId: string): RunRequest {
  return {
    runId,
    algorithmId: 'brute-force',
    graph: {
      nodes: [
        { id: 0, x: 0, y: 0 },
        { id: 1, x: 1, y: 0 },
        { id: 2, x: 1, y: 1 },
        { id: 3, x: 0, y: 1 },
      ],
      weights: [0, 1, 2, 1, 1, 0, 1, 2, 2, 1, 0, 1, 1, 2, 1, 0],
      n: 4,
      type: 'symmetric',
    },
    startNode: 0,
    destinationNode: null,
    problemType: 'cycle',
    weightRange: [1, 10],
  };
}

describe('worker integration', () => {
  let worker: Worker | null = null;
  let received: WorkerEvent[];

  beforeEach(() => {
    received = [];
    if (typeof Worker === 'undefined') return;
    worker = new Worker(new URL('@/workers/algorithm.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.addEventListener('message', (e: MessageEvent<WorkerEvent>) => {
      received.push(e.data);
    });
  });

  afterEach(() => {
    worker?.terminate();
    worker = null;
  });

  it('runs brute-force on 4-node square and returns cost 4', async () => {
    if (typeof Worker === 'undefined' || worker === null) {
      return;
    }
    const w = worker;
    const runId = 'test-bf-4';
    const request = buildSquareRequest(runId);
    w.postMessage({ type: 'run', request });

    const result = await new Promise<WorkerEvent>((resolve, reject) => {
      const handler = (e: MessageEvent<WorkerEvent>): void => {
        const data = e.data;
        if (data.runId !== runId) return;
        if (data.type === 'result' || data.type === 'error' || data.type === 'timeout') {
          w.removeEventListener('message', handler);
          if (data.type === 'error') reject(new Error(data.message));
          else resolve(data);
        }
      };
      w.addEventListener('message', handler);
      setTimeout(() => {
        w.removeEventListener('message', handler);
        reject(new Error('Worker timeout'));
      }, 10_000);
    }).then(
      (v) => v,
      (e: unknown) => {
        throw e instanceof Error ? e : new Error(String(e));
      },
    );
    void result;

    expect(result.type).toBe('result');
    if (result.type === 'result') {
      expect(result.result.cost).toBe(4);
    }
    expect(received.some((e) => e.type === 'step')).toBe(true);
  }, 15_000);
});
