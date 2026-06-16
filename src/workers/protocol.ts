import type { AlgorithmId, AlgorithmStep, AlgorithmResult } from '@/algorithms/types';
import type { GraphType, ProblemType } from '@/algorithms/types';

export interface RunRequest {
  readonly runId: string;
  readonly algorithmId: AlgorithmId;
  readonly graph: {
    readonly nodes: readonly { id: number; x: number; y: number }[];
    readonly weights: number[];
    readonly n: number;
    readonly type: GraphType;
  };
  readonly startNode: number;
  readonly destinationNode: number | null;
  readonly problemType: ProblemType;
  readonly weightRange: readonly [number, number];
}

export type WorkerEvent =
  | { runId: string; type: 'step'; step: AlgorithmStep }
  | { runId: string; type: 'result'; result: AlgorithmResult }
  | { runId: string; type: 'error'; message: string }
  | { runId: string; type: 'timeout' };

export interface WorkerInbound {
  readonly type: 'run';
  readonly request: RunRequest;
}

export interface WorkerCancel {
  readonly type: 'cancel';
  readonly runId: string;
}

export type WorkerMessage = WorkerInbound | WorkerCancel;
