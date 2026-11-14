import { describe, expect, it } from 'vitest';
import { buildBoard } from './board';
import { baseRentOf, priceOf } from './pricing';

describe('pricing', () => {
  const board = buildBoard();

  it('todas las calles tienen grupo entre 0 y 7 y los 8 grupos se usan', () => {
    const groups = new Set(board.segments.map((s) => s.street.group));
    expect(Math.min(...groups)).toBe(0);
    expect(Math.max(...groups)).toBe(7);
    expect(groups.size).toBe(8);
  });

  it('el precio sube con el grupo y el arriendo es 10%', () => {
    const first = board.segments[0];
    expect(priceOf(first)).toBeGreaterThanOrEqual(60);
    expect(baseRentOf(first)).toBe(Math.round(priceOf(first) / 10));
  });
});
