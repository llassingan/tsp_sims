import { useSimulationStore } from '@/store/simulationStore';
import { ALGORITHMS } from '@/algorithms';
import { formatBigO } from '@/lib/complexity';
import { Tooltip } from '@/components/ui/Tooltip';

export function ComplexityCard(): JSX.Element {
  const algorithmId = useSimulationStore((s) => s.config.algorithmId);
  const algo = ALGORITHMS[algorithmId];
  return (
    <section className="rounded border border-gray-200 bg-white p-2">
      <h3 className="text-[11px] font-semibold uppercase text-gray-500">Complexity</h3>
      <div className="mt-1 flex flex-col gap-1 text-xs">
        <Tooltip content="Worst-case time complexity">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Time</span>
            <code className="font-mono text-tsp-explored">{formatBigO(algo.timeComplexity)}</code>
          </div>
        </Tooltip>
        <Tooltip content="Memory usage">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Space</span>
            <code className="font-mono text-tsp-explored">{formatBigO(algo.spaceComplexity)}</code>
          </div>
        </Tooltip>
        {!algo.optimal ? (
          <span className="rounded bg-tsp-explored/20 px-1 text-[10px] font-medium uppercase text-tsp-explored">
            Heuristic
          </span>
        ) : null}
      </div>
    </section>
  );
}
