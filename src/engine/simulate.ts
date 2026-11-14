import { buildBoard } from './board';
import { cardSquaresOf } from './cards';
import { lotsOnSegment, rentOf } from './economy';
import { buy, moveTo, newGame, roll, skipBuy, type Game } from './game';
import { placeLandmarks } from './landmarks';
import { buildLots, type Lot } from './lots';
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
        worstRent = Math.max(worstRent, rentOf(lot, owner, g.owners, lots));
      }
    }
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

  while (g.winner === null && rolls < maxRolls) {
    const before = g.bankrupt.map((b) => b);
    g = roll(g, board);
    rolls++;
    if (g.options.length > 0) g = moveTo(g, chooseSquare(), ctx);
    if (g.buyOptions.length > 0) {
      const me = g.players[g.current];
      const choices = g.buyOptions
        .map((id) => lots.find((l) => l.id === id) as Lot)
        .filter((l) => me.money - l.price >= reserve)
        .sort((a, b) => b.price - a.price);
      g = choices.length > 0 ? buy(g, choices[0].id, lots) : skipBuy(g);
    }
    peakLotsSold = Math.max(peakLotsSold, Object.keys(g.owners).length);
    g.bankrupt.forEach((b, k) => {
      if (b && !before[k]) bankruptRolls[k] = rolls;
    });
  }

  const flows = { rent: 0, start: 0, bought: 0, fines: 0, bankIn: 0, bankOut: 0 };
  for (const line of g.log) {
    let m: RegExpExecArray | null;
    if ((m = /paga \$(\d+) de arriendo/.exec(line))) flows.rent += Number(m[1]);
    else if ((m = /pasa por la SALIDA y cobra \$(\d+)/.exec(line))) flows.start += Number(m[1]);
    else if ((m = /compra .* por \$(\d+)\./.exec(line))) flows.bought += Number(m[1]);
    else if ((m = /paga \$(\d+) de fianza/.exec(line))) flows.fines += Number(m[1]);
    else if ((m = /Cobras \$(\d+)\./.exec(line))) flows.bankIn += Number(m[1]);
    else if ((m = /Pagas \$(\d+)/.exec(line))) flows.bankOut += Number(m[1]);
  }
  return {
    flows,
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
