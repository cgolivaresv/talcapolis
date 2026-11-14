import { describe, expect, it } from 'vitest';
import { buildBoard } from './board';

describe('buildBoard (configuración Talcapolis)', () => {
  const board = buildBoard();
  const names = (list: { name: string }[]) => list.map((s) => s.name);

  it('incluye de 2 Poniente a 11 Oriente sin calle "0"', () => {
    const v = names(board.verticalStreets);
    expect(v).toHaveLength(13);
    expect(v.slice(0, 3)).toEqual(['2 Poniente', '1 Poniente', '1 Oriente']);
    expect(v.at(-1)).toBe('11 Oriente');
  });

  it('incluye de 2 Sur a 4 Norte, sin calles intermedias', () => {
    expect(names(board.horizontalStreets)).toEqual([
      '2 Sur', '1 Sur', '1 Norte', '2 Norte', '3 Norte', '4 Norte',
    ]);
  });

  it('genera 78 intersecciones y 137 tramos (casillas)', () => {
    expect(board.intersections).toHaveLength(78);
    expect(board.segments).toHaveLength(137);
  });

  it('cada tramo une dos intersecciones que existen', () => {
    const ids = new Set(board.intersections.map((i) => i.id));
    for (const s of board.segments) {
      expect(ids.has(s.from)).toBe(true);
      expect(ids.has(s.to)).toBe(true);
    }
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
