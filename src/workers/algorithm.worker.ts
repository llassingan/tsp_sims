/// <reference lib="webworker" />
import { ALGORITHMS } from '@/algorithms';
import { makeGraph } from '@/lib/graph/types';
import { GLOBAL_HARD_TIMEOUT_MS } from '@/algorithms/limits';
import type { AlgorithmContext } from '@/algorithms/types';
import type { RunRequest, WorkerEvent, WorkerMessage } from './protocol';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

const controllers = new Map<string, AbortController>();

function post(event: WorkerEvent): void {
  ctx.postMessage(event);
}

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
      if (controller.signal.aborted) return;
      post({ runId, type: 'step', step });
    },
    now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    ...(request.destinationNode !== null
      ? { destinationNode: request.destinationNode }
      : {}),
  };
}

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
      post({ runId, type: 'timeout' });
    } else {
      post({ runId, type: 'result', result });
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
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

function cancel(msg: Extract<WorkerMessage, { type: 'cancel' }>): void {
  const c = controllers.get(msg.runId);
  if (c) c.abort();
}

ctx.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;
  if (msg.type === 'run') {
    void run(msg);
  } else if (msg.type === 'cancel') {
    cancel(msg);
  }
});
