/**
 * Button — Reusable action button primitive for the TSP Simulator.
 *
 * Provides three semantic variants mapped to the Wong palette design tokens
 * so call-to-actions feel intentional throughout the 3-pane layout.
 *   - primary   -> green  (bg-tsp-bestTour) for affirmative actions like Start
 *   - secondary -> blue   (bg-tsp-currentTour) for secondary actions like Reset
 *   - ghost     -> transparent with hover bg, for low-emphasis actions like Presets
 *
 * Two sizes (sm / md) cover compact preset buttons and full-width CTA buttons
 * respectively. The loading state swaps the children with a CSS-only spinner
 * so there is zero layout shift when toggling between idle and loading.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Semantic variant of the button.
 * - `primary`   — green, high-emphasis CTA
 * - `secondary` — blue, medium-emphasis action (e.g. Reset)
 * - `ghost`     — transparent, low-emphasis (e.g. preset quick-load)
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

/**
 * Physical size preset for the button.
 * - `sm` — compact, used in preset rows
 * - `md` — standard, used for standalone actions
 */
export type ButtonSize = 'sm' | 'md';

/**
 * Props for the Button component.
 * Extends native button attributes so consumers can pass onClick, title, etc.
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant. Defaults to 'primary'. */
  readonly variant?: ButtonVariant;
  /** Size preset. Defaults to 'md'. */
  readonly size?: ButtonSize;
  /** When true, shows an inline CSS spinner and disables the button. */
  readonly loading?: boolean;
  readonly children: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-tsp-bestTour text-white hover:opacity-90 disabled:bg-gray-300',
  secondary: 'bg-tsp-currentTour text-white hover:opacity-90 disabled:bg-gray-300',
  ghost: 'bg-transparent text-gray-800 hover:bg-gray-100 disabled:text-gray-400',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
};

/**
 * Button — Reusable button with variant, size, and loading states.
 *
 * The loading spinner uses a simple `●` character with `animate-spin` so it
 * works without an icon library or SVG. It is placed inline before children
 * to avoid shifting the button text when toggled.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  className = '',
  ...rest
}: ButtonProps): JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tsp-bestTour ${variantClass[variant]} ${sizeClass[size]} ${isDisabled ? 'cursor-not-allowed' : ''} ${className}`}
      disabled={isDisabled}
      {...rest}
    >
      {/* CSS-only spinning dot — no icon dependency */}
      {loading ? <span className="mr-1 animate-spin">●</span> : null}
      {children}
    </button>
  );
}
