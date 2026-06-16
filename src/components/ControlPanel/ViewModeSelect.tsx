import { useSimulationStore } from '@/store/simulationStore';
import { Tooltip } from '@/components/ui/Tooltip';

export function ViewModeSelect(): JSX.Element {
  const viewMode = useSimulationStore((s) => s.config.viewMode);
  const setConfig = useSimulationStore((s) => s.setConfig);
  return (
    <fieldset className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <legend className="text-xs font-medium text-gray-700">View</legend>
        <Tooltip content="2D: flat canvas. 3D: Three.js scene with pinch/drag orbit camera.">
          <span className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-gray-400 text-[10px] leading-none text-gray-500">?</span>
        </Tooltip>
      </div>
      <div className="flex gap-2">
        {(['2d', '3d'] as const).map((m) => (
          <label
            key={m}
            className={`flex flex-1 cursor-pointer items-center justify-center rounded border px-2 py-1 text-xs ${
              viewMode === m
                ? 'border-tsp-bestTour bg-green-50 text-tsp-bestTour'
                : 'border-gray-300 text-gray-700'
            }`}
          >
            <input
              type="radio"
              name="view-mode"
              value={m}
              checked={viewMode === m}
              onChange={() => setConfig({ viewMode: m })}
              className="sr-only"
            />
            <span>{m === '3d' ? '3D' : '2D'}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
