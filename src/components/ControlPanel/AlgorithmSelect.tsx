import { ALGORITHMS } from '@/algorithms';
import { useSimulationStore } from '@/store/simulationStore';
import type { AlgorithmId } from '@/algorithms/types';
import { Select } from '@/components/ui/Select';

const ALGO_OPTIONS: ReadonlyArray<{ value: AlgorithmId; label: string; hint?: string }> = [
  { value: 'brute-force', label: 'Brute Force', hint: 'optimal' },
  { value: 'branch-and-bound', label: 'Branch & Bound', hint: 'optimal' },
  { value: 'held-karp', label: 'Held-Karp DP', hint: 'optimal' },
  { value: 'nearest-neighbor', label: 'Nearest Neighbor', hint: 'heuristic' },
];

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
