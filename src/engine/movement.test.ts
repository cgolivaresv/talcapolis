import { describe, expect, it } from 'vitest';
import { buildBoard } from './board';
import { cardSquaresOf } from './cards';
import { moveTo, newGame, roll } from './game';
import { placeLandmarks } from './landmarks';
import { START_NODE, destinations, rollDice } from './movement';
import { canEnter, legalMoves } from './traffic';

const board = buildBoard();
const landmarks = placeLandmarks(board);
const ctx = { board, landmarks, cardSquares: cardSquaresOf(board, landmarks) };

describe('movimiento por las calles', () => {
  it('cada recorrido avanza exactamente N tramos, respetando el sentido', () => {
    for (const steps of [2, 5, 9, 12]) {
      const ds = destinations(board, START_NODE, steps);
      expect(ds.length).toBeGreaterThan(0);
      for (const d of ds) {
        expect(d.path).toHaveLength(steps + 1);
        expect(d.path[d.path.length - 1]).toBe(d.node);
        for (let k = 0; k < steps; k++) {
          const ok = legalMoves(board, d.path[k]).some((m) => m.to === d.path[k + 1]);
          expect(ok).toBe(true);
        }
      }
    }
  });

  it('no se da media vuelta si hay otra salida', () => {
    const [first] = legalMoves(board, START_NODE);
    for (const d of destinations(board, first.to, 2, START_NODE)) {
      expect(d.path[2]).not.toBe(START_NODE);
    }
  });

  it('los sentidos únicos se respetan: nadie entra a un tramo en contra', () => {
    const oneWay = board.segments.find((s) => !canEnter(s, s.to) && canEnter(s, s.from));
    if (oneWay) expect(legalMoves(board, oneWay.to).some((m) => m.segment === oneWay)).toBe(false);
  });

  it('los dados son deterministas por semilla y están entre 1 y 6', () => {
    expect(rollDice(7)).toEqual(rollDice(7));
    let seed = 1;
    for (let k = 0; k < 200; k++) {
      const r = rollDice(seed);
      seed = r.seed;
      for (const d of r.dice) expect(d >= 1 && d <= 6).toBe(true);
    }
  });
});

describe('turnos', () => {
  it('tirar, elegir destino y pasar el turno', () => {
    let g = newGame(['A', 'B'], 11);
    g = roll(g, board);
    expect(g.options.length).toBeGreaterThan(0);
    const dest = g.options[0].node;
    const double = g.dice![0] === g.dice![1];
    g = moveTo(g, dest, ctx);
    expect(g.players[0].at === dest || g.players[0].at !== START_NODE).toBe(true);
    expect(g.current).toBe(double ? 0 : 1);
    expect(g.options).toHaveLength(0);
  });

  it('una partida larga no rompe ninguna regla', () => {
    let g = newGame(['A', 'B', 'C'], 5);
    for (let k = 0; k < 600; k++) {
      g = roll(g, board);
      if (g.options.length > 0) {
        const pick = g.options[k % g.options.length];
        g = moveTo(g, pick.node, ctx);
      }
      for (const p of g.players) expect(board.intersections.some((n) => n.id === p.at)).toBe(true);
    }
  });
});
