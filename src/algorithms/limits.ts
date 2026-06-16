import type { AlgorithmId } from './types';

export interface AlgorithmLimits {
  readonly maxNodesRecommended: number;
  readonly maxNodesHard: number;
}

export const ALGORITHM_LIMITS: Readonly<Record<AlgorithmId, AlgorithmLimits>> = {
  'brute-force': { maxNodesRecommended: 9, maxNodesHard: 11 },
  'branch-and-bound': { maxNodesRecommended: 15, maxNodesHard: 18 },
  'held-karp': { maxNodesRecommended: 18, maxNodesHard: 20 },
  'nearest-neighbor': { maxNodesRecommended: 200, maxNodesHard: 500 },
};

export const GLOBAL_HARD_TIMEOUT_MS = 5 * 60 * 1000;
