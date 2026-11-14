import { describe, expect, it } from 'vitest';
import { buildCheck, mortgageCheck, propertyPrice, raisable } from './assets';
import { buildBoard } from './board';
import { cardSquaresOf } from './cards';
import { lotsOnSegment, rentOf, rentsDue } from './economy';
import {
  MIN_RAISE,
  build,
  buy,
  declareBankruptcy,
  mortgage,
  moveTo,
  newGame,
  passAuction,
  payDebts,
  placeBid,
  proposeTrade,
  sellImprovement,
  skipBuy,
  unmortgage,
  type Game,
} from './game';
import { placeLandmarks } from './landmarks';
import { buildLots, lotsOfManzana } from './lots';
import { improvementCost, mortgageValue, unmortgageCost } from './properties';
import { SERVICES, serviceAt, serviceRent } from './services';

const board = buildBoard();
const landmarks = placeLandmarks(board);
const lots = buildLots(board, landmarks);
const cardSquares = cardSquaresOf(board, landmarks);
const ctx = { board, landmarks, lots, cardSquares };
const hold = (g: Game) => ({ owners: g.owners, mortgaged: g.mortgaged, levels: g.levels });

/** Partida de 3 con el jugador `owner` dueño de lo indicado. */
function withOwned(ids: string[], owner = 0): Game {
  const g = newGame(['A', 'B', 'C'], 7);
  const owners = Object.fromEntries(ids.map((id) => [id, owner]));
  return { ...g, owners, players: g.players.map((p, k) => (k === owner ? { ...p, ownedLotIds: ids } : p)) };
}

describe('servicios', () => {
  it('están en tramos que existen y cobran según los dados', () => {
    for (const s of SERVICES) expect(board.segments.some((x) => x.id === s.segmentId)).toBe(true);
    expect(serviceAt(SERVICES[0].segmentId)).toBe(SERVICES[0]);
    expect(serviceRent(7, 1)).toBe(140);
    expect(serviceRent(7, 2)).toBe(350);
  });

  it('quien cae en el tramo de un servicio ajeno paga según los dados', () => {
    const svc = SERVICES[0];
    let g = withOwned([svc.id]);
    const due = rentsDue(board, lots, hold(g), svc.segmentId, 1, 9);
    expect(due).toHaveLength(1);
    expect(due[0].amount).toBeGreaterThanOrEqual(serviceRent(9, 1));
    g = { ...g, current: 1, options: [{ square: svc.segmentId, path: ['x', 'y', svc.segmentId], passedStart: false }], dice: [4, 5] };
    const after = moveTo(g, svc.segmentId, ctx);
    expect(after.players[1].money).toBeLessThan(1500);
    expect(propertyPrice(svc.id, lots)).toBe(svc.price);
  });

  it('comprar un servicio descuenta su precio', () => {
    const svc = SERVICES[1];
    let g = newGame(['A', 'B'], 3);
    g = { ...g, buyOptions: [svc.id] };
    g = buy(g, svc.id, lots);
    expect(g.owners[svc.id]).toBe(0);
    expect(g.players[0].money).toBe(1500 - svc.price);
  });
});

describe('hipotecas', () => {
  const lot = lots.find((l) => l.kind === 'casa')!;

  it('hipotecar da el 30% del precio y la propiedad deja de cobrar arriendo', () => {
    let g = withOwned([lot.id]);
    g = mortgage(g, lot.id, lots);
    expect(g.mortgaged[lot.id]).toBe(true);
    expect(g.players[0].money).toBe(1500 + mortgageValue(lot.price));
    const seg = board.segments.find((s) => lotsOnSegment(board, lots, s.id).some((l) => l.id === lot.id))!;
    expect(rentsDue(board, lots, hold(g), seg.id, 1)).toHaveLength(0);
  });

  it('levantar la hipoteca cuesta el valor más 10%', () => {
    let g = mortgage(withOwned([lot.id]), lot.id, lots);
    const money = g.players[0].money;
    g = unmortgage(g, lot.id, lots);
    expect(g.mortgaged[lot.id]).toBeUndefined();
    expect(g.players[0].money).toBe(money - unmortgageCost(lot.price));
  });

  it('no se puede hipotecar lo ajeno ni dos veces', () => {
    const g = withOwned([lot.id]);
    expect(mortgageCheck(g, 1, lot.id, lots)).not.toBeNull();
    const h = mortgage(g, lot.id, lots);
    expect(mortgage(h, lot.id, lots)).toBe(h);
  });
});

describe('mejoras', () => {
  const manzana = lotsOfManzana(lots, lots.find((l) => l.kind === 'casa')!.manzanaId);
  const target = manzana.find((l) => l.kind !== 'emblematico')!;
  const all = manzana.map((l) => l.id);

  it('necesitas los 4 sitios de la manzana', () => {
    const g = withOwned(all.slice(0, 3));
    expect(buildCheck(g, 0, 1500, target, lots)).not.toBeNull();
  });

  it('con la manzana completa se construye, sube el arriendo y se construye parejo', () => {
    let g = withOwned(all);
    const base = rentOf(target, 0, hold(g), lots);
    g = build(g, target.id, lots);
    expect(g.levels[target.id]).toBe(1);
    expect(g.players[0].money).toBe(1500 - improvementCost(target.price));
    expect(rentOf(target, 0, hold(g), lots)).toBeGreaterThan(base);
    // otro sitio de la manzana debe subir antes de que este llegue al nivel 2
    const others = manzana.filter((l) => l.kind !== 'emblematico' && l.id !== target.id);
    if (others.length > 0) expect(build(g, target.id, lots)).toBe(g);
  });

  it('vender una mejora devuelve la mitad, y con mejoras no se hipoteca', () => {
    let g = build(withOwned(all), target.id, lots);
    expect(mortgageCheck(g, 0, target.id, lots)).not.toBeNull();
    const money = g.players[0].money;
    g = sellImprovement(g, target.id, lots);
    expect(g.levels[target.id]).toBe(0);
    expect(g.players[0].money).toBeGreaterThan(money);
  });

  it('las propiedades con mejoras no se intercambian', () => {
    const g0 = build(withOwned(all), target.id, lots);
    const trade = { from: 0, to: 1, giveLots: [target.id], giveMoney: 0, takeLots: [], takeMoney: 10 };
    expect(proposeTrade(g0, trade).trade).toBeNull();
  });
});

describe('subastas', () => {
  /** Partida donde el jugador 0 declina comprar. */
  function declined(): Game {
    const g = newGame(['A', 'B', 'C'], 7);
    return skipBuy({ ...g, buyOptions: [lots[5].id] });
  }

  it('lo que se rechaza se subasta entre los demás, no entre quien lo rechazó', () => {
    const g = declined();
    expect(g.auction).not.toBeNull();
    expect(g.auction!.bidder).toBe(1);
    expect(g.auction!.passed[0]).toBe(true);
  });

  it('gana quien más ofrece y paga su oferta', () => {
    let g = declined();
    const lot = lots[5];
    g = placeBid(g, 40, lots); // B
    expect(g.auction!.highBidder).toBe(1);
    g = placeBid(g, 40 + MIN_RAISE, lots); // C
    g = passAuction(g, lots); // B se retira: gana C
    expect(g.auction).toBeNull();
    expect(g.owners[lot.id]).toBe(2);
    expect(g.players[2].money).toBe(1500 - 50);
  });

  it('si nadie oferta, la propiedad queda libre y el turno sigue', () => {
    let g = declined();
    g = passAuction(g, lots);
    g = passAuction(g, lots);
    expect(g.auction).toBeNull();
    expect(g.owners[lots[5].id]).toBeUndefined();
    expect(g.current).toBe(1);
  });

  it('no se puede ofertar menos de la oferta más alta más el alza mínima', () => {
    const g = placeBid(declined(), 50, lots);
    expect(placeBid(g, 55, lots)).toBe(g);
  });
});

describe('deudas', () => {
  const lot = lots.find((l) => l.kind === 'casa')!;
  const seg = board.segments.find((s) => lotsOnSegment(board, lots, s.id).some((l) => l.id === lot.id))!;

  /** El jugador 1 cae en el tramo del lote del jugador 0 con poca plata. */
  function landingWithLittleMoney(money: number, ownedByPayer: string[]): Game {
    const g = withOwned([lot.id]);
    const owners = { ...g.owners, ...Object.fromEntries(ownedByPayer.map((id) => [id, 1])) };
    const players = g.players.map((p, k) => (k === 1 ? { ...p, money, ownedLotIds: ownedByPayer } : p));
    return { ...g, owners, players, current: 1, dice: [3, 4], options: [{ square: seg.id, path: ['x', 'y', seg.id], passedStart: false }] };
  }
  const richIds = () => lots.filter((l) => l.price >= 100 && l.id !== lot.id).slice(0, 12).map((l) => l.id);

  it('si no alcanza pero puede hipotecar, queda en deuda en vez de quebrar', () => {
    const rich = richIds();
    let g = moveTo(landingWithLittleMoney(0, rich), seg.id, ctx);
    expect(g.debts).toHaveLength(1);
    expect(g.bankrupt[1]).toBe(false);
    expect(payDebts(g)).toBe(g); // todavía no le alcanza
    for (const id of rich) g = mortgage(g, id, lots);
    expect(g.players[1].money).toBeGreaterThanOrEqual(g.debts[0].amount);
    const money0 = g.players[0].money;
    const owed = g.debts[0].amount;
    g = payDebts(g);
    expect(g.debts).toHaveLength(0);
    expect(g.players[0].money).toBe(money0 + owed);
  });

  it('si ni hipotecando todo alcanza, quiebra y el acreedor se queda con sus propiedades', () => {
    const own = lots.find((l) => l.price === 20)!;
    const g = moveTo(landingWithLittleMoney(0, [own.id]), seg.id, ctx);
    expect(g.bankrupt[1]).toBe(true);
    expect(g.owners[own.id]).toBe(0);
  });

  it('se puede declarar la quiebra estando en deuda', () => {
    let g = moveTo(landingWithLittleMoney(0, richIds()), seg.id, ctx);
    g = declareBankruptcy(g);
    expect(g.bankrupt[1]).toBe(true);
    expect(g.debts).toHaveLength(0);
    expect(raisable(g, 1, lots)).toBe(0);
  });
});
