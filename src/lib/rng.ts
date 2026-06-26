/**
 * Deterministic pseudo-random number generator for the TSP Simulator.
 *
 * ## Why mulberry32?
 *
 * Mulberry32 is a fast, small, 32-bit state PRNG that produces high-quality
 * uniform [0,1) floats when normalized by 2^32. It was chosen over built-in
 * Math.random() because:
 *
 * - **Determinism**: The same seed always produces the same sequence. This
 *   means graph layouts (node positions, edge weights) are perfectly
 *   reproducible — critical for benchmarking, debugging, and sharing
 *   specific problem instances between users.
 * - **Speed**: Three integer multiplies and a few shifts/xors per call. Much
 *   lighter than crypto-random alternatives, which matters when generating
 *   O(n^2) edge weights for large graphs (e.g., n=200 produces 40,000 calls).
 * - **Stateless closure**: The returned function closes over a single 32-bit
 *   integer state. No global state, no allocations — trivially shareable
 *   across generators and workers.
 *
 * ## Usage in the TSP Simulator
 *
 * This RNG feeds both node position generation (x/y coordinates in the unit
 * square) and edge weight generation (uniform random or euclidean-distance-
 * derived weights). A single `seed` value pins the entire graph instance,
 * so users can bookmark a seed to revisit the same problem layout.
 *
 * Source: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
 *
 * @param seed - 32-bit integer seed; same seed = same output sequence.
 * @returns A zero-argument function that returns successive floats in [0, 1).
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function rng(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
