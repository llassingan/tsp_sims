import { useSimulationStore } from '@/store/simulationStore';
import { NumberInput } from '@/components/ui/NumberInput';

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
