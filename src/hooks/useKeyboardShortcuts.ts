import { useEffect } from 'react';
import { useSimulationStore } from '@/store/simulationStore';

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const store = useSimulationStore.getState();
      const key = e.key;
      if (key === ' ') {
        e.preventDefault();
        if (store.status === 'running') {
          store.resetRun();
        } else if (store.graph !== null) {
          store.startRun(`run-${Date.now()}`);
        }
      } else if (key === 'r' || key === 'R') {
        store.resetRun();
      } else if (key === 'g' || key === 'G') {
        store.setConfig({ graphType: store.config.graphType === 'symmetric' ? 'asymmetric' : 'symmetric' });
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
