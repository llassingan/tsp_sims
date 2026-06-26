/**
 * GraphTypeSelect — Toggle between symmetric and asymmetric edge weights.
 *
 *   - Symmetric:   weight(A->B) == weight(B->A). In random mode, the matrix
 *                  is mirrored; in euclidean mode, distance is naturally symmetric.
 *   - Asymmetric:  weight(A->B) may differ from weight(B->A) (e.g. one-way
 *                  streets, elevation, or wind). The full n-by-n matrix is used.
 *
 * This distinction affects the graph generation step. Symmetric graphs are
 * simpler and correspond to standard TSP instances; asymmetric graphs model
 * real-world scenarios where travel costs are directional.
 */

import { useSimulationStore } from '@/store/simulationStore';
import { RadioGroup } from '@/components/ui/NumberInput';

/**
 * GraphTypeSelect — Symmetric vs asymmetric edge weight mode.
 */
export function GraphTypeSelect(): JSX.Element {
  const graphType = useSimulationStore((s) => s.config.graphType);
  const setConfig = useSimulationStore((s) => s.setConfig);
  return (
    <RadioGroup<'symmetric' | 'asymmetric'>
      label="Graph type"
      name="graph-type"
      value={graphType}
      onChange={(v) => setConfig({ graphType: v })}
      options={[
        { value: 'symmetric', label: 'Symmetric' },
        { value: 'asymmetric', label: 'Asymmetric' },
      ]}
    />
  );
}
