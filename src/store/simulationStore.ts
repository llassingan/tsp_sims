/**
 * Zustand store — the single source of truth for all TSP Simulator UI state.
 *
 * ## Architecture
 *
 * This store is the central nervous system of the application. It holds
 * everything the UI needs to render: user configuration (nodes, algorithm,
 * seed), the generated graph, live simulation events from the Web Worker,
 * playback state, and accumulated statistics.
 *
 * Components subscribe to slices of this store via selectors (see
 * `selectors.ts`). Mutations happen through the action methods defined here —
 * there is no direct state mutation from outside the store.
 *
 * ## Key design decisions
 *
 * ### MAX_STEPS = 10,000
 * Memory cap on the `steps` array. A single Brute Force run on n=8 produces
 * ~40k steps rapidly, and without a cap the browser would crash. 10,000 is
 * enough for a smooth animation replay of the most interesting phase (early
 * search) while discarding stale tail entries when the cap is hit.
 *
 * ### runId-based stale event rejection
 * Each simulation run gets a unique `runId`. The Web Worker attaches this
 * `runId` to every step batch it sends. `appendSteps()` checks whether the
 * incoming batch's `runId` matches the store's current `runId`, and silently
 * discards batches from stale runs. This prevents a race where the user
 * restarts a simulation while the old worker is still draining its event
 * queue.
 *
 * ### Set-based visitedNodes
 * `markVisited()` maintains a `Set<number>` for efficient O(1) membership
 * checks. This is consumed by the canvas renderer (to color visited nodes
 * differently) and the stats panel. A Set was chosen over a boolean array
 * because (a) the instantiation is idiomatic, and (b) it avoids O(n) reset
 * loops — simply replacing the Set with a new one on `resetRun()` is
 * sufficient.
 *
 * ### performance.now() for wall-clock time
 * `startRun()` captures `performance.now()` as `startedAt`, and
 * `finishRun()` captures the end time. This wall-clock measurement includes
 * all worker communication overhead, yielding a realistic "time the user
 * actually waited" rather than CPU-only time. Displayed via `formatMs()`.
 */

import { create } from 'zustand';
import type { AlgorithmId, AlgorithmStep } from '@/algorithms/types';
import type { Graph } from '@/lib/graph/types';
import type { WeightMode } from '@/lib/graph/generate';

/**
 * Lifecycle states for a single simulation run.
 *
 * Transitions flow: idle → generating → ready → running → (paused ↔ running)* → completed
 * Error can occur at any point after idle, and recovery resets to idle or ready.
 */
export type Status = 'idle' | 'generating' | 'ready' | 'running' | 'paused' | 'completed' | 'error';

/**
 * User-configurable simulation parameters.
 *
 * These are the knobs in the control panel. All fields have defaults in
 * `initialState.config` and can be partially updated via `setConfig()`.
 */
export interface SimulationConfig {
  /** Number of nodes (cities) in the generated graph. */
  nodeCount: number;
  /** The algorithm to run against the graph. */
  algorithmId: AlgorithmId;
  /** Whether edge weights are symmetric or asymmetric. */
  graphType: 'symmetric' | 'asymmetric';
  /** Whether the problem is a TSP cycle or Hamiltonian path. */
  problemType: 'cycle' | 'path';
  /** Destination node for the Hamiltonian path variant (unused in cycle mode). */
  destinationNode: number;
  /** Minimum edge weight in the generated graph. */
  weightMin: number;
  /** Maximum edge weight in the generated graph. */
  weightMax: number;
  /** RNG seed for deterministic graph generation. */
  seed: number;
  /** Weight generation strategy: random uniform or euclidean-distance-derived. */
  weightMode: WeightMode;
  /** Visualization mode: 2D top-down or 3D perspective. */
  viewMode: '2d' | '3d';
}

/**
 * The complete UI state managed by the Zustand store.
 *
 * Combines configuration, live simulation data, playback controls, and all
 * action methods used to mutate the state.
 */
export interface SimulationState {
  /** Current user configuration. Mutated via `setConfig()`. */
  config: SimulationConfig;
  /** The generated graph (null until generation completes). */
  graph: Graph | null;
  /** Current lifecycle status of the simulation. */
  status: Status;
  /** Unique identifier for the current run, used to reject stale worker events. */
  runId: string | null;
  /** Accumulated algorithm steps, capped at MAX_STEPS. */
  steps: AlgorithmStep[];
  /** Node sequence of the best complete tour found so far. */
  bestTour: number[] | null;
  /** Cost of the best complete tour found so far. */
  bestCost: number | null;
  /** Node sequence the algorithm is currently exploring. */
  currentTour: number[];
  /** Cost of the tour the algorithm is currently exploring. */
  currentCost: number | null;
  /** Total number of states explored by the algorithm so far. */
  exploredCount: number;
  /** Total number of branches pruned (Branch & Bound only; 0 for other algorithms). */
  prunedCount: number;
  /** Set of nodes visited in the current exploration path. */
  visitedNodes: Set<number>;
  /** Wall-clock timestamp (performance.now()) when the current run started, or null. */
  startedAt: number | null;
  /** Wall-clock timestamp (performance.now()) when the current run finished, or null. */
  finishedAt: number | null;
  /** Error message if status is 'error', otherwise null. */
  error: string | null;
  /** Animation playback speed multiplier (1 = real-time). */
  playbackSpeed: number;
  /** Current index into the `steps` array for animation playback. */
  animationIndex: number;

  // -- Action methods --

  /** Partially update the simulation configuration. */
  setConfig: (patch: Partial<SimulationConfig>) => void;
  /** Set the generated graph and transition status to 'ready'. */
  setGraph: (g: Graph) => void;
  /** Begin a new simulation run with the given unique runId. */
  startRun: (runId: string) => void;
  /** Append a batch of algorithm steps from the worker (discarded if runId is stale). */
  appendSteps: (runId: string, batch: AlgorithmStep[]) => void;
  /** Set the simulation status, optionally with an error message. */
  setStatus: (status: Status, error?: string) => void;
  /** Record the best complete tour and its cost discovered so far. */
  setBest: (tour: number[], cost: number) => void;
  /** Record the tour the algorithm is currently exploring. */
  setCurrent: (tour: number[], cost: number) => void;
  /** Increment the explored-state counter by n. */
  incrementExplored: (n: number) => void;
  /** Increment the pruned-branch counter by n. */
  incrementPruned: (n: number) => void;
  /** Mark a node as visited in the current exploration path. */
  markVisited: (node: number) => void;
  /** Reset all run-level state (steps, stats, timers) to prepare for a new run. */
  resetRun: () => void;
  /** Jump the animation playback to a specific step index. */
  setAnimationIndex: (i: number) => void;
  /** Adjust the animation playback speed. */
  setPlaybackSpeed: (s: number) => void;
  /** Record the wall-clock completion time of the current run. */
  finishRun: () => void;
}

/**
 * Maximum number of algorithm steps retained in memory.
 *
 * Prevents unbounded memory growth from algorithms that produce hundreds of
 * thousands of steps (e.g., Brute Force on n=8). When the limit is exceeded,
 * oldest steps are trimmed from the front, preserving the most recent
 * 10,000 entries for animation playback.
 */
const MAX_STEPS = 10_000;

/**
 * Default configuration and initial state for a fresh simulation session.
 *
 * Used as the base state when the store is first created. Mutated copies
 * are produced by action methods; this object itself is never modified.
 */
const initialState: Omit<
  SimulationState,
  | 'setConfig'
  | 'setGraph'
  | 'startRun'
  | 'appendSteps'
  | 'setStatus'
  | 'setBest'
  | 'setCurrent'
  | 'incrementExplored'
  | 'incrementPruned'
  | 'markVisited'
  | 'resetRun'
  | 'setAnimationIndex'
  | 'setPlaybackSpeed'
  | 'finishRun'
> = {
  config: {
    nodeCount: 8,
    algorithmId: 'brute-force',
    graphType: 'symmetric',
    problemType: 'cycle',
    destinationNode: 4,
    weightMin: 1,
    weightMax: 20,
    seed: 42,
    weightMode: 'euclidean',
    viewMode: '3d',
  },
  graph: null,
  status: 'idle',
  runId: null,
  steps: [],
  bestTour: null,
  bestCost: null,
  currentTour: [],
  currentCost: null,
  exploredCount: 0,
  prunedCount: 0,
  visitedNodes: new Set<number>(),
  startedAt: null,
  finishedAt: null,
  error: null,
  playbackSpeed: 1,
  animationIndex: 0,
};

/**
 * Core logic for `appendSteps`: appends a batch of steps with runId validation
 * and the MAX_STEPS memory cap.
 *
 * Returns the state unchanged if the incoming `runId` doesn't match the
 * store's current run (stale event rejection). Otherwise concatenates the
 * batch and trims from the front if the total exceeds MAX_STEPS.
 *
 * @param s - Current simulation state (read-only reference).
 * @param runId - Run identifier from the worker's event.
 * @param batch - Array of algorithm steps to append.
 * @returns Partial state containing the updated `steps` array, or `s`
 *          unchanged if the runId is stale.
 */
function appendStepsInternal(
  s: SimulationState,
  runId: string,
  batch: AlgorithmStep[],
): Partial<SimulationState> {
  if (s.runId !== runId) return s;
  const next = s.steps.concat(batch);
  const trimmed = next.length > MAX_STEPS ? next.slice(next.length - MAX_STEPS) : next;
  return { steps: trimmed };
}

/**
 * Builds the partial state for resetting all run-level fields.
 *
 * Clears steps, best/current tour, counters, timers, and visited nodes.
 * Preserves the graph and config so the user can immediately start a new
 * run without re-generating.
 *
 * @param s - Current simulation state.
 * @returns Partial state with all run-level fields reset to their defaults.
 */
function resetRunInternal(s: SimulationState): Partial<SimulationState> {
  return {
    status: s.graph ? 'ready' : 'idle',
    runId: null,
    steps: [],
    bestTour: null,
    bestCost: null,
    currentTour: [],
    currentCost: null,
    exploredCount: 0,
    prunedCount: 0,
    visitedNodes: new Set<number>(),
    startedAt: null,
    finishedAt: null,
    error: null,
    animationIndex: 0,
  };
}

/**
 * The application-wide Zustand store for the TSP Simulator.
 *
 * Created once at module load time. Imported by components that need to
 * read or mutate simulation state. Use selectors from `selectors.ts` for
 * efficient, memoized subscriptions to slices of this state.
 *
 * @example
 * ```ts
 * // Reading state with a memoized selector:
 * const isRunning = useSimulationStore(selectIsRunning);
 *
 * // Dispatching an action:
 * const startRun = useSimulationStore((s) => s.startRun);
 * startRun(crypto.randomUUID());
 * ```
 */
export const useSimulationStore = create<SimulationState>((set) => ({
  ...initialState,

  /**
   * Merges a partial config object into the current config.
   * Only provided fields are updated; omitted fields retain their current values.
   */
  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

  /**
   * Stores the generated graph and transitions the status to 'ready',
   * indicating that the UI can now start a simulation run.
   */
  setGraph: (g) => set({ graph: g, status: 'ready' }),

  /**
   * Initializes all run-level state for a new simulation.
   *
   * Sets the runId (for stale event rejection), resets steps/stats/timers,
   * captures the wall-clock start time via `performance.now()`, and
   * transitions status to 'running'. The graph and config are preserved.
   */
  startRun: (runId) =>
    set({
      runId,
      status: 'running',
      steps: [],
      bestTour: null,
      bestCost: null,
      currentTour: [],
      currentCost: null,
      exploredCount: 0,
      prunedCount: 0,
      visitedNodes: new Set<number>(),
      startedAt: performance.now(),
      finishedAt: null,
      error: null,
      animationIndex: 0,
    }),

  /**
   * Appends a batch of algorithm steps from the Web Worker.
   *
   * Delegates to `appendStepsInternal` for runId validation and cap trimming.
   * This is called by the worker message handler in the event loop — it is
   * performance-critical because workers can emit batches at high frequency.
   */
  appendSteps: (runId, batch) => set((s) => appendStepsInternal(s, runId, batch)),

  /**
   * Updates the simulation status. Optionally sets an error message.
   * When `error` is undefined (the common case for non-error transitions),
   * the error field is left unchanged.
   */
  setStatus: (status, error) => set({ status, ...(error !== undefined ? { error } : {}) }),

  /**
   * Records the best complete tour discovered so far.
   * Called by the worker when a full tour is constructed and its cost
   * improves on the current best.
   */
  setBest: (tour, cost) => set({ bestTour: tour, bestCost: cost }),

  /**
   * Records the tour the algorithm is currently building or evaluating.
   * Used by the visualization to show the in-progress path distinct from
   * the best-so-far path.
   */
  setCurrent: (tour, cost) => set({ currentTour: tour, currentCost: cost }),

  /**
   * Increments the explored-state counter. Called by the worker each time
   * the algorithm visits a new partial solution state.
   */
  incrementExplored: (n) => set((s) => ({ exploredCount: s.exploredCount + n })),

  /**
   * Increments the pruned-branch counter. Only used by Branch & Bound;
   * other algorithms leave this at 0.
   */
  incrementPruned: (n) => set((s) => ({ prunedCount: s.prunedCount + n })),

  /**
   * Marks a node as visited for the current exploration path.
   *
   * Uses immutable Set replacement (copy, add, return new Set) so Zustand's
   * reference-equality check detects the change and triggers re-renders.
   * No-ops if the node is already in the set.
   */
  markVisited: (node) =>
    set((s) => {
      if (s.visitedNodes.has(node)) return s;
      const v = new Set(s.visitedNodes);
      v.add(node);
      return { visitedNodes: v };
    }),

  /**
   * Resets all run-level state, preparing for a fresh simulation run.
   * Preserves the graph and configuration so the user can adjust parameters
   * and restart without re-generating.
   */
  resetRun: () => set((s) => resetRunInternal(s)),

  /**
   * Jumps the animation playback cursor to a specific step index.
   * Used by the playback scrubber and auto-advance logic.
   */
  setAnimationIndex: (i) => set({ animationIndex: i }),

  /**
   * Sets the animation playback speed multiplier.
   * 1 = real-time (as steps arrived), 2 = double speed, etc.
   */
  setPlaybackSpeed: (s) => set({ playbackSpeed: s }),

  /**
   * Captures the wall-clock completion time of the current run.
   * Called by the worker's completion handler or the UI after the algorithm
   * exhausts its search space.
   */
  finishRun: () => set({ finishedAt: performance.now() }),
}));
