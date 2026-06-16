import { useSimulationStore } from '@/store/simulationStore';
import { PRESETS } from '@/lib/graph/presets';
import { Button } from '@/components/ui/Button';

export function PresetButtons(): JSX.Element {
  const setGraph = useSimulationStore((s) => s.setGraph);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-700">Presets</span>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <Button
            key={p.id}
            variant="ghost"
            size="sm"
            onClick={() => setGraph(p.build())}
          >
            {p.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
