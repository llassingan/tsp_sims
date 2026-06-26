/**
 * NodeCountInput — Controls the number of nodes (cities) in the TSP graph.
 *
 * Reads the currently selected algorithm ID from the store, looks up the
 * corresponding ALGORITHM_LIMITS entry, and enforces:
 *   - Absolute minimum of 3 nodes (fewer makes TSP trivial)
 *   - Hard maximum from ALGORITHM_LIMITS.maxNodesHard (varies per algorithm)
 *
 * When the value exceeds maxNodesHard, an error message is displayed below
 * the input ("Max for selected algorithm: N") and the Start button becomes
 * disabled until the count is brought within bounds.
 *
 * The tooltip shows both the hard cap (enforced) and the recommended cap
 * (advisory, where the algorithm is still usable but may be slow).
 */

import { ALGORITHM_LIMITS } from '@/algorithms/limits';
import { useSimulationStore } from '@/store/simulationStore';
import { NumberInput } from '@/components/ui/NumberInput';

/**
 * NodeCountInput — Algorithm-aware node-count input.
 *
 * The maximum value changes dynamically when the user switches algorithms
 * because each solver has different computational limits. This prevents
 * the user from accidentally selecting 50 nodes with Brute Force (O(n!)).
 */
export function NodeCountInput(): JSX.Element {
  const algorithmId = useSimulationStore((s) => s.config.algorithmId);
  const nodeCount = useSimulationStore((s) => s.config.nodeCount);
  const setConfig = useSimulationStore((s) => s.setConfig);
  const limits = ALGORITHM_LIMITS[algorithmId];
  const error = nodeCount > limits.maxNodesHard
    ? `Max for selected algorithm: ${limits.maxNodesHard}`
    : undefined;
  return (
    <NumberInput
      label="Nodes"
      value={nodeCount}
      min={3}
      max={limits.maxNodesHard}
      onChange={(n) => setConfig({ nodeCount: Math.max(3, Math.min(limits.maxNodesHard, Math.floor(n))) })}
      tooltip={`Hard cap: ${limits.maxNodesHard} (recommended: ${limits.maxNodesRecommended})`}
      error={error}
    />
  );
}
