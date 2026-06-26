/**
 * ProgressBar.tsx — Accessible Animated Progress Bar
 *
 * Renders a horizontal progress bar with smooth CSS transitions. The bar
 * color is green (tsp-bestTour) at 100% and blue (tsp-currentTour)
 * otherwise. Fully accessible with role="progressbar" and aria-valuenow/
 * aria-valuemin/aria-valuemax attributes.
 *
 * @module ProgressBar
 */

interface ProgressBarProps {
  readonly value: number;
}

/**
 * A progress bar with color state (green at 100%, blue otherwise) and
 * smooth width transitions.
 *
 * @param value - Progress percentage (0-100). Clamped internally.
 */
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
