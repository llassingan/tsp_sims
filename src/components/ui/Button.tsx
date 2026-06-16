import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
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
      {loading ? <span className="mr-1 animate-spin">●</span> : null}
      {children}
    </button>
  );
}
