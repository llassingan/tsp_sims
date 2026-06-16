/**
 * mulberry32 — fast, small, good-enough PRNG.
 * Source: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
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
