import { describe, expect, it } from 'vitest';
import { buildBoard } from './board';
import { LANDMARKS, placeLandmarks, type Landmark } from './landmarks';

describe('landmarks', () => {
  const board = buildBoard();

  it('todos los edificios se anclan a calles que existen en el tablero', () => {
    expect(() => placeLandmarks(board)).not.toThrow();
    expect(placeLandmarks(board)).toHaveLength(LANDMARKS.length);
  });

  it('los ids son únicos', () => {
    expect(new Set(LANDMARKS.map((l) => l.id)).size).toBe(LANDMARKS.length);
  });

  it('la Estación está en la esquina inferior izquierda y la Corte en la superior derecha', () => {
    const placed = placeLandmarks(board);
    const estacion = placed.find((l) => l.id === 'estacion')!;
    const corte = placed.find((l) => l.id === 'corte-apelaciones')!;
    expect([estacion.row, estacion.col]).toEqual([board.verticalStreets.length - 1, 0]);
    expect([corte.row, corte.col]).toEqual([0, board.horizontalStreets.length - 1]);
  });

  it('la Plaza de Armas queda en el centro de su manzana', () => {
    const plaza = placeLandmarks(board).find((l) => l.id === 'plaza-de-armas')!;
    expect([plaza.row, plaza.col]).toEqual([1.5, 1.5]);
  });

  it('un ancla inexistente lanza error', () => {
    const bad: Landmark = {
      id: 'x', name: 'x', icon: 'x', where: 'x',
      anchor: { type: 'intersection', vertical: '99-oriente', horizontal: '1-sur' },
    };
    expect(() => placeLandmarks(board, [bad])).toThrow();
  });
});
