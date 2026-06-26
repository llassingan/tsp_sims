/**
 * MetricCard.tsx — Individual Metric Display
 *
 * A compact card that shows a labeled metric value with optional unit,
 * tooltip, and trend arrow. Used by MetricsGrid, WallTimeCard, and
 * MemoryCard in the StatisticsPanel.
 *
 * Props:
 *   label   — Short label rendered as uppercased text above the value.
 *   value   — The displayed metric (string, number, or ReactNode).
 *   unit    — Optional unit string shown after the value in small text.
 *   tooltip — Hover tooltip text (fallback: the label itself).
 *   trend   — Optional direction arrow: 'up' (green), 'down' (red), 'flat'.
 *
 * @module MetricCard
 */

import type { ReactNode } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';

interface MetricCardProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly unit?: string;
  readonly tooltip?: string;
  readonly trend?: 'up' | 'down' | 'flat';
}

/**
 * Displays a single metric with label, value, optional unit, tooltip,
 * and an optional trend arrow.
 */
export function MetricCard({ label, value, unit, tooltip, trend }: MetricCardProps): JSX.Element {
  return (
    <section className="rounded border border-gray-200 bg-white p-2">
      <Tooltip content={tooltip ?? label}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase text-gray-500">{label}</span>
          {trend === 'up' ? <span className="text-[10px] text-tsp-bestTour">▲</span> : null}
          {trend === 'down' ? <span className="text-[10px] text-tsp-explored">▼</span> : null}
        </div>
      </Tooltip>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-mono text-lg font-semibold text-gray-900">{value}</span>
        {unit ? <span className="text-[10px] text-gray-500">{unit}</span> : null}
      </div>
    </section>
  );
}
