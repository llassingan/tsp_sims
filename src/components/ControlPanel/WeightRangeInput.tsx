/**
 * WeightRangeInput — Min/max range for randomly generated edge weights.
 *
 * Two side-by-side NumberInputs in a 2-column grid:
 *   - Weight min: lower bound for random weight generation (clamped to >= 1)
 *   - Weight max: upper bound (clamped to >= 1)
 *
 * Validation: if weightMax <= weightMin, the max input shows a red error
 * ("max must be > min") and the Start button is disabled. This prevents
 * generating a graph with degenerate or inverted weight ranges.
 *
 * The range [1, 999] is hard-coded as the input bounds to keep graphs
 * visually meaningful and prevent extreme weight values from distorting
 * the stopwatch metrics.
 */

import { useSimulationStore } from '@/store/simulationStore';
import { NumberInput } from '@/components/ui/NumberInput';

/**
 * WeightRangeInput — Dual number inputs for min/max random edge weight.
 *
 * The validation constraint (max > min) is enforced both at the UI level
 * (error message + Start button disabled) and at the input onChange level
 * (values are floor-clamped). This provides immediate feedback before the
 * user clicks Start.
 */
export function WeightRangeInput(): JSX.Element {
  const wmin = useSimulationStore((s) => s.config.weightMin);
  const wmax = useSimulationStore((s) => s.config.weightMax);
  const setConfig = useSimulationStore((s) => s.setConfig);
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumberInput
        label="Weight min"
        value={wmin}
        min={1}
        max={999}
        onChange={(n) => setConfig({ weightMin: Math.max(1, Math.floor(n)) })}
      />
      <NumberInput
        label="Weight max"
        value={wmax}
        min={1}
        max={999}
        onChange={(n) => setConfig({ weightMax: Math.max(1, Math.floor(n)) })}
        error={wmax <= wmin ? 'max must be > min' : undefined}
      />
    </div>
  );
}
