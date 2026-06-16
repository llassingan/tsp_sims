interface ProgressBarProps {
  readonly value: number;
}

export function ProgressBar({ value }: ProgressBarProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));
  const color = clamped >= 100 ? 'bg-tsp-bestTour' : 'bg-tsp-currentTour';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className={`h-full ${color} transition-all duration-200`}
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
