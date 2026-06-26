/**
 * StartButton — The primary action button that transitions the app from
 * "idle" to "running" state. Doubles as a Reset button during execution.
 *
 * === IDLE STATE (status !== 'running') ===
 * Renders a green "Start" button with the following validation logic:
 *
 *   1. Node count must be >= 3 (trivial TSP requires at least 3 cities).
 *   2. Node count must be <= ALGORITHM_LIMITS[algorithmId].maxNodesHard.
 *      This prevents launching a Brute Force run with 50 nodes.
 *   3. weightMin must be < weightMax (otherwise the random range is invalid).
 *   4. If problemType is 'path', destinationNode must be in [1, nodeCount].
 *      For 'cycle' mode, destination is ignored (always returns to start).
 *
 * If ANY validation fails:
 *   - Button is disabled (grayed out)
 *   - Title attribute shows "Fix validation errors" on hover
 *   - Individual inputs also show inline error messages (e.g. NodeCountInput,
 *     WeightRangeInput) to guide the user to the specific problem
 *
 * If validation passes:
 *   - Generates a random graph via generateGraph() using the current config
 *   - Sets the graph in the store
 *   - Creates a unique run ID (timestamp + random suffix) for tracking
 *   - Transitions store.status to 'running', which triggers the selected
 *     algorithm worker and the visualization loop
 *
 * === RUNNING STATE (status === 'running') ===
 * Renders a blue "Reset" button that calls resetRun() to:
 *   - Halt the algorithm worker
 *   - Reset store.status to 'idle'
 *   - Preserve the graph and configuration for re-run or modification
 *
 * The button variant changes from primary (green = start) to secondary
 * (blue = reset) to provide a clear visual distinction between the two
 * modes without changing the button position or size.
 */

import { ALGORITHM_LIMITS } from '@/algorithms/limits';
import { useSimulationStore } from '@/store/simulationStore';
import { Button } from '@/components/ui/Button';
import { generateGraph } from '@/lib/graph/generate';

/** Generate a unique run identifier (timestamp + random for collision safety). */
function newRunId(): string {
  return `run-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

/**
 * StartButton — Validates config, generates graph, starts or resets the run.
 *
 * Dual-mode: shows "Start" (primary/green) when idle, "Reset" (secondary/blue)
 * when running. Validation gates the Start action and provides hover text
 * explaining why the button is disabled.
 */
export function StartButton(): JSX.Element {
  const config = useSimulationStore((s) => s.config);
  const status = useSimulationStore((s) => s.status);
  const runId = useSimulationStore((s) => s.runId);
  const setGraph = useSimulationStore((s) => s.setGraph);
  const startRun = useSimulationStore((s) => s.startRun);
  const cancel = useSimulationStore((s) => s.resetRun);

  const limits = ALGORITHM_LIMITS[config.algorithmId];

  /**
   * Validation rules that must all pass before a run can start:
   * - nodeCount in [3, maxNodesHard]
   * - weightMin strictly less than weightMax
   * - destination must be valid IF problemType is 'path'
   */
  const valid =
    config.nodeCount >= 3 &&
    config.nodeCount <= limits.maxNodesHard &&
    config.weightMin < config.weightMax &&
    (config.problemType === 'cycle' ||
      (config.destinationNode >= 1 && config.destinationNode <= config.nodeCount));

  const isRunning = status === 'running';

  const handleStart = (): void => {
    const g = generateGraph({
      n: config.nodeCount,
      type: config.graphType,
      weightRange: [config.weightMin, config.weightMax],
      seed: config.seed,
      weightMode: config.weightMode,
    });
    setGraph(g);
    startRun(newRunId());
  };

  const handleReset = (): void => {
    cancel();
  };

  // Running: show Reset (secondary/blue) to halt the current run.
  if (isRunning && runId) {
    return (
      <Button variant="secondary" onClick={handleReset}>
        Reset
      </Button>
    );
  }

  // Idle: show Start (primary/green), disabled until config is valid.
  return (
    <Button onClick={handleStart} disabled={!valid} title={valid ? 'Start simulation' : 'Fix validation errors'}>
      Start
    </Button>
  );
}
