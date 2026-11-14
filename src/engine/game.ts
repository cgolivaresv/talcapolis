import type { Board } from './board';
import { JAIL_NODE, applyCard, createDeck, drawCard, type CardContext, type Deck, type PlayerState } from './cards';
import { RANDOM_ACTIONS, nodeActionOf } from './actions';
import { buildCheck, mortgageCheck, propertyName, propertyPrice, raisable, sellCheck, unmortgageCheck } from './assets';
import { lotsOnSegment, rentsDue, type Holdings, type Owners } from './economy';
import type { Lot } from './lots';
import { improvementCost, improvementSaleValue, mortgageValue, unmortgageCost } from './properties';
import { serviceAt } from './services';
import { START_BONUS, START_NODE, cameFromAfter, destinations, isNodeId, nextRandom, rollDice, type Destination } from './movement';

/** Fianza para salir de la Cárcel tras 3 turnos sin sacar dobles. */
export const JAIL_FINE = 50;
export const STARTING_MONEY = 1500;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/** Lo que un jugador debe pagar y todavía no pudo (arriendo o banco). */
export interface Debt {
  /** Jugador a quien se debe; null si es el banco. */
  creditor: number | null;
  amount: number;
  reason: string;
}

/** Subasta de una propiedad que su comprador rechazó. */
export interface Auction {
  /** Propiedades que faltan subastar (la primera es la que se subasta ahora). */
  queue: string[];
  highBid: number;
  highBidder: number | null;
  /** A quién le toca ofertar. */
  bidder: number;
  /** Quiénes ya se retiraron de esta subasta (o no pueden participar). */
  passed: boolean[];
}

/** Oferta mínima de una subasta y alza mínima sobre la oferta más alta. */
export const MIN_RAISE = 10;

/** Propuesta de intercambio: el jugador en turno (`from`) ofrece `give` y pide `take` a `to`. */
export interface Trade {
  from: number;
  to: number;
  giveLots: string[];
  giveMoney: number;
  takeLots: string[];
  takeMoney: number;
}

export interface Game {
  players: PlayerState[];
  /** Jugador en turno (índice). */
  current: number;
  deck: Deck;
  seed: number;
  dice: [number, number] | null;
  /** Destinos posibles tras tirar los dados; vacío si hay que tirar. */
  options: Destination[];
  /** Intersección de la que venía cada jugador (para no dar media vuelta). */
  cameFrom: (string | null)[];
  jailTurns: number[];
  /** Turnos que cada jugador perderá (por una acción de la ciudad). */
  skipTurns: number[];
  /** Dueño de cada propiedad comprada (lotes y servicios). */
  owners: Owners;
  /** Propiedades hipotecadas. */
  mortgaged: Record<string, boolean>;
  /** Mejoras de cada casa o local. */
  levels: Record<string, number>;
  /** Deudas pendientes del jugador en turno: no puede seguir hasta pagarlas (o quebrar). */
  debts: Debt[];
  /** Subasta en curso, si la hay. */
  auction: Auction | null;
  /** Lotes que el jugador en turno puede comprar donde cayó; vacío si no hay decisión pendiente. */
  buyOptions: string[];
  /** Si al terminar de decidir la compra el jugador vuelve a tirar (dobles). */
  rollAgain: boolean;
  bankrupt: boolean[];
  /** Intercambio propuesto por el jugador en turno, a la espera de respuesta. */
  trade: Trade | null;
  /** Índice del ganador cuando solo queda un jugador sin quebrar. */
  winner: number | null;
  log: string[];
}

/** Error de configuración si la cantidad de jugadores o sus nombres no sirven; `null` si están bien. */
export function validatePlayerNames(names: string[]): string | null {
  if (names.length < MIN_PLAYERS || names.length > MAX_PLAYERS) return `Debe haber entre ${MIN_PLAYERS} y ${MAX_PLAYERS} jugadores.`;
  if (names.some((n) => n.trim() === '')) return 'Todos los jugadores necesitan un nombre.';
  if (new Set(names.map((n) => n.trim().toLowerCase())).size !== names.length) return 'Los nombres no pueden repetirse.';
  return null;
}

export function newGame(names: string[], seed: number): Game {
  const problem = validatePlayerNames(names);
  if (problem) throw new Error(problem);
  return {
    players: names.map((id) => ({ id, money: STARTING_MONEY, at: START_NODE, inJail: false, freeJailCards: 0, ownedLotIds: [] })),
    current: 0,
    deck: createDeck(seed),
    seed,
    dice: null,
    options: [],
    cameFrom: names.map(() => null),
    jailTurns: names.map(() => 0),
    skipTurns: names.map(() => 0),
    owners: {},
    mortgaged: {},
    levels: {},
    debts: [],
    auction: null,
    buyOptions: [],
    rollAgain: false,
    bankrupt: names.map(() => false),
    trade: null,
    winner: null,
    log: ['Comienza la partida. Todos parten en la SALIDA (Estación).'],
  };
}

const replace = <T>(list: T[], i: number, v: T) => list.map((x, k) => (k === i ? v : x));

const holdingsOf = (g: Game): Holdings => ({ owners: g.owners, mortgaged: g.mortgaged, levels: g.levels });
const withoutKeys = <T>(rec: Record<string, T>, drop: (key: string) => boolean): Record<string, T> =>
  Object.fromEntries(Object.entries(rec).filter(([k]) => !drop(k)));

/** Deuda total del jugador en turno. */
export const totalDebt = (g: Game) => g.debts.reduce((s, d) => s + d.amount, 0);

/** Pasa el turno al siguiente jugador que no haya quebrado. */
function endTurn(g: Game): Game {
  const n = g.players.length;
  let next = g.current;
  let skipTurns = g.skipTurns;
  let log = g.log;
  // Quien debe perder el turno lo pierde y pasa al siguiente.
  for (let guard = 0; guard < n * 8; guard++) {
    do next = (next + 1) % n;
    while (g.bankrupt[next] && next !== g.current);
    if (skipTurns[next] > 0) {
      skipTurns = replace(skipTurns, next, skipTurns[next] - 1);
      log = [...log, `${g.players[next].id} pierde este turno.`];
      continue;
    }
    break;
  }
  return { ...g, current: next, skipTurns, log, dice: null, options: [], buyOptions: [], rollAgain: false };
}

/** Termina el turno actual, o repite si salieron dobles. */
function finishTurn(g: Game): Game {
  if (g.rollAgain && !g.bankrupt[g.current] && !g.players[g.current].inJail) {
    return { ...g, dice: null, options: [], buyOptions: [], rollAgain: false, log: [...g.log, `${g.players[g.current].id} tira de nuevo.`] };
  }
  return endTurn(g);
}

/**
 * Quiebra: el jugador sale de la partida. Si debía a otro jugador, este se queda con sus propiedades
 * (sin mejoras y con las hipotecas que tengan) y con su plata; si no, las propiedades vuelven a quedar libres.
 */
function declareBankrupt(g: Game, i: number, creditor: number | null = null): Game {
  const mine = Object.entries(g.owners).filter(([, o]) => o === i).map(([id]) => id);
  const mineSet = new Set(mine);
  let owners = g.owners;
  let mortgaged = g.mortgaged;
  let players = g.players;
  if (creditor !== null && !g.bankrupt[creditor]) {
    owners = { ...g.owners, ...Object.fromEntries(mine.map((id) => [id, creditor])) };
    players = players.map((p, k) =>
      k === creditor ? { ...p, money: p.money + g.players[i].money, ownedLotIds: [...p.ownedLotIds, ...mine] } : p,
    );
  } else {
    owners = withoutKeys(g.owners, (id) => mineSet.has(id));
    mortgaged = withoutKeys(g.mortgaged, (id) => mineSet.has(id));
  }
  players = replace(players, i, { ...players[i], money: 0, ownedLotIds: [] });
  const bankrupt = replace(g.bankrupt, i, true);
  const alive = bankrupt.map((b, k) => (b ? -1 : k)).filter((k) => k >= 0);
  const heir = creditor !== null && !g.bankrupt[creditor] ? ` Sus propiedades pasan a ${g.players[creditor].id}.` : '';
  const log = [...g.log, `${g.players[i].id} quiebra y sale de la partida.${heir}`];
  if (alive.length === 1) log.push(`¡${g.players[alive[0]].id} gana Talcapolis!`);
  return {
    ...g,
    owners,
    mortgaged,
    levels: withoutKeys(g.levels, (id) => mineSet.has(id)),
    bankrupt,
    players,
    debts: [],
    auction: null,
    winner: alive.length === 1 ? alive[0] : null,
    log,
  };
}

/** Paga las deudas con la plata del jugador (se asume que le alcanza). */
function settle(g: Game, i: number, debts: Debt[]): Game {
  let players = g.players;
  const log = [...g.log];
  for (const d of debts) {
    players = players.map((p, k) => {
      if (k === i) return { ...p, money: p.money - d.amount };
      if (k === d.creditor) return { ...p, money: p.money + d.amount };
      return p;
    });
    log.push(`${g.players[i].id} paga $${d.amount} ${d.creditor === null ? 'al banco' : `a ${g.players[d.creditor].id}`} (${d.reason}).`);
  }
  return { ...g, players, log, debts: [] };
}

/**
 * Cobra deudas al jugador `i`: si le alcanza la plata las paga; si no, pero podría juntarla hipotecando y
 * vendiendo mejoras, queda en deuda (no puede seguir hasta pagar o quebrar); si ni así alcanza, quiebra.
 */
function owe(g: Game, i: number, debts: Debt[], lots: Lot[]): { game: Game; status: 'paid' | 'debt' | 'bankrupt' } {
  const total = debts.reduce((s, d) => s + d.amount, 0);
  if (total === 0) return { game: g, status: 'paid' };
  if (g.players[i].money >= total) return { game: settle(g, i, debts), status: 'paid' };
  if (g.players[i].money + raisable(g, i, lots) >= total) {
    return {
      game: { ...g, debts, log: [...g.log, `${g.players[i].id} debe $${total} y no le alcanza: puede hipotecar o vender mejoras.`] },
      status: 'debt',
    };
  }
  const creditor = debts.find((d) => d.creditor !== null)?.creditor ?? null;
  return { game: declareBankrupt(g, i, creditor), status: 'bankrupt' };
}

/** Tira los dados del jugador en turno y calcula a dónde puede llegar. */
export function roll(game: Game, board: Board, lots: Lot[] = []): Game {
  if (game.winner !== null || game.trade || game.auction || game.debts.length > 0 || game.options.length > 0 || game.dice || game.buyOptions.length > 0) return game;
  const i = game.current;
  let me = game.players[i];
  const { dice, seed } = rollDice(game.seed);
  const double = dice[0] === dice[1];
  const log = [...game.log, `${me.id} saca ${dice[0]} y ${dice[1]}${double ? ' (dobles)' : ''}.`];
  let g: Game = { ...game, seed, log };
  let jailTurns = game.jailTurns;

  if (me.inJail) {
    if (me.freeJailCards > 0) {
      me = { ...me, inJail: false, freeJailCards: me.freeJailCards - 1 };
      g = { ...g, log: [...g.log, `${me.id} usa su tarjeta de libertad y sale de la Cárcel.`] };
    } else if (double) {
      me = { ...me, inJail: false };
      g = { ...g, log: [...g.log, `${me.id} saca dobles y sale de la Cárcel.`] };
    } else if (jailTurns[i] + 1 >= 3) {
      // Sale de la Cárcel pagando la fianza (si no le alcanza queda en deuda y pierde el movimiento).
      me = { ...me, inJail: false };
      g = { ...g, players: replace(g.players, i, me), jailTurns: replace(jailTurns, i, 0), log: [...g.log, `${me.id} sale de la Cárcel pagando la fianza.`] };
      const fine = owe(g, i, [{ creditor: null, amount: JAIL_FINE, reason: 'fianza' }], lots);
      if (fine.status === 'bankrupt') return endTurn(fine.game);
      if (fine.status === 'debt') return { ...fine.game, dice };
      g = fine.game;
      me = g.players[i];
    } else {
      g = { ...g, players: replace(g.players, i, me), jailTurns: replace(jailTurns, i, jailTurns[i] + 1) };
      return endTurn({ ...g, log: [...g.log, `${me.id} sigue en la Cárcel.`] });
    }
    jailTurns = replace(jailTurns, i, 0);
    g = { ...g, jailTurns, players: replace(g.players, i, me) };
  }

  const options = destinations(board, me.at, dice[0] + dice[1], game.cameFrom[i]);
  if (options.length === 0) return endTurn({ ...g, dice, log: [...g.log, `${me.id} no tiene por dónde avanzar.`] });
  return { ...g, dice, options };
}

export interface GameContext extends CardContext {
  cardSquares: Set<string>;
  lots: Lot[];
}

/**
 * El jugador en turno avanza hasta `square` (uno de los destinos posibles) y se resuelve la casilla:
 *   - intersección: casilla de acción (tarjeta "?", acción aleatoria, esquinas); no se compra ni se paga arriendo;
 *   - tramo de calle: se paga arriendo por los lotes ajenos y se pueden comprar los libres.
 */
export function moveTo(game: Game, square: string, ctx: GameContext): Game {
  const dest = game.options.find((d) => d.square === square);
  if (!dest || game.winner !== null) return game;
  const i = game.current;
  const double = !!game.dice && game.dice[0] === game.dice[1];
  let me: PlayerState = { ...game.players[i], at: square };
  let others = game.players.filter((_, k) => k !== i);
  let deck = game.deck;
  let seed = game.seed;
  let skipTurns = game.skipTurns;
  let loseTurn = false;
  let extraRoll = false;
  const log = [...game.log];
  let newCameFrom: string | null = cameFromAfter(dest, game.cameFrom[i]);

  if (dest.passedStart) {
    me = { ...me, money: me.money + START_BONUS };
    log.push(`${me.id} pasa por la SALIDA y cobra $${START_BONUS}.`);
  }

  if (isNodeId(square)) {
    switch (nodeActionOf(square, ctx.cardSquares)) {
      case 'go-to-jail':
        me = { ...me, at: JAIL_NODE, inJail: true };
        newCameFrom = null;
        log.push(`${me.id} cae en "A la Cárcel" y va preso.`);
        break;
      case 'card': {
        const drawn = drawCard(deck);
        deck = drawn.deck;
        const res = applyCard(drawn.card, me, others, ctx);
        me = res.player;
        others = res.others;
        log.push(`${me.id} saca una tarjeta: «${drawn.card.text}» ${res.summary}`);
        if (me.at !== square) newCameFrom = null;
        break;
      }
      case 'random': {
        // Acción aleatoria de la ciudad (ver RANDOM_ACTIONS en actions.ts).
        const [u, next] = nextRandom(seed);
        seed = next;
        const action = RANDOM_ACTIONS[Math.floor(u * RANDOM_ACTIONS.length)];
        const effect = action.effect;
        let summary: string;
        if (effect.type === 'loseTurn') {
          skipTurns = replace(skipTurns, i, skipTurns[i] + 1);
          loseTurn = true;
          summary = 'Pierdes el próximo turno.';
        } else if (effect.type === 'extraTurn') {
          extraRoll = true;
          summary = 'Tiras de nuevo.';
        } else {
          const res = applyCard({ id: action.id, text: action.text, action: effect }, me, others, ctx);
          me = res.player;
          others = res.others;
          summary = res.summary;
          if (me.at !== square) newCameFrom = null;
        }
        log.push(`${me.id} cae en una casilla de acción: «${action.text}» ${summary}`);
        break;
      }
      default:
        break; // SALIDA, LIBRE y CÁRCEL (de visita): sin efecto
    }
  }

  // Deudas del jugador: saldo negativo por tarjetas o acciones (con el banco) y arriendos (no se cobran estando preso).
  const debts: Debt[] = [];
  if (me.money < 0) {
    debts.push({ creditor: null, amount: -me.money, reason: 'tarjetas y acciones' });
    me = { ...me, money: 0 };
  }
  if (!isNodeId(square) && !me.inJail) {
    const diceSum = game.dice ? game.dice[0] + game.dice[1] : 7;
    for (const d of rentsDue(ctx.board, ctx.lots, holdingsOf(game), square, i, diceSum)) {
      debts.push({ creditor: d.owner, amount: d.amount, reason: `arriendo por ${d.name}` });
    }
  }

  const players = game.players.map((p, k) => {
    if (k === i) return me;
    return others.find((o) => o.id === p.id) ?? p;
  });
  const base: Game = {
    ...game,
    players,
    deck,
    seed,
    log,
    skipTurns,
    cameFrom: replace(game.cameFrom, i, newCameFrom),
    dice: null,
    options: [],
    rollAgain: (double || extraRoll) && !loseTurn && !me.inJail,
  };

  const debt = owe(base, i, debts, ctx.lots);
  if (debt.status === 'bankrupt') return endTurn(debt.game);
  if (debt.status === 'debt') return debt.game;
  const g = debt.game;
  me = g.players[i];

  // Propiedades libres del tramo donde cayó (en las intersecciones no se compra): lotes y servicio.
  const here = isNodeId(square) || me.inJail || me.at !== square ? [] : lotsOnSegment(ctx.board, ctx.lots, square).map((l) => l.id);
  const svc = isNodeId(square) ? undefined : serviceAt(square);
  if (svc && !me.inJail && me.at === square) here.push(svc.id);
  const buyOptions = here.filter((id) => g.owners[id] === undefined && propertyPrice(id, ctx.lots) <= me.money);
  if (buyOptions.length > 0) return { ...g, buyOptions };
  return finishTurn(g);
}

/** Da una propiedad libre a un jugador a cambio de plata. */
function grant(g: Game, i: number, id: string, price: number, lots: Lot[], verb: string): Game {
  const me = g.players[i];
  return {
    ...g,
    owners: { ...g.owners, [id]: i },
    players: replace(g.players, i, { ...me, money: me.money - price, ownedLotIds: [...me.ownedLotIds, id] }),
    log: [...g.log, `${me.id} ${verb} ${propertyName(id, lots)} por $${price}.`],
  };
}

/** El jugador en turno compra una de las propiedades ofrecidas. */
export function buy(game: Game, lotId: string, lots: Lot[]): Game {
  if (!game.buyOptions.includes(lotId)) return game;
  const price = propertyPrice(lotId, lots);
  if (!price || price > game.players[game.current].money) return game;
  return finishTurn(grant(game, game.current, lotId, price, lots, 'compra'));
}

/** El jugador en turno decide no comprar: lo que rechazó se subasta entre los demás. */
export function skipBuy(game: Game): Game {
  if (game.buyOptions.length === 0) return game;
  const started = startAuction({ ...game, buyOptions: [] }, game.buyOptions);
  return started ?? finishTurn({ ...game, buyOptions: [] });
}

/** Abre la subasta de la primera propiedad de la cola; null si no hay quien pueda ofertar. */
function startAuction(g: Game, queue: string[]): Game | null {
  const passed = g.players.map((p, k) => g.bankrupt[k] || k === g.current || p.money < MIN_RAISE);
  const first = nextBidder(g, passed, g.current, null, 0);
  if (first === null) return null;
  const a: Auction = { queue, highBid: 0, highBidder: null, bidder: first, passed };
  return { ...g, auction: a, log: [...g.log, `Se subasta una propiedad entre los demás jugadores.`] };
}

/** Siguiente jugador al que le toca ofertar (los que no pueden superar la oferta se retiran). */
function nextBidder(g: Game, passed: boolean[], from: number, highBidder: number | null, highBid: number): number | null {
  const n = g.players.length;
  for (let k = 1; k <= n; k++) {
    const idx = (from + k) % n;
    if (passed[idx] || idx === highBidder) continue;
    if (g.players[idx].money < highBid + MIN_RAISE) {
      passed[idx] = true;
      continue;
    }
    return idx;
  }
  return null;
}

/** Cierra la subasta actual y sigue con la siguiente propiedad, o termina el turno. */
function closeAuction(g: Game, lots: Lot[]): Game {
  const a = g.auction!;
  let next = g;
  if (a.highBidder !== null) {
    next = grant(g, a.highBidder, a.queue[0], a.highBid, lots, 'gana la subasta de');
  } else {
    next = { ...g, log: [...g.log, `Nadie ofertó por ${propertyName(a.queue[0], lots)}: queda libre.`] };
  }
  const rest = a.queue.slice(1);
  if (rest.length > 0) {
    const again = startAuction({ ...next, auction: null }, rest);
    if (again) return again;
  }
  return finishTurn({ ...next, auction: null });
}

/** El jugador al que le toca ofertar sube la oferta a `amount`. */
export function placeBid(game: Game, amount: number, lots: Lot[]): Game {
  const a = game.auction;
  if (!a || !Number.isInteger(amount) || amount < a.highBid + MIN_RAISE || amount > game.players[a.bidder].money) return game;
  const passed = [...a.passed];
  const next = nextBidder(game, passed, a.bidder, a.bidder, amount);
  const updated: Auction = { ...a, highBid: amount, highBidder: a.bidder, passed, bidder: next ?? a.bidder };
  const g: Game = { ...game, auction: updated, log: [...game.log, `${game.players[a.bidder].id} ofrece $${amount}.`] };
  return next === null ? closeAuction(g, lots) : g;
}

/** El jugador al que le toca ofertar se retira de la subasta. */
export function passAuction(game: Game, lots: Lot[]): Game {
  const a = game.auction;
  if (!a) return game;
  const passed = replace(a.passed, a.bidder, true);
  const next = nextBidder(game, passed, a.bidder, a.highBidder, a.highBid);
  const g: Game = { ...game, auction: { ...a, passed, bidder: next ?? a.bidder }, log: [...game.log, `${game.players[a.bidder].id} se retira de la subasta.`] };
  return next === null ? closeAuction(g, lots) : g;
}

// --- Hipotecas y mejoras -------------------------------------------------------

/** Se pueden gestionar propiedades antes de tirar, al comprar o al pagar una deuda, no en pleno movimiento. */
const canManage = (g: Game) => g.winner === null && !g.trade && !g.auction && g.options.length === 0;

/** Hipoteca una propiedad del jugador en turno y recibe la mitad de su precio. */
export function mortgage(game: Game, id: string, lots: Lot[]): Game {
  const i = game.current;
  if (!canManage(game) || mortgageCheck(game, i, id, lots) !== null) return game;
  const value = mortgageValue(propertyPrice(id, lots));
  const me = game.players[i];
  return {
    ...game,
    mortgaged: { ...game.mortgaged, [id]: true },
    players: replace(game.players, i, { ...me, money: me.money + value }),
    log: [...game.log, `${me.id} hipoteca ${propertyName(id, lots)} y recibe $${value}.`],
  };
}

/** Levanta la hipoteca de una propiedad (cuesta el valor de la hipoteca más 10%). */
export function unmortgage(game: Game, id: string, lots: Lot[]): Game {
  const i = game.current;
  const me = game.players[i];
  if (!canManage(game) || unmortgageCheck(game, i, me.money, id, lots) !== null) return game;
  const cost = unmortgageCost(propertyPrice(id, lots));
  return {
    ...game,
    mortgaged: withoutKeys(game.mortgaged, (k) => k === id),
    players: replace(game.players, i, { ...me, money: me.money - cost }),
    log: [...game.log, `${me.id} levanta la hipoteca de ${propertyName(id, lots)} por $${cost}.`],
  };
}

/** Construye una mejora en una casa o local del jugador en turno. */
export function build(game: Game, lotId: string, lots: Lot[]): Game {
  const i = game.current;
  const me = game.players[i];
  const lot = lots.find((l) => l.id === lotId);
  if (!lot || !canManage(game) || game.debts.length > 0 || buildCheck(game, i, me.money, lot, lots) !== null) return game;
  const cost = improvementCost(lot.price);
  const level = (game.levels[lotId] ?? 0) + 1;
  return {
    ...game,
    levels: { ...game.levels, [lotId]: level },
    players: replace(game.players, i, { ...me, money: me.money - cost }),
    log: [...game.log, `${me.id} construye la mejora ${level} en ${lot.name} por $${cost}.`],
  };
}

/** Vende una mejora del jugador en turno y recupera la mitad de lo que costó. */
export function sellImprovement(game: Game, lotId: string, lots: Lot[]): Game {
  const i = game.current;
  const lot = lots.find((l) => l.id === lotId);
  if (!lot || !canManage(game) || sellCheck(game, i, lot, lots) !== null) return game;
  const value = improvementSaleValue(lot.price);
  const me = game.players[i];
  return {
    ...game,
    levels: { ...game.levels, [lotId]: (game.levels[lotId] ?? 0) - 1 },
    players: replace(game.players, i, { ...me, money: me.money + value }),
    log: [...game.log, `${me.id} vende una mejora de ${lot.name} y recibe $${value}.`],
  };
}

// --- Deudas -----------------------------------------------------------------

/** Paga las deudas pendientes del jugador en turno (cuando ya le alcanza) y sigue la partida. */
export function payDebts(game: Game): Game {
  if (game.debts.length === 0 || game.players[game.current].money < totalDebt(game)) return game;
  return finishTurn(settle(game, game.current, game.debts));
}

/** El jugador en turno, con deudas, se declara en quiebra. */
export function declareBankruptcy(game: Game): Game {
  if (game.debts.length === 0) return game;
  const creditor = game.debts.find((d) => d.creditor !== null)?.creditor ?? null;
  return endTurn(declareBankrupt(game, game.current, creditor));
}

// --- Intercambios ------------------------------------------------------------

/** Solo se negocia antes de tirar los dados: sin dados, destinos ni compra pendientes. */
const canTrade = (g: Game) =>
  g.winner === null && !g.trade && !g.auction && g.debts.length === 0 && !g.dice && g.options.length === 0 && g.buyOptions.length === 0;

/** ¿Es válida la propuesta con el estado actual (dueños y plata)? */
export function tradeIsValid(g: Game, t: Trade): boolean {
  const { from, to } = t;
  if (from === to || g.bankrupt[from] || g.bankrupt[to]) return false;
  if (t.giveMoney < 0 || t.takeMoney < 0 || !Number.isInteger(t.giveMoney) || !Number.isInteger(t.takeMoney)) return false;
  if (t.giveLots.length + t.takeLots.length + t.giveMoney + t.takeMoney === 0) return false;
  if (t.giveMoney > g.players[from].money || t.takeMoney > g.players[to].money) return false;
  // Las propiedades con mejoras no se intercambian (primero hay que vender las mejoras).
  const clean = (id: string) => (g.levels[id] ?? 0) === 0;
  return t.giveLots.every((id) => g.owners[id] === from && clean(id)) && t.takeLots.every((id) => g.owners[id] === to && clean(id));
}

/** El jugador en turno propone un intercambio. */
export function proposeTrade(game: Game, trade: Trade): Game {
  if (!canTrade(game) || trade.from !== game.current || !tradeIsValid(game, trade)) return game;
  return { ...game, trade };
}

/** El otro jugador acepta: se mueven lotes y plata. */
export function acceptTrade(game: Game): Game {
  const t = game.trade;
  if (!t || !tradeIsValid(game, t)) return rejectTrade(game);
  const owners = { ...game.owners };
  for (const id of t.giveLots) owners[id] = t.to;
  for (const id of t.takeLots) owners[id] = t.from;
  const players = game.players.map((p, k) => {
    if (k !== t.from && k !== t.to) return p;
    const mine = k === t.from;
    const lotsOut = mine ? t.giveLots : t.takeLots;
    const lotsIn = mine ? t.takeLots : t.giveLots;
    const delta = mine ? t.takeMoney - t.giveMoney : t.giveMoney - t.takeMoney;
    return { ...p, money: p.money + delta, ownedLotIds: [...p.ownedLotIds.filter((id) => !lotsOut.includes(id)), ...lotsIn] };
  });
  return { ...game, owners, players, trade: null, log: [...game.log, `${players[t.from].id} y ${players[t.to].id} cierran un intercambio (${t.giveLots.length} lotes y $${t.giveMoney} por ${t.takeLots.length} lotes y $${t.takeMoney}).`] };
}

/** El otro jugador rechaza (o el proponente retira la oferta). */
export function rejectTrade(game: Game): Game {
  const t = game.trade;
  if (!t) return game;
  return { ...game, trade: null, log: [...game.log, `${game.players[t.to].id} rechaza el intercambio de ${game.players[t.from].id}.`] };
}
