/**
 * Memoized selectors for the Zustand simulation store.
 *
 * ## How memoization works here
 *
 * These are simple pass-through selectors that extract a single field or
 * derived boolean from the full `SimulationState`. Zustand's `useStore`
 * hook uses strict reference equality (`===`) to decide whether a
 * component should re-render. Since these selectors return primitives
 * (boolean, number, string) or null, they naturally avoid re-renders
 * when the selected value hasn't changed — no manual `useMemo` or
 * selector library is needed.
 *
 * For example, a component using `selectIsRunning` will only re-render
 * when `status` transitions to or from `'running'`; all other state
 * changes (new steps arriving, explored count incrementing) are ignored.
 *
 * ## When to add a new selector
 *
 * Add a selector whenever a component reads a derived value from state —
 * it keeps the derivation logic centralized and testable rather than
 * scattered across component files.
 */

import type { SimulationState } from './simulationStore';

/**
 * True while the worker is actively computing algorithm steps.
 * Used by the controls panel to show/hide pause/resume buttons.
 */
export const selectIsRunning = (s: SimulationState): boolean => s.status === 'running';

/**
 * True after the algorithm has exhausted its search space or found
 * the optimal solution. Used to trigger the completion summary panel.
 */
export const selectIsCompleted = (s: SimulationState): boolean => s.status === 'completed';

/**
 * The cost of the best complete tour found so far (or null if none yet).
 * Rendered in the stats bar as the primary result metric.
 */
export const selectBestCost = (s: SimulationState): number | null => s.bestCost;

/**
 * The node sequence of the best complete tour found so far (or null).
 * Used by the visualization canvas to highlight the best path.
 */
export const selectBestTour = (s: SimulationState): number[] | null => s.bestTour;

/**
 * The current simulation status enum value.
 * Used by status-dependent UI (idle empty state, running spinner, error banner).
 */
export const selectStatus = (s: SimulationState): SimulationState['status'] => s.status;
