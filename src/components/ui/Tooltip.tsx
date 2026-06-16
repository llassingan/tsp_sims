import type { ReactNode } from 'react';

interface TooltipProps {
  readonly content: ReactNode;
  readonly children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps): JSX.Element {
  return (
    <span className="group relative inline-block">
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-10 hidden -translate-x-1/2 translate-y-1 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white shadow group-hover:block group-focus-within:block">
        {content}
      </span>
    </span>
  );
}
