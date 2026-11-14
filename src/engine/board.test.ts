import { describe, expect, it } from 'vitest';
import { buildBoard } from './board';

describe('buildBoard (configuración Talcapolis)', () => {
  const board = buildBoard();
  const names = (list: { name: string }[]) => list.map((s) => s.name);

  it('incluye de 2 Poniente a 11 Oriente sin calle "0", más 9½ Oriente', () => {
    const v = names(board.verticalStreets);
    expect(v).toHaveLength(14);
    expect(v.slice(0, 3)).toEqual(['2 Poniente', '1 Poniente', '1 Oriente']);
    expect(v.at(-1)).toBe('11 Oriente');
    expect(v).toContain('9½ Oriente');
    expect(v.indexOf('9½ Oriente')).toBe(v.indexOf('9 Oriente') + 1);
  });

  it('incluye de 2 Sur a 4 Norte, más 1½ Norte y 3½ Norte', () => {
    expect(names(board.horizontalStreets)).toEqual([
      '2 Sur', '1 Sur', '1 Norte', '1½ Norte', '2 Norte', '3 Norte', '3½ Norte', '4 Norte',
    ]);
  });

  it('genera 88 intersecciones y 154 tramos (casillas)', () => {
    expect(board.intersections).toHaveLength(88);
    expect(board.segments).toHaveLength(154);
  });

  it('las calles parciales solo se cruzan dentro de su tramo', () => {
    const cross = (id: string) =>
      board.intersections
        .filter((i) => i.vertical.id === id || i.horizontal.id === id)
        .map((i) => (i.vertical.id === id ? i.horizontal.id : i.vertical.id));
    expect(cross('1.5-norte')).toEqual(['5-oriente', '6-oriente']);
    expect(cross('3.5-norte').sort()).toEqual(['10-oriente', '11-oriente', '7-oriente', '8-oriente', '9-oriente', '9.5-oriente']);
    expect(cross('9.5-oriente').sort()).toEqual(['3-norte', '3.5-norte', '4-norte']);
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

  it('sin las calles entre las que existe, una calle intermedia no se incluye', () => {
    const small = buildBoard({
      west: { side: 'Poniente', n: 2 },
      east: { side: 'Oriente', n: 4 },
      south: { side: 'Sur', n: 2 },
      north: { side: 'Norte', n: 4 },
    });
    expect(small.horizontalStreets.map((s) => s.id)).not.toContain('1.5-norte');
    expect(small.verticalStreets.map((s) => s.id)).not.toContain('9.5-oriente');
  });
});
