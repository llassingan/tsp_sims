import { describe, expect, it } from 'vitest';
import { useSimulationStore } from '@/store/simulationStore';
import { starGraph5 } from '@/lib/graph/presets';

describe('simulationStore', () => {
  it('setConfig merges into config', () => {
    useSimulationStore.getState().setConfig({ nodeCount: 10 });
    expect(useSimulationStore.getState().config.nodeCount).toBe(10);
  });

  it('appendSteps appends to steps array', () => {
    const store = useSimulationStore.getState();
    store.startRun('run-1');
    store.appendSteps('run-1', [
      { type: 'visit', tour: [0, 1], costSoFar: 5, depth: 2 },
    ]);
    expect(useSimulationStore.getState().steps.length).toBe(1);
  });

  it('appendSteps with stale runId is a no-op', () => {
    const store = useSimulationStore.getState();
    store.startRun('run-1');
    store.appendSteps('stale', [{ type: 'visit', tour: [0], costSoFar: 0, depth: 1 }]);
    expect(useSimulationStore.getState().steps.length).toBe(0);
  });

  it('resetRun clears run state but keeps graph', () => {
    const store = useSimulationStore.getState();
    const g = starGraph5();
    store.setGraph(g);
    store.startRun('run-1');
    store.resetRun();
    const s = useSimulationStore.getState();
    expect(s.graph).toEqual(g);
    expect(s.runId).toBe(null);
    expect(s.steps).toEqual([]);
  });

  it('setBest updates bestTour and bestCost', () => {
    const store = useSimulationStore.getState();
    store.setBest([0, 1, 2, 3], 42);
    const s = useSimulationStore.getState();
    expect(s.bestTour).toEqual([0, 1, 2, 3]);
    expect(s.bestCost).toBe(42);
  });
});
