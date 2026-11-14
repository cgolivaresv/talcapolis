import { buildBoard } from './board';
import { cardSquaresOf } from './cards';
import { buildCheck, mortgageCheck, propertyPrice, sellCheck as sellImprovementCheck, unmortgageCheck } from './assets';
import { lotsOnSegment, rentOf } from './economy';
import {
  build,
  buy,
  declareBankruptcy,
  mortgage,
  moveTo,
  newGame,
  passAuction,
  payDebts,
  placeBid,
  roll,
  sellImprovement,
  skipBuy,
  totalDebt,
  unmortgage,
  type Game,
} from './game';
import { placeLandmarks } from './landmarks';
import { buildLots } from './lots';
import { improvementCost } from './properties';
import { serviceAt } from './services';
import { isNodeId, nextRandom } from './movement';

/**
 * Simulación de partidas con jugadores automáticos, para medir el equilibrio del juego
 * (duración, ventaja de quien parte primero, cuántos lotes se venden, quiebras...).
 * No participa del juego real.
 */
const board = buildBoard();
const landmarks = placeLandmarks(board);
const lots = buildLots(board, landmarks);
const cardSquares = cardSquaresOf(board, landmarks);
const ctx = { board, landmarks, lots, cardSquares };

export type Policy = 'random' | 'smart';

export interface SimOptions {
  players: number;
  seed: number;
  policy?: Policy;
  /** Tiradas máximas de toda la partida antes de darla por empatada. */
  maxRolls?: number;
  /** Plata que el jugador automático no gasta al comprar. */
  reserve?: number;
}

export interface SimResult {
  finished: boolean;
  winner: number | null;
  /** Tiradas totales de la partida (todos los jugadores). */
  rolls: number;
  /** Tiradas por jugador hasta el final. */
  rollsPerPlayer: number;
  /** Lotes vendidos al final (los de quien quiebra vuelven a quedar libres). */
  lotsSold: number;
  /** Máximo de lotes vendidos a la vez durante la partida. */
  peakLotsSold: number;
  bankruptRolls: (number | null)[];
  /** Plata que se movió por tipo de hecho (sale del historial de la partida). */
  flows: { rent: number; start: number; bought: number; fines: number; bankIn: number; bankOut: number };
  /** Cuántas veces ocurrió cada novedad de reglas en la partida. */
  events: { auctions: number; mortgages: number; improvements: number; debts: number };
  finalMoney: number[];
}

export function simulate(opts: SimOptions): SimResult {
  const { players, seed, policy = 'smart', maxRolls = 6000, reserve = 150 } = opts;
  let g: Game = newGame(Array.from({ length: players }, (_, k) => `J${k + 1}`), seed);
  let rng = seed ^ 0x9e3779b9;
  const rand = () => {
    const [u, next] = nextRandom(rng);
    rng = next;
    return u;
  };
  const bankruptRolls: (number | null)[] = Array.from({ length: players }, () => null);
  let rolls = 0;
  let peakLotsSold = 0;

  /** Qué tan convenientes son los lotes de un tramo para quien va a caer en él. */
  const score = (square: string): number => {
    if (isNodeId(square)) return 0;
    const me = g.current;
    let s = 0;
    const here = lotsOnSegment(board, lots, square);
    let worstRent = 0;
    for (const lot of here) {
      const owner = g.owners[lot.id];
      if (owner === undefined) {
        if (g.players[me].money - lot.price >= reserve) s += 3 + lot.price / 40;
      } else if (owner !== me) {
        worstRent = Math.max(worstRent, rentOf(lot, owner, { owners: g.owners, mortgaged: g.mortgaged, levels: g.levels }, lots));
      }
    }
    const svc = serviceAt(square);
    if (svc && g.owners[svc.id] === undefined && g.players[me].money - svc.price >= reserve) s += 3 + svc.price / 40;
    return s - worstRent / 4;
  };

  const chooseSquare = (): string => {
    const opts2 = g.options;
    if (policy === 'random' || rand() < 0.25) return opts2[Math.floor(rand() * opts2.length)].square;
    let best = opts2[0].square;
    let bestScore = -Infinity;
    for (const d of opts2) {
      const sc = score(d.square) + rand() * 0.5;
      if (sc > bestScore) {
        best = d.square;
        bestScore = sc;
      }
    }
    return best;
  };

  /** El jugador automático puja hasta el precio de la propiedad (y sin gastar su reserva). */
  const botAuction = () => {
    const a = g.auction!;
    const me = g.players[a.bidder];
    const maxBid = Math.min(propertyPrice(a.queue[0], lots), me.money - Math.min(reserve, 100));
    if (a.highBid + 10 > maxBid) {
      g = passAuction(g, lots);
      return;
    }
    const step = Math.max(10, Math.round((maxBid - a.highBid) / 4 / 10) * 10);
    g = placeBid(g, Math.min(maxBid, a.highBid + step), lots);
  };

  /** Con deudas: vende mejoras e hipoteca hasta poder pagar; si no se puede, quiebra. */
  const botDebts = () => {
    const i = g.current;
    for (let guard = 0; guard < 200 && g.players[i].money < totalDebt(g); guard++) {
      const mine = Object.keys(g.owners).filter((id) => g.owners[id] === i);
      const improved = mine.find((id) => (g.levels[id] ?? 0) > 0 && sellCheck(g, i, id));
      const before = g;
      if (improved) g = sellImprovement(g, improved, lots);
      else {
        const target = mine.find((id) => mortgageCheck(g, i, id, lots) === null);
        if (target) g = mortgage(g, target, lots);
      }
      if (g === before) break;
    }
    g = g.players[i].money >= totalDebt(g) ? payDebts(g) : declareBankruptcy(g);
  };
  const sellCheck = (st: Game, i: number, id: string) => {
    const lot = lots.find((l) => l.id === id);
    return lot ? sellImprovementCheck(st, i, lot, lots) === null : false;
  };

  /** Antes de tirar: levanta hipotecas y construye mejoras si sobra plata. */
  const botManage = () => {
    const i = g.current;
    for (let guard = 0; guard < 30; guard++) {
      const me = g.players[i];
      const mine = Object.keys(g.owners).filter((id) => g.owners[id] === i);
      const toUnmortgage = mine.find((id) => unmortgageCheck(g, i, me.money, id, lots) === null && me.money > reserve + 150);
      if (toUnmortgage) {
        g = unmortgage(g, toUnmortgage, lots);
        continue;
      }
      const toBuild = lots.find((l) => buildCheck(g, i, me.money, l, lots) === null && me.money - improvementCost(l.price) >= reserve);
      if (!toBuild) return;
      g = build(g, toBuild.id, lots);
    }
  };

  let guard = 0;
  while (g.winner === null && rolls < maxRolls && guard++ < maxRolls * 40) {
    const before = g.bankrupt.map((b) => b);
    if (g.auction) {
      botAuction();
    } else if (g.debts.length > 0) {
      botDebts();
    } else {
      botManage();
      g = roll(g, board, lots);
      rolls++;
      if (g.options.length > 0) g = moveTo(g, chooseSquare(), ctx);
      if (g.buyOptions.length > 0) {
        const me = g.players[g.current];
        const choices = g.buyOptions.filter((id) => me.money - propertyPrice(id, lots) >= reserve).sort((x, y) => propertyPrice(y, lots) - propertyPrice(x, lots));
        g = choices.length > 0 ? buy(g, choices[0], lots) : skipBuy(g);
      }
    }
    peakLotsSold = Math.max(peakLotsSold, Object.keys(g.owners).length);
    g.bankrupt.forEach((bk, k) => {
      if (bk && !before[k]) bankruptRolls[k] = rolls;
    });
  }

  const flows = { rent: 0, start: 0, bought: 0, fines: 0, bankIn: 0, bankOut: 0 };
  for (const line of g.log) {
    let m: RegExpExecArray | null;
    if ((m = /paga \$(\d+) de arriendo/.exec(line))) flows.rent += Number(m[1]);
    else if ((m = /pasa por la SALIDA y cobra \$(\d+)/.exec(line))) flows.start += Number(m[1]);
    else if ((m = /(?:compra|gana la subasta de) .* por \$(\d+)\./.exec(line))) flows.bought += Number(m[1]);
    else if ((m = /paga \$(\d+) de fianza/.exec(line))) flows.fines += Number(m[1]);
    else if ((m = /Cobras \$(\d+)\./.exec(line))) flows.bankIn += Number(m[1]);
    else if ((m = /Pagas \$(\d+)/.exec(line))) flows.bankOut += Number(m[1]);
  }
  const events = {
    auctions: g.log.filter((l) => /gana la subasta/.test(l)).length,
    mortgages: g.log.filter((l) => / hipoteca /.test(l)).length,
    improvements: g.log.filter((l) => /construye la mejora/.test(l)).length,
    debts: g.log.filter((l) => /no le alcanza: puede hipotecar/.test(l)).length,
  };
  return {
    flows,
    events,
    finished: g.winner !== null,
    winner: g.winner,
    rolls,
    rollsPerPlayer: rolls / players,
    lotsSold: Object.keys(g.owners).length,
    peakLotsSold,
    bankruptRolls,
    finalMoney: g.players.map((p) => p.money),
  };
}

export interface SimSummary {
  games: number;
  finishedPct: number;
  /** Mediana de tiradas por jugador en las partidas que terminaron. */
  medianRollsPerPlayer: number;
  p90RollsPerPlayer: number;
  /** Porcentaje de victorias por asiento (entre las partidas que terminaron). */
  winPctBySeat: number[];
  /** Promedio del máximo de lotes vendidos a la vez, como % del total. */
  avgPeakLotsSoldPct: number;
}

export function summarize(results: SimResult[], players: number): SimSummary {
  const done = results.filter((r) => r.finished);
  const sorted = done.map((r) => r.rollsPerPlayer).sort((a, b) => a - b);
  const q = (p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0);
  const wins = Array.from({ length: players }, () => 0);
  for (const r of done) if (r.winner !== null) wins[r.winner]++;
  return {
    games: results.length,
    finishedPct: Math.round((100 * done.length) / results.length),
    medianRollsPerPlayer: Math.round(q(0.5)),
    p90RollsPerPlayer: Math.round(q(0.9)),
    winPctBySeat: wins.map((w) => Math.round((100 * w) / Math.max(1, done.length))),
    avgPeakLotsSoldPct: Math.round((100 * results.reduce((s, r) => s + r.peakLotsSold, 0)) / results.length / lots.length),
  };
}
