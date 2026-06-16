import { describe, expect, it } from 'vitest';
import { ALGORITHMS, getAlgorithm } from '@/algorithms';

describe('algorithms registry', () => {
  it('has all four algorithms', () => {
    expect(Object.keys(ALGORITHMS).sort()).toEqual(
      ['branch-and-bound', 'brute-force', 'held-karp', 'nearest-neighbor'].sort(),
    );
  });

  it('getAlgorithm returns the instance', () => {
    expect(getAlgorithm('brute-force').id).toBe('brute-force');
    expect(getAlgorithm('held-karp').id).toBe('held-karp');
  });

  it('getAlgorithm throws on unknown id', () => {
    expect(() => getAlgorithm('bogus' as never)).toThrow();
  });
});
