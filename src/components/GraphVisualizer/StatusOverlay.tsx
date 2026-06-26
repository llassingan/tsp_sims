/**
 * StatusOverlay.tsx — Floating Status Indicator
 *
 * Renders a contextual overlay on top of the graph visualizer.
 * Behavior by simulation status:
 *
 *   - `idle`   (no graph)   : "Click a preset or Start to generate a graph"
 *   - `ready`               : "Ready — press Start or Space"
 *   - `completed`           : Shows best cost in a green badge
 *   - `running` / `error`   : Hidden (other UI handles these states)
 *
 * @module StatusOverlay
 */

import { useSimulationStore } from '@/store/simulationStore';

/**
 * Floating overlay that shows contextual status messages for the visualizer.
 * Hidden during active simulation or error states.
 */
export function StatusOverlay(): JSX.Element | null {
  const status = useSimulationStore((s) => s.status);
  const bestCost = useSimulationStore((s) => s.bestCost);
  const graph = useSimulationStore((s) => s.graph);

  if (status === 'running' || status === 'error') {
    return null;
  }
  if (graph === null) {
    return (
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="rounded border border-gray-300 bg-white/90 px-4 py-2 text-sm text-gray-700 shadow-sm">
          Click a preset or Start to generate a graph
        </div>
      </div>
    );
  }
  if (status === 'ready') {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-2 grid place-items-center">
        <div className="rounded-full border border-tsp-bestTour bg-white/90 px-3 py-1 text-[11px] font-medium text-tsp-bestTour shadow-sm">
          Ready — press Start or Space
        </div>
      </div>
    );
  }
  if (status === 'completed' && bestCost !== null) {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-2 grid place-items-center">
        <div className="rounded-full border border-tsp-bestTour bg-white/90 px-3 py-1 text-[11px] font-medium text-tsp-bestTour shadow-sm">
          Best cost: {bestCost}
        </div>
      </div>
    );
  }
  return null;
}
