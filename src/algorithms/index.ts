import type { Algorithm, AlgorithmId } from './types';
import { bruteForce } from './brute-force';
import { branchAndBound } from './branch-and-bound';
import { heldKarp } from './held-karp';
import { nearestNeighbor } from './nearest-neighbor';

export const ALGORITHMS: Readonly<Record<AlgorithmId, Algorithm>> = {
  'brute-force': bruteForce,
  'branch-and-bound': branchAndBound,
  'held-karp': heldKarp,
  'nearest-neighbor': nearestNeighbor,
};

export function getAlgorithm(id: AlgorithmId): Algorithm {
  const a = ALGORITHMS[id];
  if (!a) throw new Error(`Unknown algorithm: ${id}`);
  return a;
}

export type { Algorithm, AlgorithmId, AlgorithmContext, AlgorithmStep, AlgorithmResult } from './types';
