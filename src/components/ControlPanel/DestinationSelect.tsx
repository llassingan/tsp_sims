import { useSimulationStore } from '@/store/simulationStore';
import { NumberInput } from '@/components/ui/NumberInput';

export function DestinationSelect(): JSX.Element {
  const problemType = useSimulationStore((s) => s.config.problemType);
  const nodeCount = useSimulationStore((s) => s.config.nodeCount);
  const destination = useSimulationStore((s) => s.config.destinationNode);
  const setConfig = useSimulationStore((s) => s.setConfig);
  const enabled = problemType === 'path';
  return (
    <NumberInput
      label="Destination"
      value={destination}
      min={1}
      max={Math.max(2, nodeCount)}
      disabled={!enabled}
      onChange={(n) => setConfig({ destinationNode: Math.floor(n) })}
      tooltip="Target node for Hamiltonian path"
    />
  );
}
