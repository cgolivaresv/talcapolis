import { describe, expect, it } from 'vitest';
import trafficData from '../data/talca-traffic.json';
import { buildBoard } from './board';
import { canEnter, directionOf, legalMoves } from './traffic';

describe('traffic', () => {
  const board = buildBoard();
  const seg = (id: string) => board.segments.find((s) => s.id === id)!;

  it('los datos cubren exactamente los tramos del tablero (sin desfases con el script)', () => {
    expect(Object.keys(trafficData.directions).sort()).toEqual(board.segments.map((s) => s.id).sort());
  });

  it('1 Norte y 2 Norte tienen sentidos opuestos (calles alternadas)', () => {
    const a = directionOf(seg('1-norte:1-oriente-2-oriente'));
    const b = directionOf(seg('2-norte:1-oriente-2-oriente'));
    expect(a).not.toBe('both');
    expect(b).not.toBe('both');
    expect(a).not.toBe(b);
  });

  it('la Alameda (4 Norte) es de doble sentido en todo su largo', () => {
    const alameda = board.segments.filter((s) => s.street.id === '4-norte');
    expect(alameda.length).toBeGreaterThanOrEqual(12);
    expect(alameda.every((s) => directionOf(s) === 'both')).toBe(true);
  });

  it('en una calle de un solo sentido solo se entra por su origen', () => {
    const s = board.segments.find((x) => directionOf(x) === 'forward')!;
    expect(canEnter(s, s.from)).toBe(true);
    expect(canEnter(s, s.to)).toBe(false);
    const r = board.segments.find((x) => directionOf(x) === 'backward')!;
    expect(canEnter(r, r.to)).toBe(true);
    expect(canEnter(r, r.from)).toBe(false);
  });

  it('legalMoves nunca ofrece un tramo en contra del sentido y siempre hay salida', () => {
    for (const node of board.intersections) {
      const moves = legalMoves(board, node.id);
      expect(moves.length).toBeGreaterThan(0);
      for (const m of moves) {
        const dir = directionOf(m.segment);
        const forwardTravel = node.id === m.segment.from;
        if (dir === 'forward') expect(forwardTravel).toBe(true);
        if (dir === 'backward') expect(forwardTravel).toBe(false);
      }
    }
  });
});
