/**
 * PresetButtons — Quick-load buttons for pre-built test graphs.
 *
 * Loads graph definitions from the PRESETS registry (currently:
 * "Star 5" and "Figure 8"). Each preset graph has a known optimal tour
 * and/or interesting structural properties that make it useful for:
 *   - Verifying algorithm correctness (known optimal = verifiable output)
 *   - Demonstrating different graph shapes to users
 *   - Quick smoke testing after code changes
 *
 * Clicking a preset calls setGraph() directly on the store, bypassing the
 * random graph generator entirely. The preset graph is immediately available
 * for visualization and algorithm execution.
 *
 * Uses ghost-variant Buttons (transparent, low visual weight) since presets
 * are secondary convenience actions, not primary workflow controls.
 */

import { useSimulationStore } from '@/store/simulationStore';
import { PRESETS } from '@/lib/graph/presets';
import { Button } from '@/components/ui/Button';

/**
 * PresetButtons — Load predefined test graphs (Star 5, Figure 8).
 *
 * Each preset graph is hand-crafted with known properties for testing and
 * demonstration. Uses ghost buttons so they don't compete visually with
 * the primary Start/Reset button.
 */
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
