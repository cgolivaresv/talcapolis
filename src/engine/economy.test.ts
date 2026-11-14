import { describe, expect, it } from 'vitest';
import { buildBoard } from './board';
import { lotsAround, rentOf, rentsDue } from './economy';
import { buy, moveTo, newGame, roll, type Game } from './game';
import { placeLandmarks } from './landmarks';
import { buildLots } from './lots';

const board = buildBoard();
const landmarks = placeLandmarks(board);
const lots = buildLots(board, landmarks);
const ctx = { board, landmarks, lots, cardSquares: new Set<string>() };

describe('economía', () => {
  it('una intersección interior da a 8 lotes y una esquina a 2', () => {
    const inner = board.intersections.find((n) => n.x > 0 && n.y > 0 && n.x < board.verticalStreets.length - 1 && n.y < board.horizontalStreets.length - 1)!;
    expect(lotsAround(board, lots, inner.id)).toHaveLength(8);
    expect(lotsAround(board, lots, '2-poniente/2-sur')).toHaveLength(2);
  });

  it('el arriendo sube al reunir la manzana y el barrio', () => {
    const lot = lots.find((l) => l.kind === 'casa')!;
    const solo = rentOf(lot, 0, { [lot.id]: 0 }, lots);
    const mz = Object.fromEntries(lots.filter((l) => l.manzanaId === lot.manzanaId).map((l) => [l.id, 0]));
    expect(rentOf(lot, 0, mz, lots)).toBeGreaterThan(solo);
    const barrio = Object.fromEntries(lots.filter((l) => l.barrio === lot.barrio).map((l) => [l.id, 0]));
    expect(rentOf(lot, 0, barrio, lots)).toBeGreaterThan(rentOf(lot, 0, mz, lots));
  });

  it('comprar descuenta el precio, y quien cae después paga arriendo al dueño', () => {
    let g: Game = newGame(['A', 'B'], 3);
    const node = '11-oriente/2-sur';
    const lot = lotsAround(board, lots, node)[0];
    g = { ...g, buyOptions: [lot.id] };
    g = buy(g, lot.id, lots);
    expect(g.owners[lot.id]).toBe(0);
    expect(g.players[0].money).toBe(1500 - lot.price);
    expect(rentsDue(board, lots, g.owners, node, 1).map((d) => d.lot.id)).toContain(lot.id);
    expect(rentsDue(board, lots, g.owners, node, 0)).toHaveLength(0);
  });

  it('quien no puede pagar quiebra y sus lotes quedan libres; el otro gana', () => {
    let g: Game = newGame(['A', 'B'], 3);
    const node = '11-oriente/2-sur';
    const lot = lotsAround(board, lots, node)[0];
    g = { ...g, owners: { [lot.id]: 0 }, players: [{ ...g.players[0], ownedLotIds: [lot.id] }, { ...g.players[1], money: 0 }], current: 1 };
    g = { ...g, options: [{ node, path: [node, node], passedStart: false }], dice: [1, 2] };
    g = moveTo(g, node, ctx);
    expect(g.bankrupt[1]).toBe(true);
    expect(g.winner).toBe(0);
    expect(roll(g, board)).toBe(g);
  });
});
