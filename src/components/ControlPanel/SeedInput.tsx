import { useSimulationStore } from '@/store/simulationStore';
import { NumberInput } from '@/components/ui/NumberInput';

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
