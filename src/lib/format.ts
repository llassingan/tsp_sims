/**
 * Display formatting utilities for the TSP Simulator UI.
 *
 * These are pure formatting functions — they convert raw numeric values
 * (step counts, elapsed milliseconds, memory estimates) into human-readable
 * strings for rendering in panels, tooltips, and stat bars. They deliberately
 * use the `en-US` locale for consistency across all users regardless of
 * browser language settings.
 */

/**
 * Formats an integer with thousands separators using the `en-US` locale.
 *
 * Used for displaying counts like explored states, pruned branches, and
 * solution step totals. Rounds to nearest integer first to avoid fractional
 * display noise from float arithmetic.
 *
 * @param n - The number to format.
 * @returns Locale-formatted string (e.g., "1,234,567"), or "∞"/"-∞" for
 *          non-finite values.
 */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '-∞';
  return Math.round(n).toLocaleString('en-US');
}

/**
 * Formats a duration in milliseconds into a human-readable time string.
 *
 * Uses progressive units: sub-second values stay in ms, values under 60
 * seconds show with one decimal, and longer durations expand to "X m Y s".
 * This keeps the UI compact while still being precise where it matters.
 *
 * @param ms - Duration in milliseconds.
 * @returns Formatted string (e.g., "320 ms", "2.3 s", "1 m 15 s"), or "∞"
 *          for non-finite values.
 */
export function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return '∞';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m} m ${s} s`;
}

/**
 * Formats a byte count into a human-readable size string.
 *
 * Used primarily for displaying algorithmic memory estimates (e.g., DP table
 * sizes). Uses binary prefixes (1024-based). Negative or non-finite values
 * produce an em-dash placeholder.
 *
 * @param bytes - The number of bytes.
 * @returns Formatted string (e.g., "512 B", "4.2 KB", "1.3 MB"), or "—" for
 *          invalid input.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
