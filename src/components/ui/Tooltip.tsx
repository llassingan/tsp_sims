/**
 * Tooltip — Zero-JS, CSS-only tooltip using Tailwind's group-hover pattern.
 *
 * Placed above the tooltip content in the DOM as a sibling of the trigger
 * element, wrapped in a `group` container. Appears on hover (group-hover:block)
 * and on keyboard focus (group-focus-within:block), centered above the trigger.
 * `pointer-events-none` prevents the tooltip from stealing hover from the
 * trigger element.
 *
 * Used across the Control Panel for inline help: the "?" circle icons in
 * Weight Source and View selectors are wrapped in Tooltip so users can hover
 * for an explanation without cluttering the UI.
 */

import type { ReactNode } from 'react';

/**
 * Props for the Tooltip component.
 */
interface TooltipProps {
  /** The tooltip body — can be text or any ReactNode. */
  readonly content: ReactNode;
  /** The trigger element (e.g. a "?" icon) that reveals the tooltip on hover. */
  readonly children: ReactNode;
}

/**
 * Tooltip — CSS-only hover/focus tooltip with dark background.
 *
 * Relies on Tailwind's `group` modifier: the parent span is `group relative`,
 * and the tooltip bubble uses `group-hover:block group-focus-within:block`.
 * This means the tooltip appears on both mouse hover and keyboard focus
 * (e.g. Tab to the "?" icon), with zero JavaScript.
 */
export function Tooltip({ content, children }: TooltipProps): JSX.Element {
  return (
    <span className="group relative inline-block">
      {children}
      {/* The tooltip bubble: hidden by default, revealed via group-hover */}
      <span className="pointer-events-none absolute left-1/2 top-full z-10 hidden -translate-x-1/2 translate-y-1 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white shadow group-hover:block group-focus-within:block">
        {content}
      </span>
    </span>
  );
}
