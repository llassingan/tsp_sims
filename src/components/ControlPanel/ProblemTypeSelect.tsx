/**
 * ProblemTypeSelect — Toggle between Cycle (classic TSP) and Path modes.
 *
 *   - Cycle (TSP):      The salesman visits every city exactly once and returns
 *                        to the starting city. This is the standard TSP.
 *   - Path (Hamiltonian): The salesman visits every city exactly once but does
 *                        NOT return to the start — the tour ends at a chosen
 *                        destination node. This is the Hamiltonian path variant.
 *
 * When "Path" is selected, the DestinationSelect input becomes enabled so the
 * user can pick which node is the final stop. In "Cycle" mode, destination
 * selection is hidden/disabled because the start and end are the same.
 */

import { useSimulationStore } from '@/store/simulationStore';
import { RadioGroup } from '@/components/ui/NumberInput';

/**
 * ProblemTypeSelect — Cycle (standard TSP) vs Path (Hamiltonian) mode.
 *
 * The choice gates the DestinationSelect input: path mode enables it,
 * cycle mode disables it (since cycle always returns to the start node).
 */
export function ProblemTypeSelect(): JSX.Element {
  const problemType = useSimulationStore((s) => s.config.problemType);
  const setConfig = useSimulationStore((s) => s.setConfig);
  return (
    <RadioGroup<'cycle' | 'path'>
      label="Problem"
      name="problem-type"
      value={problemType}
      onChange={(v) => setConfig({ problemType: v })}
      options={[
        { value: 'cycle', label: 'Cycle' },
        { value: 'path', label: 'Path' },
      ]}
    />
  );
}
