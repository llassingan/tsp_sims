import { ALGORITHM_LIMITS } from '@/algorithms/limits';
import { useSimulationStore } from '@/store/simulationStore';
import { NumberInput } from '@/components/ui/NumberInput';

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
