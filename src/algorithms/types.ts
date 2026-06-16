import type { Graph } from '@/lib/graph/types';

export type AlgorithmId = 'brute-force' | 'branch-and-bound' | 'held-karp' | 'nearest-neighbor';
export type ProblemType = 'cycle' | 'path';
export type GraphType = 'symmetric' | 'asymmetric';

export interface AlgorithmContext {
  readonly graph: Graph;
  readonly startNode: number;
  readonly destinationNode?: number;
  readonly problemType: ProblemType;
  readonly weightRange: readonly [number, number];
  readonly signal: AbortSignal;
  readonly onStep: (step: AlgorithmStep) => void;
  readonly now: () => number;
}

export type AlgorithmStep =
  | { type: 'visit'; tour: readonly number[]; costSoFar: number; depth: number }
  | { type: 'improve'; tour: readonly number[]; cost: number }
  | { type: 'prune'; partialTour: readonly number[]; lowerBound: number; reason: string }
  | { type: 'progress'; explored: number; total: number | 'unknown' }
  | { type: 'milestone'; note: string }
  | { type: 'complete'; tour: readonly number[]; cost: number };

export interface AlgorithmResult {
  readonly tour: readonly number[];
  readonly cost: number;
  readonly explored: number;
  readonly pruned: number;
  readonly computeTimeMs: number;
  readonly timedOut: boolean;
}

export interface Algorithm {
  readonly id: AlgorithmId;
  readonly name: string;
  readonly timeComplexity: string;
  readonly spaceComplexity: string;
  readonly maxNodesRecommended: number;
  readonly maxNodesHard: number;
  readonly optimal: boolean;
  run(ctx: AlgorithmContext): Promise<AlgorithmResult>;
}

export function isAborted(signal: AbortSignal): boolean {
  return signal.aborted;
}

export function checkAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}
