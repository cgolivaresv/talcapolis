import { describe, expect, it } from 'vitest';
import { buildBoard } from './board';

describe('buildBoard (configuración Talcapolis)', () => {
  const board = buildBoard();

  it('incluye 2 Poniente a 11 Oriente sin calle "0": 13 calles verticales', () => {
    expect(board.verticalStreets).toHaveLength(13);
    expect(board.verticalStreets[0].name).toBe('2 Poniente');
    expect(board.verticalStreets[1].name).toBe('1 Poniente');
    expect(board.verticalStreets[2].name).toBe('1 Oriente');
    expect(board.verticalStreets.at(-1)?.name).toBe('11 Oriente');
  });

  it('incluye 2 Sur a 4 Norte: 6 calles horizontales', () => {
    expect(board.horizontalStreets.map((s) => s.name)).toEqual([
      '2 Sur', '1 Sur', '1 Norte', '2 Norte', '3 Norte', '4 Norte',
    ]);
  });

  it('genera 78 intersecciones y 137 tramos (casillas)', () => {
    expect(board.intersections).toHaveLength(13 * 6);
    expect(board.segments).toHaveLength(12 * 6 + 13 * 5);
  });

  it('los ids de tramos son únicos', () => {
    expect(new Set(board.segments.map((s) => s.id)).size).toBe(board.segments.length);
  });

  it('rechaza límites invertidos', () => {
    expect(() =>
      buildBoard({
        west: { side: 'Oriente', n: 5 },
        east: { side: 'Poniente', n: 1 },
        south: { side: 'Sur', n: 2 },
        north: { side: 'Norte', n: 4 },
      }),
    ).toThrow();
  });
});
