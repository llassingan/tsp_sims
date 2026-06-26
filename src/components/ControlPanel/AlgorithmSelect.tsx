/**
 * AlgorithmSelect — Dropdown to choose which TSP solver to run.
 *
 * Four algorithms are available, each with different guarantees:
 *   - Brute Force      (optimal, O(n!))    — enumerates every permutation
 *   - Branch & Bound   (optimal, O(n!) worst) — prunes with lower-bound heuristics
 *   - Held-Karp DP     (optimal, O(n^2 * 2^n)) — exact DP, best for moderate n
 *   - Nearest Neighbor (heuristic, O(n^2)) — greedy, no optimality guarantee
 *
 * Each option carries a hint ("optimal" / "heuristic") rendered in the
 * RadioGroup's hint slot if this were a radio group, or stored for future use.
 * The tooltip shows time complexity (e.g. "O(n!)") via ALGORITHMS lookup.
 *
 * When the algorithm changes, NodeCountInput re-reads ALGORITHM_LIMITS and
 * may display an error if the current node count exceeds the new algorithm's cap.
 */

import { ALGORITHMS } from '@/algorithms';
import { useSimulationStore } from '@/store/simulationStore';
import type { AlgorithmId } from '@/algorithms/types';
import { Select } from '@/components/ui/Select';

/** All four available algorithms with optimal/heuristic classification. */
const ALGO_OPTIONS: ReadonlyArray<{ value: AlgorithmId; label: string; hint?: string }> = [
  { value: 'brute-force', label: 'Brute Force', hint: 'optimal' },
  { value: 'branch-and-bound', label: 'Branch & Bound', hint: 'optimal' },
  { value: 'held-karp', label: 'Held-Karp DP', hint: 'optimal' },
  { value: 'nearest-neighbor', label: 'Nearest Neighbor', hint: 'heuristic' },
];

/**
 * AlgorithmSelect — Selects the TSP solver algorithm.
 *
 * When a new algorithm is selected, the store's config.algorithmId changes,
 * which causes NodeCountInput to re-derive its hard max from ALGORITHM_LIMITS.
 * The tooltip shows Big-O time complexity for the currently selected algorithm.
 */
export function AlgorithmSelect(): JSX.Element {
  const algorithmId = useSimulationStore((s) => s.config.algorithmId);
  const setConfig = useSimulationStore((s) => s.setConfig);
  return (
    <Select<AlgorithmId>
      label="Algorithm"
      value={algorithmId}
      options={ALGO_OPTIONS}
      onChange={setAlgorithmId}
      tooltip={getTooltip(algorithmId)}
    />
  );

  function setAlgorithmId(v: AlgorithmId): void {
    setConfig({ algorithmId: v });
  }

  function getTooltip(id: AlgorithmId): string {
    const algo = ALGORITHMS[id];
    return `O(${algo.timeComplexity})`;
  }
}
