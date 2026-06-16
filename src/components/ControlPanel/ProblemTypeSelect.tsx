import { useSimulationStore } from '@/store/simulationStore';
import { RadioGroup } from '@/components/ui/NumberInput';

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
