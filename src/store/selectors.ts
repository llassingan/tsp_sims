import type { SimulationState } from './simulationStore';

export const selectIsRunning = (s: SimulationState): boolean => s.status === 'running';
export const selectIsCompleted = (s: SimulationState): boolean => s.status === 'completed';
export const selectBestCost = (s: SimulationState): number | null => s.bestCost;
export const selectBestTour = (s: SimulationState): number[] | null => s.bestTour;
export const selectStatus = (s: SimulationState): SimulationState['status'] => s.status;
