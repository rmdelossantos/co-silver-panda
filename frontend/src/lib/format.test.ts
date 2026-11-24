import { describe, expect, it } from 'vitest';
import { formatPrice, shortName } from './format';

describe('formatPrice', () => {
  it('formats USD with cents', () => {
    expect(formatPrice(1000000)).toBe('$1,000,000.00');
  });
});

describe('shortName', () => {
  it('leaves short names alone', () => {
    expect(shortName('Desk Lamp')).toBe('Desk Lamp');
  });

  it('truncates long names with an ellipsis within the limit', () => {
    const result = shortName('W'.repeat(100));

    expect(result).toHaveLength(48);
    expect(result.endsWith('…')).toBe(true);
  });
});
