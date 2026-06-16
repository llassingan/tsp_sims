import { ControlPanel } from './components/ControlPanel/ControlPanel';
import { GraphCanvas } from './components/GraphVisualizer/GraphCanvas';
import { StatusOverlay } from './components/GraphVisualizer/StatusOverlay';
import { StatisticsPanel } from './components/StatisticsPanel/StatisticsPanel';
import { useRunOrchestrator } from './hooks/useRunOrchestrator';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSimulationStore } from './store/simulationStore';

export default function App(): JSX.Element {
  useRunOrchestrator();
  useKeyboardShortcuts();
  const status = useSimulationStore((s) => s.status);
  const error = useSimulationStore((s) => s.error);
  return (
    <div className="grid h-screen grid-cols-[320px_1fr_360px] grid-rows-[48px_1fr] bg-gray-50">
      <header className="col-span-3 flex items-center justify-between border-b border-gray-200 bg-white px-4">
        <h1 className="text-base font-semibold text-gray-900">TSP Simulator</h1>
        <span
          data-testid="status"
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase ${
            status === 'running'
              ? 'bg-tsp-currentTour/20 text-tsp-currentTour'
              : status === 'completed'
                ? 'bg-tsp-bestTour/20 text-tsp-bestTour'
                : status === 'error'
                  ? 'bg-tsp-explored/20 text-tsp-explored'
                  : 'bg-gray-100 text-gray-600'
          }`}
        >
          {status}
        </span>
      </header>
      <aside className="overflow-y-auto border-r border-gray-200 bg-white p-4">
        <ControlPanel />
      </aside>
      <main className="relative overflow-hidden bg-white">
        <GraphCanvas />
        <StatusOverlay />
        {error ? (
          <div
            role="alert"
            className="absolute left-1/2 top-2 max-w-md -translate-x-1/2 rounded border border-red-300 bg-red-50 px-3 py-1 text-xs text-red-700"
          >
            {error}
          </div>
        ) : null}
      </main>
      <aside className="overflow-y-auto border-l border-gray-200 bg-white p-3">
        <StatisticsPanel />
      </aside>
    </div>
  );
}
