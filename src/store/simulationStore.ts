import { create } from 'zustand';
import type { AlgorithmId, AlgorithmStep } from '@/algorithms/types';
import type { Graph } from '@/lib/graph/types';
import type { WeightMode } from '@/lib/graph/generate';

export type Status = 'idle' | 'generating' | 'ready' | 'running' | 'paused' | 'completed' | 'error';

export interface SimulationConfig {
  nodeCount: number;
  algorithmId: AlgorithmId;
  graphType: 'symmetric' | 'asymmetric';
  problemType: 'cycle' | 'path';
  destinationNode: number;
  weightMin: number;
  weightMax: number;
  seed: number;
  weightMode: WeightMode;
}

export interface SimulationState {
  config: SimulationConfig;
  graph: Graph | null;
  status: Status;
  runId: string | null;
  steps: AlgorithmStep[];
  bestTour: number[] | null;
  bestCost: number | null;
  currentTour: number[];
  currentCost: number | null;
  exploredCount: number;
  prunedCount: number;
  visitedNodes: Set<number>;
  startedAt: number | null;
  finishedAt: number | null;
  error: string | null;
  playbackSpeed: number;
  animationIndex: number;
  setConfig: (patch: Partial<SimulationConfig>) => void;
  setGraph: (g: Graph) => void;
  startRun: (runId: string) => void;
  appendSteps: (runId: string, batch: AlgorithmStep[]) => void;
  setStatus: (status: Status, error?: string) => void;
  setBest: (tour: number[], cost: number) => void;
  setCurrent: (tour: number[], cost: number) => void;
  incrementExplored: (n: number) => void;
  incrementPruned: (n: number) => void;
  markVisited: (node: number) => void;
  resetRun: () => void;
  setAnimationIndex: (i: number) => void;
  setPlaybackSpeed: (s: number) => void;
  finishRun: () => void;
}

const MAX_STEPS = 10_000;

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

export const useSimulationStore = create<SimulationState>((set) => ({
  ...initialState,
  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
  setGraph: (g) => set({ graph: g, status: 'ready' }),
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
  appendSteps: (runId, batch) => set((s) => appendStepsInternal(s, runId, batch)),
  setStatus: (status, error) => set({ status, ...(error !== undefined ? { error } : {}) }),
  setBest: (tour, cost) => set({ bestTour: tour, bestCost: cost }),
  setCurrent: (tour, cost) => set({ currentTour: tour, currentCost: cost }),
  incrementExplored: (n) => set((s) => ({ exploredCount: s.exploredCount + n })),
  incrementPruned: (n) => set((s) => ({ prunedCount: s.prunedCount + n })),
  markVisited: (node) =>
    set((s) => {
      if (s.visitedNodes.has(node)) return s;
      const v = new Set(s.visitedNodes);
      v.add(node);
      return { visitedNodes: v };
    }),
  resetRun: () => set((s) => resetRunInternal(s)),
  setAnimationIndex: (i) => set({ animationIndex: i }),
  setPlaybackSpeed: (s) => set({ playbackSpeed: s }),
  finishRun: () => set({ finishedAt: performance.now() }),
}));
