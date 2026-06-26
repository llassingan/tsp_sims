/**
 * SeedInput — Random seed for deterministic graph generation.
 *
 * The seed value (0–999999) is passed to the PRNG used during graph
 * generation. Using the same seed with the same configuration always
 * produces the same graph, which is critical for:
 *   - Reproducible demonstrations ("watch this exact instance")
 *   - Comparing algorithms on identical inputs
 *   - Debugging specific graph structures
 *
 * The input is clamped to [0, 999999] with floor rounding to keep the
 * seed space manageable and avoid floating-point seeds.
 *
 * Tooltip: "Random seed for reproducible graphs"
 */

import { useSimulationStore } from '@/store/simulationStore';
import { NumberInput } from '@/components/ui/NumberInput';

/**
 * SeedInput — Deterministic RNG seed for reproducible graph generation.
 *
 * Same seed + same config = same graph every time. Essential for fair
 * algorithm comparison and reproducible demos.
 */
export function SeedInput(): JSX.Element {
  const seed = useSimulationStore((s) => s.config.seed);
  const setConfig = useSimulationStore((s) => s.setConfig);
  return (
    <NumberInput
      label="Seed"
      value={seed}
      min={0}
      max={999999}
      onChange={(n) => setConfig({ seed: Math.max(0, Math.floor(n)) })}
      tooltip="Random seed for reproducible graphs"
    />
  );
}
