import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/rng';

describe('createRng', () => {
  it('seed=42 matches reference sequence', () => {
    const rng = createRng(42);
    const expected = [
      0.6011037519201636, 0.44829055899754167, 0.8524657934904099, 0.6697340414393693,
      0.17481389874592423,
    ];
    for (const v of expected) {
      expect(rng()).toBeCloseTo(v, 10);
    }
  });

  it('same seed → same sequence', () => {
    const a = createRng(123);
    const b = createRng(123);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });

  it('different seeds → different sequences (early draws)', () => {
    const a = createRng(1);
    const b = createRng(2);
    let same = 0;
    for (let i = 0; i < 5; i++) {
      if (a() === b()) same++;
    }
    expect(same).toBeLessThan(2);
  });
});
