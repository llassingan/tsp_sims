/**
 * Complexity formatting hook — currently a pass-through placeholder.
 *
 * ## Why this exists as a separate function
 *
 * The algorithm registry stores Big-O strings in raw notation (e.g.,
 * "O(n^2·2^n)" for Held-Karp, "O(n!)" for Brute Force). This function
 * is a dedicated formatting step so that the UI rendering layer never
 * couples directly to the raw registry strings.
 *
 * ## Future intent
 *
 * Eventually this function will transform raw Big-O into rich rendering:
 * - LaTeX or MathML output for math-rendered tooltips
 * - Color-coded HTML spans for different complexity classes
 * - Client-side complexity substitution (e.g., actual n plugged in)
 *
 * For now it returns the string unchanged — the algorithm registry values
 * are already human-readable enough for the current UI.
 *
 * @param s - Raw Big-O notation string from the algorithm registry.
 * @returns The same string, unchanged.
 */
export function formatBigO(s: string): string {
  return s;
}
