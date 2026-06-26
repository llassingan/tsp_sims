/**
 * Select — Generic type-safe dropdown wrapper for the TSP Simulator.
 *
 * Wraps a native <select> with a consistent label, optional tooltip (shown as
 * the label's title attribute), and focus ring matching the design system.
 * The type parameter T constrains the value to a string union so the onChange
 * callback is type-safe without casting at every call site.
 *
 * Shared with AlgorithmSelect (the only dropdown consumer) to keep the
 * control-panel form controls visually consistent.
 */

import type { ChangeEvent, ReactNode } from 'react';

/**
 * Props for the Select component.
 *
 * @template T — string union of allowed option values
 */
interface SelectProps<T extends string> {
  /** Label text rendered above the dropdown. */
  readonly label: string;
  /** Currently selected value (must match one of the option values). */
  readonly value: T;
  /**
   * List of options. Each option can carry an optional `hint` node, though
   * Select renders only `label` in the <option> text. (Hints are available
   * for RadioGroup, which shares the same option shape.)
   */
  readonly options: readonly { value: T; label: string; hint?: ReactNode }[];
  /** Called with the newly selected value (typed as T). */
  readonly onChange: (v: T) => void;
  /** Tooltip text exposed via the label's `title` attribute. */
  readonly tooltip?: string;
  /** When true, the select is grayed out and non-interactive. */
  readonly disabled?: boolean;
  /** Optional explicit DOM id. Auto-generated from the label when omitted. */
  readonly id?: string;
}

/**
 * Select — Type-safe dropdown with consistent label and focus styling.
 *
 * Uses a native <select> so touch/mobile browsers get their platform-native
 * picker UI. The generic type parameter T ensures that onChange receives a
 * value of the correct union type, not a plain `string`.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  tooltip,
  disabled = false,
  id,
}: SelectProps<T>): JSX.Element {
  // Derive a stable DOM id from the label so labels and selects stay connected.
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
