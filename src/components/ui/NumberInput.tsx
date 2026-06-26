/**
 * NumberInput & RadioGroup — Reusable form primitives for the TSP Simulator.
 *
 * NumberInput wraps a native <input type="number"> with a consistent label,
 * min/max validation, optional tooltip (shown as the label's title attribute),
 * and a red error message row. Values are defensively gated with
 * Number.isFinite() so that empty or non-numeric input is silently rejected
 * rather than setting the store to NaN.
 *
 * RadioGroup renders a <fieldset> of visually-hidden native radio inputs
 * styled as pill/toggle buttons. The native input is `sr-only` so keyboard
 * and screen-reader behavior is preserved while the visual label gets the
 * active/inactive border treatment. Each option can carry an optional `hint`
 * node (e.g. "optimal" / "heuristic" labels).
 */

import type { ChangeEvent, ReactNode } from 'react';

/**
 * Props for the NumberInput component.
 */
interface NumberInputProps {
  /** Label text rendered above the input. */
  readonly label: string;
  /** Current numeric value. */
  readonly value: number;
  /** Minimum allowed value (inclusive). Shown as the native `min` attribute. */
  readonly min?: number;
  /** Maximum allowed value (inclusive). Shown as the native `max` attribute. */
  readonly max?: number;
  /** Step increment for the native spinner arrows. Defaults to 1. */
  readonly step?: number;
  /** Tooltip text exposed via the label's `title` attribute. */
  readonly tooltip?: string;
  /**
   * Validation error message. When set, the border turns red and the message
   * is rendered below the input. When undefined, the input uses its default
   * gray border.
   */
  readonly error?: string | undefined;
  /** When true, the input is grayed out and non-interactive. */
  readonly disabled?: boolean;
  /** Called with the parsed numeric value on every valid change. */
  readonly onChange: (n: number) => void;
  /** Optional explicit DOM id. Auto-generated from the label when omitted. */
  readonly id?: string;
}

/**
 * NumberInput — Labeled numeric input with min/max bounds and error display.
 *
 * Handles the common pattern of "parse number from input, guard against NaN,
 * apply to store" so every control panel field doesn't need to repeat the
 * same defensive boilerplate.
 */
export function NumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  tooltip,
  error,
  disabled = false,
  onChange,
  id,
}: NumberInputProps): JSX.Element {
  // Derive a stable DOM id from the label so labels and inputs stay connected
  // without the consumer having to provide an id for every field.
  const inputId = id ?? `ni-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-xs font-medium text-gray-700" title={tooltip ?? ''}>
        {label}
      </label>
      <input
        id={inputId}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const v = e.target.valueAsNumber;
          // Reject NaN / Infinity so the store never receives invalid numbers.
          if (Number.isFinite(v)) onChange(v);
        }}
        className={`rounded border px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tsp-bestTour disabled:bg-gray-100 ${error ? 'border-red-500' : 'border-gray-300'}`}
      />
      {/* Error message only occupies space when present — no layout shift. */}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}

/**
 * Props for the RadioGroup component.
 *
 * @template T — string union type of the option values (e.g. 'cycle' | 'path')
 */
interface RadioGroupProps<T extends string> {
  /** Legend text rendered above the options. */
  readonly label: string;
  /** Currently selected value. */
  readonly value: T;
  /**
   * List of options. Each option can carry an optional `hint` node rendered
   * in a smaller font next to the label (used for "optimal"/"heuristic"
   * annotations in the Algorithm selector).
   */
  readonly options: readonly { value: T; label: string; hint?: ReactNode }[];
  /** Called with the newly selected value. */
  readonly onChange: (v: T) => void;
  /** HTML name attribute for the radio group (must be unique per group). */
  readonly name: string;
  /** When true, all options are visually dimmed and non-interactive. */
  readonly disabled?: boolean;
}

/**
 * RadioGroup — Toggle-pill radio group built on native inputs.
 *
 * Uses `sr-only` <input type="radio"> elements so the group is fully
 * keyboard-navigable (arrow keys, Tab) and screen-reader accessible.
 * The visible <label> gets the active/inactive border treatment via
 * the checked CSS selector, creating pill-shaped toggle buttons.
 */
export function RadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  name,
  disabled = false,
}: RadioGroupProps<T>): JSX.Element {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-xs font-medium text-gray-700">{label}</legend>
      <div className="flex gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded border px-2 py-1 text-xs ${value === opt.value ? 'border-tsp-bestTour bg-green-50 text-tsp-bestTour' : 'border-gray-300 text-gray-700'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {/* sr-only: visually hidden but accessible to AT and keyboard */}
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              disabled={disabled}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span>{opt.label}</span>
            {/* Optional hint (e.g. "optimal") shown in a subdued size */}
            {opt.hint ? <span className="text-[10px] text-gray-500">{opt.hint}</span> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
