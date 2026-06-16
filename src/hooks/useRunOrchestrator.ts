import { useEffect, useRef } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { useAlgorithmWorker } from './useAlgorithmWorker';
import type { RunRequest, WorkerEvent } from '@/workers/protocol';
import type { AlgorithmStep, AlgorithmResult } from '@/algorithms/types';

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

function processResultEvent(runId: string, result: AlgorithmResult): void {
  const s = useSimulationStore.getState();
  if (s.runId !== runId) return;
  useSimulationStore.getState().setBest([...result.tour], result.cost);
  useSimulationStore.getState().incrementExplored(result.explored);
  useSimulationStore.getState().incrementPruned(result.pruned);
  useSimulationStore.getState().setStatus(result.timedOut ? 'error' : 'completed');
  useSimulationStore.getState().finishRun();
}

function processErrorEvent(message: string, isTimeout: boolean): void {
  if (isTimeout) {
    useSimulationStore.getState().setStatus('error', 'Worker timeout (5 min)');
  } else {
    useSimulationStore.getState().setStatus('error', message);
  }
  useSimulationStore.getState().finishRun();
}

export function useRunOrchestrator(): void {
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
  const runIdRef = useRef<string | null>(null);
  const runId = useSimulationStore((s) => s.runId);
  const graph = useSimulationStore((s) => s.graph);
  const config = useSimulationStore((s) => s.config);
  const status = useSimulationStore((s) => s.status);

  useEffect(() => {
    if (status === 'running' && runId && graph) {
      if (runIdRef.current === runId) return;
      runIdRef.current = runId;
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
    if (status !== 'running' && runIdRef.current) {
      cancel(runIdRef.current);
      runIdRef.current = null;
    }
  }, [status, runId, graph, config, run, cancel]);
}
