import type { ReactNode } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';

interface MetricCardProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly unit?: string;
  readonly tooltip?: string;
  readonly trend?: 'up' | 'down' | 'flat';
}

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
