import { describe, expect, it } from 'vitest';
import { buildBoard } from './board';
import { lotsOnSegment, rentOf, rentsDue } from './economy';
import { MAX_PLAYERS, acceptTrade, buy, moveTo, newGame, proposeTrade, rejectTrade, roll, validatePlayerNames, type Game } from './game';
import { placeLandmarks } from './landmarks';
import { buildLots } from './lots';

const board = buildBoard();
const landmarks = placeLandmarks(board);
const lots = buildLots(board, landmarks);
const ctx = { board, landmarks, lots, cardSquares: new Set<string>() };
const hold = (owners: Record<string, number>) => ({ owners, mortgaged: {}, levels: {} });

describe('economía', () => {
  const inner = board.segments.find((s) => lotsOnSegment(board, lots, s.id).length === 2)!;
  const edge = board.segments.find((s) => lotsOnSegment(board, lots, s.id).length === 1)!;

  it('un tramo interior da a 2 lotes (uno por lado) y uno de borde a 1', () => {
    expect(lotsOnSegment(board, lots, inner.id)).toHaveLength(2);
    expect(lotsOnSegment(board, lots, edge.id)).toHaveLength(1);
    for (const s of board.segments) expect(lotsOnSegment(board, lots, s.id).length).toBeLessThanOrEqual(2);
  });

  it('todos los lotes se pueden comprar desde algún tramo', () => {
    const reachable = new Set(board.segments.flatMap((s) => lotsOnSegment(board, lots, s.id).map((l) => l.id)));
    expect(reachable.size).toBe(lots.length);
  });

  it('el arriendo sube al reunir la manzana y el barrio', () => {
    const lot = lots.find((l) => l.kind === 'casa')!;
    const solo = rentOf(lot, 0, { [lot.id]: 0 }, lots);
    const mz = Object.fromEntries(lots.filter((l) => l.manzanaId === lot.manzanaId).map((l) => [l.id, 0]));
    expect(rentOf(lot, 0, mz, lots)).toBeGreaterThan(solo);
    const barrio = Object.fromEntries(lots.filter((l) => l.barrio === lot.barrio).map((l) => [l.id, 0]));
    expect(rentOf(lot, 0, barrio, lots)).toBeGreaterThan(rentOf(lot, 0, mz, lots));
  });

  it('comprar descuenta el precio, y quien cae después en el tramo paga arriendo al dueño', () => {
    let g: Game = newGame(['A', 'B'], 3);
    const lot = lotsOnSegment(board, lots, inner.id)[0];
    g = { ...g, buyOptions: [lot.id] };
    g = buy(g, lot.id, lots);
    expect(g.owners[lot.id]).toBe(0);
    expect(g.players[0].money).toBe(1500 - lot.price);
    expect(rentsDue(board, lots, hold(g.owners), inner.id, 1).map((d) => d.id)).toContain(lot.id);
    expect(rentsDue(board, lots, hold(g.owners), inner.id, 0)).toHaveLength(0);
  });

  it('quien no puede pagar quiebra y sus lotes quedan libres; el otro gana', () => {
    let g: Game = newGame(['A', 'B'], 3);
    const lot = lotsOnSegment(board, lots, inner.id)[0];
    g = { ...g, owners: { [lot.id]: 0 }, players: [{ ...g.players[0], ownedLotIds: [lot.id] }, { ...g.players[1], money: 0 }], current: 1 };
    g = { ...g, options: [{ square: inner.id, path: [inner.from, inner.id], passedStart: false }], dice: [1, 2] };
    g = moveTo(g, inner.id, ctx);
    expect(g.bankrupt[1]).toBe(true);
    expect(g.winner).toBe(0);
    expect(roll(g, board)).toBe(g);
  });

  it('solo se cobra el arriendo del sitio más caro del tramo', () => {
    const around = lotsOnSegment(board, lots, inner.id);
    const owners = Object.fromEntries(around.map((l) => [l.id, 0]));
    const due = rentsDue(board, lots, hold(owners), inner.id, 1);
    expect(due).toHaveLength(1);
    expect(due[0].amount).toBe(Math.max(...around.map((l) => rentOf(l, 0, owners, lots))));
  });

  it('en las intersecciones no se compra ni se paga arriendo', () => {
    const node = inner.from;
    const mine = lotsOnSegment(board, lots, inner.id)[0];
    let g: Game = newGame(['A', 'B'], 3);
    g = { ...g, owners: { [mine.id]: 0 }, players: [{ ...g.players[0], ownedLotIds: [mine.id] }, g.players[1]], current: 1 };
    g = { ...g, options: [{ square: node, path: [inner.id, node], passedStart: false }], dice: [1, 2] };
    const after = moveTo(g, node, ctx);
    expect(after.buyOptions).toHaveLength(0);
    expect(after.players[1].money).toBe(1500);
    expect(after.players[0].money).toBe(1500);
  });
});

describe('intercambios', () => {
  const [l1, l2] = lots.filter((l) => l.kind === 'casa');
  const base = (): Game => {
    const g = newGame(['A', 'B'], 1);
    return {
      ...g,
      owners: { [l1.id]: 0, [l2.id]: 1 },
      players: [{ ...g.players[0], ownedLotIds: [l1.id] }, { ...g.players[1], ownedLotIds: [l2.id] }],
    };
  };
  const offer = { from: 0, to: 1, giveLots: [l1.id], giveMoney: 100, takeLots: [l2.id], takeMoney: 0 };

  it('si el otro acepta, cambian lotes y plata', () => {
    let g = proposeTrade(base(), offer);
    expect(g.trade).not.toBeNull();
    g = acceptTrade(g);
    expect(g.owners[l1.id]).toBe(1);
    expect(g.owners[l2.id]).toBe(0);
    expect(g.players[0].money).toBe(1400);
    expect(g.players[1].money).toBe(1600);
    expect(g.players[0].ownedLotIds).toEqual([l2.id]);
    expect(g.players[1].ownedLotIds).toEqual([l1.id]);
    expect(g.trade).toBeNull();
  });

  it('rechazar no cambia nada', () => {
    const g = rejectTrade(proposeTrade(base(), offer));
    expect(g.trade).toBeNull();
    expect(g.owners[l1.id]).toBe(0);
  });

  it('no se aceptan ofertas inválidas: lotes ajenos, más plata de la que se tiene o vacías', () => {
    expect(proposeTrade(base(), { ...offer, giveLots: [l2.id] }).trade).toBeNull();
    expect(proposeTrade(base(), { ...offer, giveMoney: 5000 }).trade).toBeNull();
    expect(proposeTrade(base(), { ...offer, giveLots: [], giveMoney: 0, takeLots: [] }).trade).toBeNull();
    expect(proposeTrade(base(), { ...offer, from: 1, to: 0 }).trade).toBeNull(); // no es su turno
  });
});

describe('jugadores', () => {
  it('se permiten de 2 a 6 jugadores con nombres distintos', () => {
    expect(MAX_PLAYERS).toBe(6);
    expect(validatePlayerNames(['A', 'B'])).toBeNull();
    expect(validatePlayerNames(['A', 'B', 'C', 'D', 'E', 'F'])).toBeNull();
    expect(validatePlayerNames(['A'])).not.toBeNull();
    expect(validatePlayerNames(['A', 'B', 'C', 'D', 'E', 'F', 'G'])).not.toBeNull();
    expect(validatePlayerNames(['A', ' a '])).not.toBeNull();
    expect(validatePlayerNames(['A', ' '])).not.toBeNull();
    expect(() => newGame(['A'], 1)).toThrow();
  });

  it('una partida de 6 funciona y todos parten en la salida', () => {
    const g = newGame(['A', 'B', 'C', 'D', 'E', 'F'], 9);
    expect(g.players).toHaveLength(6);
    expect(new Set(g.players.map((p) => p.at)).size).toBe(1);
  });
});
