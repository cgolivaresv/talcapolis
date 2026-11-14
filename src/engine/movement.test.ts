import { describe, expect, it } from 'vitest';
import { nodeActionOf } from './actions';
import { buildBoard } from './board';
import { cardSquaresOf } from './cards';
import { buy, moveTo, newGame, roll, skipBuy } from './game';
import { placeLandmarks } from './landmarks';
import { buildLots } from './lots';
import { START_NODE, cameFromAfter, destinations, isNodeId, rollDice } from './movement';
import { canEnter, legalMoves } from './traffic';

const board = buildBoard();
const landmarks = placeLandmarks(board);
const lots = buildLots(board, landmarks);
const cardSquares = cardSquaresOf(board, landmarks);
const ctx = { board, landmarks, lots, cardSquares };
const segmentById = new Map(board.segments.map((s) => [s.id, s]));

describe('movimiento por las calles', () => {
  it('cada recorrido avanza exactamente N casillas alternando intersección y tramo, respetando el sentido', () => {
    for (const steps of [1, 2, 5, 9, 12]) {
      const ds = destinations(board, START_NODE, steps);
      expect(ds.length).toBeGreaterThan(0);
      for (const d of ds) {
        expect(d.path).toHaveLength(steps + 1);
        expect(d.path[d.path.length - 1]).toBe(d.square);
        // Saliendo de una intersección: tramo, intersección, tramo...
        d.path.forEach((sq, k) => expect(isNodeId(sq)).toBe(k % 2 === 0));
        for (let k = 0; k < steps; k += 2) {
          const seg = segmentById.get(d.path[k + 1])!;
          expect(canEnter(seg, d.path[k])).toBe(true);
          if (k + 2 <= steps) expect([seg.from, seg.to]).toContain(d.path[k + 2]);
        }
      }
    }
  });

  it('un número impar de pasos termina en un tramo y uno par en una intersección', () => {
    for (const d of destinations(board, START_NODE, 5)) expect(isNodeId(d.square)).toBe(false);
    for (const d of destinations(board, START_NODE, 6)) expect(isNodeId(d.square)).toBe(true);
  });

  it('desde un tramo se sigue hasta el otro extremo sin dar media vuelta', () => {
    const [first] = legalMoves(board, START_NODE);
    const seg = first.segment;
    const [only] = destinations(board, seg.id, 1, START_NODE);
    expect(only.square).toBe(first.to);
    for (const d of destinations(board, seg.id, 3, START_NODE)) expect(d.path[2]).not.toBe(seg.id);
  });

  it('no se da media vuelta en una intersección si hay otra salida', () => {
    const [first] = legalMoves(board, START_NODE);
    for (const d of destinations(board, first.to, 2, START_NODE)) expect(d.path[1]).not.toBe(first.segment.id);
  });

  it('cameFromAfter entrega la intersección anterior según dónde se termine', () => {
    const ds = destinations(board, START_NODE, 4);
    for (const d of ds) expect(cameFromAfter(d, null)).toBe(d.path[1] && d.path[d.path.length - 3]);
    for (const d of destinations(board, START_NODE, 3)) expect(cameFromAfter(d, null)).toBe(d.path[2]);
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

describe('casillas de acción', () => {
  it('toda intersección tiene una acción y las esquinas del tablero son especiales', () => {
    for (const n of board.intersections) expect(nodeActionOf(n.id, cardSquares)).toBeTruthy();
    expect(nodeActionOf('11-oriente/2-sur', cardSquares)).toBe('start');
    expect(nodeActionOf('2-poniente/2-sur', cardSquares)).toBe('free');
    expect(nodeActionOf('2-poniente/4-norte', cardSquares)).toBe('jail');
    expect(nodeActionOf('11-oriente/4-norte', cardSquares)).toBe('go-to-jail');
    const [card] = [...cardSquares];
    expect(nodeActionOf(card, cardSquares)).toBe('card');
    const random = board.intersections.find((n) => nodeActionOf(n.id, cardSquares) === 'random');
    expect(random).toBeTruthy();
  });
});

describe('turnos', () => {
  it('tirar, elegir destino y pasar el turno', () => {
    let g = newGame(['A', 'B'], 11);
    g = roll(g, board);
    expect(g.options.length).toBeGreaterThan(0);
    const dest = g.options[0].square;
    const double = g.dice![0] === g.dice![1];
    g = moveTo(g, dest, ctx);
    if (g.buyOptions.length > 0) g = skipBuy(g);
    expect(g.players[0].at === dest || g.players[0].at !== START_NODE).toBe(true);
    expect(g.current).toBe(double ? 0 : 1);
    expect(g.options).toHaveLength(0);
  });

  it('solo se ofrece comprar al caer en un tramo, nunca en una intersección', () => {
    let g = newGame(['A', 'B', 'C'], 21);
    let offered = 0;
    for (let k = 0; k < 400; k++) {
      g = roll(g, board);
      if (g.options.length > 0) {
        const pick = g.options[k % g.options.length];
        g = moveTo(g, pick.square, ctx);
        if (g.buyOptions.length > 0) {
          offered++;
          expect(isNodeId(g.players[g.current].at)).toBe(false);
          expect(g.buyOptions.length).toBeLessThanOrEqual(2);
          g = k % 2 ? buy(g, g.buyOptions[0], lots) : skipBuy(g);
        }
      }
    }
    expect(offered).toBeGreaterThan(0);
  });

  it('una partida larga no rompe ninguna regla', () => {
    let g = newGame(['A', 'B', 'C'], 5);
    const squares = new Set([...board.intersections.map((n) => n.id), ...board.segments.map((s) => s.id)]);
    for (let k = 0; k < 600; k++) {
      g = roll(g, board);
      if (g.options.length > 0) {
        const pick = g.options[k % g.options.length];
        g = moveTo(g, pick.square, ctx);
        if (g.buyOptions.length > 0) g = k % 2 ? buy(g, g.buyOptions[0], lots) : skipBuy(g);
      }
      for (const p of g.players) expect(p.money).toBeGreaterThanOrEqual(0);
      for (const [id, o] of Object.entries(g.owners)) expect(g.players[o].ownedLotIds).toContain(id);
      for (const p of g.players) expect(squares.has(p.at)).toBe(true);
    }
  });
});
