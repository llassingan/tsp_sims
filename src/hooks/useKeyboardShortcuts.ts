/**
 * Keyboard Shortcuts Hook
 * =======================
 * Registers global keyboard shortcuts for controlling the TSP simulator.
 *
 * Key bindings:
 *   Space       - Toggle start/pause. Starts a new run if idle; cancels
 *                 (resets) the current run if running.
 *   R or r      - Reset the simulation to its initial state.
 *   G or g      - Toggle graph type between symmetric and asymmetric.
 *
 * Input guard:
 *   Shortcuts are suppressed when the keyboard focus is inside an
 *   <input>, <select>, or <textarea> element. This prevents the space
 *   shortcut from interfering with text entry (e.g., typing a space in
 *   the destination node input).
 *
 * Implementation notes:
 *   - Registers a 'keydown' listener on `window` via useEffect, cleaned
 *     up on unmount.
 *   - Uses `useSimulationStore.getState()` (not the hook selector) to
 *     read/write store state without causing re-subscriptions, since
 *     this hook is not React-rendering-sensitive.
 */

import { useEffect } from 'react';
import { useSimulationStore } from '@/store/simulationStore';

/**
 * Installs global keyboard shortcuts for the TSP simulator.
 *
 * Must be called once near the top of the React tree (typically in App.tsx).
 * The hook itself returns nothing -- all side effects are managed internally.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      // Suppress shortcuts when the user is typing in a form field.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const store = useSimulationStore.getState();
      const key = e.key;

      if (key === ' ') {
        // Space: start a new run or cancel the current one.
        e.preventDefault();
        if (store.status === 'running') {
          store.resetRun();
        } else if (store.graph !== null) {
          store.startRun(`run-${Date.now()}`);
        }
      } else if (key === 'r' || key === 'R') {
        // R: reset the simulation unconditionally.
        store.resetRun();
      } else if (key === 'g' || key === 'G') {
        // G: toggle between symmetric and asymmetric graph types.
        store.setConfig({
          graphType: store.config.graphType === 'symmetric' ? 'asymmetric' : 'symmetric',
        });
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
