/**
 * DestinationSelect — Target node for Hamiltonian path mode.
 *
 * Only enabled when config.problemType === 'path'. In cycle (TSP) mode this
 * input is disabled because the tour always returns to the start node.
 *
 * UX detail: the displayed value uses 1-indexed numbering (node 1..N) to
 * match human intuition, but the internal `destinationNode` value is
 * 0-indexed. The store configuration converts as needed so the user-facing
 * label reads naturally (e.g. "Destination: 5" instead of "Destination: 4").
 *
 * The max value is clamped to the current nodeCount so the destination is
 * always a valid node index.
 *
 * Tooltip: "Target node for Hamiltonian path" explains the purpose without
 * overwhelming the UI.
 */

import { useSimulationStore } from '@/store/simulationStore';
import { NumberInput } from '@/components/ui/NumberInput';

/**
 * DestinationSelect — Conditionally-enabled destination node picker.
 *
 * Disabled (grayed out) when problemType is 'cycle' because the destination
 * is implicit (return to start). Enabled when problemType is 'path' so the
 * user can specify where the tour terminates.
 */
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
