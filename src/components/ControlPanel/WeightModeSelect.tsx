/**
 * WeightModeSelect — Chooses how edge weights are derived for random graphs.
 *
 *   - Euclidean: weights are computed from 2D Euclidean distance between
 *     randomly-placed node positions. This produces realistic, metric graphs
 *     where far-apart nodes naturally have higher cost. The triangle
 *     inequality holds, which can help B&B pruning.
 *
 *   - Random: weights are drawn uniformly from the [weightMin, weightMax]
 *     range. This produces non-metric graphs where edges are independent
 *     (no triangle inequality guarantee). Useful for testing algorithms
 *     on arbitrary cost matrices.
 *
 * Has a "?" tooltip circle with a detailed explanation so users understand
 * the trade-off without reading documentation.
 */

import { useSimulationStore } from '@/store/simulationStore';
import type { WeightMode } from '@/lib/graph/generate';
import { Tooltip } from '@/components/ui/Tooltip';

/**
 * WeightModeSelect — Euclidean (position-derived) vs Random (uniform) weights.
 *
 * Uses inline radio buttons styled as toggle pills instead of the shared
 * RadioGroup because this component includes a custom Tooltip in the legend
 * that explains the mode distinction to users.
 */
export function WeightModeSelect(): JSX.Element {
  const weightMode = useSimulationStore((s) => s.config.weightMode);
  const setConfig = useSimulationStore((s) => s.setConfig);
  return (
    <fieldset className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <legend className="text-xs font-medium text-gray-700">Weight source</legend>
        <Tooltip content="Euclidean: weights derived from node positions, so far nodes have higher cost. Random: weights drawn uniformly from the range.">
          <span className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-gray-400 text-[10px] leading-none text-gray-500">?</span>
        </Tooltip>
      </div>
      <div className="flex gap-2">
        {(['euclidean', 'random'] as const).map((m) => (
          <label
            key={m}
            className={`flex flex-1 cursor-pointer items-center justify-center rounded border px-2 py-1 text-xs ${
              weightMode === m
                ? 'border-tsp-bestTour bg-green-50 text-tsp-bestTour'
                : 'border-gray-300 text-gray-700'
            }`}
          >
            <input
              type="radio"
              name="weight-mode"
              value={m}
              checked={weightMode === m}
              onChange={() => setConfig({ weightMode: m satisfies WeightMode })}
              className="sr-only"
            />
            <span>{m === 'euclidean' ? 'Euclidean' : 'Random'}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
