import type { ChangeEvent, ReactNode } from 'react';

interface NumberInputProps {
  readonly label: string;
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly tooltip?: string;
  readonly error?: string | undefined;
  readonly disabled?: boolean;
  readonly onChange: (n: number) => void;
  readonly id?: string;
}

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
          if (Number.isFinite(v)) onChange(v);
        }}
        className={`rounded border px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tsp-bestTour disabled:bg-gray-100 ${error ? 'border-red-500' : 'border-gray-300'}`}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}

interface RadioGroupProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly { value: T; label: string; hint?: ReactNode }[];
  readonly onChange: (v: T) => void;
  readonly name: string;
  readonly disabled?: boolean;
}

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
            {opt.hint ? <span className="text-[10px] text-gray-500">{opt.hint}</span> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
