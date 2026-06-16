import { useSimulationStore } from '@/store/simulationStore';
import { RadioGroup } from '@/components/ui/NumberInput';

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
