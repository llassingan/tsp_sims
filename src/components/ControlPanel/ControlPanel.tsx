/**
 * ControlPanel — The left-pane configuration sidebar (320px) of the TSP Simulator.
 *
 * Composes all control sub-components in top-to-bottom order matching the
 * logical configuration flow:
 *   1. NodeCountInput    — how many cities to visit
 *   2. AlgorithmSelect   — which solver to run
 *   3. GraphTypeSelect   — symmetric or asymmetric edge weights
 *   4. ProblemTypeSelect — cycle (TSP) or path (Hamiltonian)
 *   5. DestinationSelect — target node for path mode (conditionally enabled)
 *   6. WeightModeSelect   — euclidean (position-derived) or random weights
 *   7. WeightRangeInput   — min/max bounds for random weight generation
 *   8. SeedInput          — deterministic RNG seed
 *   9. ViewModeSelect     — 2D canvas or 3D Three.js rendering
 *  10. PresetButtons      — quick-load star5 / figure8 test graphs
 *  11. StartButton        — validate → generate graph → start run (or Reset)
 *
 * Each sub-component reads from and writes to the shared Zustand
 * simulationStore, so ControlPanel itself is a pure layout shell with no
 * state management logic.
 */

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
import { ViewModeSelect } from './ViewModeSelect';

/**
 * ControlPanel — 320px configuration sidebar for the TSP Simulator.
 *
 * Renders all configuration controls in a vertical stack with consistent
 * spacing (gap-3). Each child component is self-contained — it reads the
 * relevant store slices and dispatches updates independently — so the
 * panel itself has no conditional rendering or derived state.
 */
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
      <ViewModeSelect />
      <PresetButtons />
      <div className="mt-2">
        <StartButton />
      </div>
    </div>
  );
}
