import type { ChangeEvent, ReactNode } from 'react';

interface SelectProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly { value: T; label: string; hint?: ReactNode }[];
  readonly onChange: (v: T) => void;
  readonly tooltip?: string;
  readonly disabled?: boolean;
  readonly id?: string;
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  tooltip,
  disabled = false,
  id,
}: SelectProps<T>): JSX.Element {
  const selectId = id ?? `sel-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-xs font-medium text-gray-700" title={tooltip ?? ''}>
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        disabled={disabled}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as T)}
        className="rounded border border-gray-300 px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tsp-bestTour disabled:bg-gray-100"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
