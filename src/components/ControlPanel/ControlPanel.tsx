import { NodeCountInput } from './NodeCountInput';
import { AlgorithmSelect } from './AlgorithmSelect';
import { GraphTypeSelect } from './GraphTypeSelect';
import { ProblemTypeSelect } from './ProblemTypeSelect';
import { DestinationSelect } from './DestinationSelect';
import { WeightRangeInput } from './WeightRangeInput';
import { WeightModeSelect } from './WeightModeSelect';
import { SeedInput } from './SeedInput';
import { PresetButtons } from './PresetButtons';
import { StartButton } from './StartButton';

export function ControlPanel(): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-900">Configuration</h2>
      <NodeCountInput />
      <AlgorithmSelect />
      <GraphTypeSelect />
      <ProblemTypeSelect />
      <DestinationSelect />
      <WeightModeSelect />
      <WeightRangeInput />
      <SeedInput />
      <PresetButtons />
      <div className="mt-2">
        <StartButton />
      </div>
    </div>
  );
}
