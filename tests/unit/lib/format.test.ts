import { describe, expect, it } from 'vitest';
import { formatBytes, formatMs, formatNumber } from '@/lib/format';

describe('format', () => {
  it('formatNumber adds thousands separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(42)).toBe('42');
  });

  it('formatMs uses correct unit', () => {
    expect(formatMs(500)).toBe('500 ms');
    expect(formatMs(2500)).toBe('2.5 s');
    expect(formatMs(83_000)).toBe('1 m 23 s');
  });

  it('formatBytes uses correct unit', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
