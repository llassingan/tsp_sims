import { ALGORITHM_LIMITS } from '@/algorithms/limits';
import { useSimulationStore } from '@/store/simulationStore';
import { Button } from '@/components/ui/Button';
import { generateGraph } from '@/lib/graph/generate';

function newRunId(): string {
  return `run-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function StartButton(): JSX.Element {
  const config = useSimulationStore((s) => s.config);
  const status = useSimulationStore((s) => s.status);
  const runId = useSimulationStore((s) => s.runId);
  const setGraph = useSimulationStore((s) => s.setGraph);
  const startRun = useSimulationStore((s) => s.startRun);
  const cancel = useSimulationStore((s) => s.resetRun);

  const limits = ALGORITHM_LIMITS[config.algorithmId];
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

  if (isRunning && runId) {
    return (
      <Button variant="secondary" onClick={handleReset}>
        Reset
      </Button>
    );
  }

  return (
    <Button onClick={handleStart} disabled={!valid} title={valid ? 'Start simulation' : 'Fix validation errors'}>
      Start
    </Button>
  );
}
