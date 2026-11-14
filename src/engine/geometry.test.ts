import { describe, expect, it } from 'vitest';
import { buildBoard } from './board';

describe('geometría real', () => {
  const board = buildBoard();

  it('las posiciones crecen en cada eje y arrancan en 0', () => {
    for (const list of [board.verticalStreets, board.horizontalStreets]) {
      expect(list[0].positionM).toBe(0);
      for (let i = 1; i < list.length; i++) {
        expect(list[i].positionM).toBeGreaterThan(list[i - 1].positionM);
      }
    }
  });

  it('las separaciones entre calles miden entre 40 y 220 m', () => {
    for (const list of [board.verticalStreets, board.horizontalStreets]) {
      for (let i = 1; i < list.length; i++) {
        const gap = list[i].positionM - list[i - 1].positionM;
        expect(gap).toBeGreaterThanOrEqual(40);
        expect(gap).toBeLessThanOrEqual(220);
      }
    }
  });
});
