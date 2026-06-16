import { useEffect, useState } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import type { AlgorithmStep } from '@/algorithms/types';
import { formatBytes, formatMs, formatNumber } from '@/lib/format';
import { ComplexityCard } from './ComplexityCard';
import { MetricCard } from './MetricCard';
import { ProgressBar } from './ProgressBar';

function useNow(intervalMs: number, enabled: boolean): number {
  const [now, setNow] = useState<number>(() => performance.now());
  useEffect(() => {
    if (!enabled) return undefined;
    const id = window.setInterval(() => setNow(performance.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}

function useMemory(enabled: boolean): number | null {
  const [mem, setMem] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) {
      setMem(null);
      return undefined;
    }
    const update = (): void => {
      const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
      if (perf.memory) setMem(perf.memory.usedJSHeapSize);
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [enabled]);
  return mem;
}

function getProgressFromSteps(steps: readonly AlgorithmStep[]): number | 'unknown' {
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i];
    if (s?.type === 'progress') return s.total;
  }
  return 0;
}

function computeProgressPct(total: number | 'unknown', explored: number): number {
  if (total === 'unknown' || total === 0) return 0;
  return Math.min(100, (explored / total) * 100);
}

function MetricsGrid(): JSX.Element {
  const explored = useSimulationStore((s) => s.exploredCount);
  const pruned = useSimulationStore((s) => s.prunedCount);
  const bestCost = useSimulationStore((s) => s.bestCost);
  const bestTour = useSimulationStore((s) => s.bestTour);
  const algorithmId = useSimulationStore((s) => s.config.algorithmId);
  const tourText = bestTour === null ? '—' : bestTour.map((i) => i + 1).join(' → ');
  const showPruned = algorithmId === 'branch-and-bound';
  return (
    <>
      <MetricCard
        label="Best cost"
        value={bestCost === null ? '—' : formatNumber(bestCost)}
        tooltip="Cost of the best tour found so far"
      />
      <MetricCard
        label="Nodes explored"
        value={formatNumber(explored)}
        tooltip="Number of search nodes visited"
      />
      {showPruned ? (
        <MetricCard
          label="Pruned"
          value={formatNumber(pruned)}
          tooltip="Branches cut by the lower bound"
        />
      ) : null}
      <MetricCard
        label="Best tour"
        value={tourText}
        tooltip="Best Hamiltonian cycle / path so far"
      />
    </>
  );
}

function WallTimeCard(): JSX.Element {
  const status = useSimulationStore((s) => s.status);
  const startedAt = useSimulationStore((s) => s.startedAt);
  const finishedAt = useSimulationStore((s) => s.finishedAt);
  const isRunning = status === 'running';
  const now = useNow(100, isRunning);
  const elapsed = startedAt === null ? 0 : (finishedAt ?? now) - startedAt;
  return <MetricCard label="Wall time" value={formatMs(elapsed)} tooltip="Elapsed time since Start" />;
}

function MemoryCard(): JSX.Element {
  const status = useSimulationStore((s) => s.status);
  const isRunning = status === 'running';
  const mem = useMemory(isRunning);
  return (
    <MetricCard
      label="Memory"
      value={mem === null ? '—' : formatBytes(mem)}
      tooltip="JS heap usage (Chromium only)"
    />
  );
}

function ProgressCard(): JSX.Element {
  const status = useSimulationStore((s) => s.status);
  const steps = useSimulationStore((s) => s.steps);
  const explored = useSimulationStore((s) => s.exploredCount);
  const [progress, setProgress] = useState<number>(0);
  useEffect(() => {
    const total = getProgressFromSteps(steps);
    setProgress(computeProgressPct(total, explored));
  }, [steps, explored]);
  const isCompleted = status === 'completed';
  const pct = isCompleted ? 100 : progress;
  return (
    <section className="rounded border border-gray-200 bg-white p-2">
      <div className="text-[10px] font-semibold uppercase text-gray-500">Progress</div>
      <div className="mt-1">
        <ProgressBar value={pct} />
      </div>
      <div className="mt-1 text-right text-[10px] text-gray-500">
        {isCompleted ? '100%' : `${Math.round(pct)}%`}
      </div>
    </section>
  );
}

export function StatisticsPanel(): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-gray-900">Statistics</h2>
      <ComplexityCard />
      <WallTimeCard />
      <MetricsGrid />
      <MemoryCard />
      <ProgressCard />
    </div>
  );
}
