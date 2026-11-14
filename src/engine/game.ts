import type { Board } from './board';
import { JAIL_NODE, applyCard, createDeck, drawCard, type CardContext, type Deck, type PlayerState } from './cards';
import { lotsAround, rentsDue, type Owners } from './economy';
import type { Lot } from './lots';
import { GO_TO_JAIL_NODE, START_BONUS, START_NODE, destinations, rollDice, type Destination } from './movement';

/** Fianza para salir de la Cárcel tras 3 turnos sin sacar dobles. */
export const JAIL_FINE = 50;
export const STARTING_MONEY = 1500;

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
  /** Dueño de cada lote comprado. */
  owners: Owners;
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

export function newGame(names: string[], seed: number): Game {
  return {
    players: names.map((id) => ({ id, money: STARTING_MONEY, at: START_NODE, inJail: false, freeJailCards: 0, ownedLotIds: [] })),
    current: 0,
    deck: createDeck(seed),
    seed,
    dice: null,
    options: [],
    cameFrom: names.map(() => null),
    jailTurns: names.map(() => 0),
    owners: {},
    buyOptions: [],
    rollAgain: false,
    bankrupt: names.map(() => false),
    trade: null,
    winner: null,
    log: ['Comienza la partida. Todos parten en la SALIDA (Estación).'],
  };
}

const replace = <T>(list: T[], i: number, v: T) => list.map((x, k) => (k === i ? v : x));

/** Pasa el turno al siguiente jugador que no haya quebrado. */
function endTurn(g: Game): Game {
  const n = g.players.length;
  let next = g.current;
  do next = (next + 1) % n;
  while (g.bankrupt[next] && next !== g.current);
  return { ...g, current: next, dice: null, options: [], buyOptions: [], rollAgain: false };
}

/** Termina el turno actual, o repite si salieron dobles. */
function finishTurn(g: Game): Game {
  if (g.rollAgain && !g.bankrupt[g.current] && !g.players[g.current].inJail) {
    return { ...g, dice: null, options: [], buyOptions: [], rollAgain: false, log: [...g.log, `${g.players[g.current].id} tira de nuevo por los dobles.`] };
  }
  return endTurn(g);
}

/** Quiebra: el jugador pierde sus lotes (quedan a la venta de nuevo) y sale de la partida. */
function declareBankrupt(g: Game, i: number): Game {
  const owners = Object.fromEntries(Object.entries(g.owners).filter(([, o]) => o !== i));
  const bankrupt = replace(g.bankrupt, i, true);
  const players = replace(g.players, i, { ...g.players[i], money: 0, ownedLotIds: [] });
  const alive = bankrupt.map((b, k) => (b ? -1 : k)).filter((k) => k >= 0);
  const log = [...g.log, `${g.players[i].id} quiebra y sale de la partida.`];
  if (alive.length === 1) log.push(`¡${g.players[alive[0]].id} gana Talcapolis!`);
  return { ...g, owners, bankrupt, players, winner: alive.length === 1 ? alive[0] : null, log };
}

/** Tira los dados del jugador en turno y calcula a dónde puede llegar. */
export function roll(game: Game, board: Board): Game {
  if (game.winner !== null || game.trade || game.options.length > 0 || game.dice || game.buyOptions.length > 0) return game;
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
      me = { ...me, inJail: false, money: me.money - JAIL_FINE };
      g = { ...g, log: [...g.log, `${me.id} paga $${JAIL_FINE} de fianza y sale de la Cárcel.`] };
    } else {
      g = { ...g, players: replace(g.players, i, me), jailTurns: replace(jailTurns, i, jailTurns[i] + 1) };
      return endTurn({ ...g, log: [...g.log, `${me.id} sigue en la Cárcel.`] });
    }
    jailTurns = replace(jailTurns, i, 0);
    g = { ...g, jailTurns, players: replace(g.players, i, me) };
    if (me.money < 0) return endTurn(declareBankrupt(g, i));
  }

  const options = destinations(board, me.at, dice[0] + dice[1], game.cameFrom[i]);
  if (options.length === 0) return endTurn({ ...g, dice, log: [...g.log, `${me.id} no tiene por dónde avanzar.`] });
  return { ...g, dice, options };
}

export interface GameContext extends CardContext {
  cardSquares: Set<string>;
  lots: Lot[];
}

/** El jugador en turno avanza hasta `node` (uno de los destinos posibles) y se resuelve la casilla. */
export function moveTo(game: Game, node: string, ctx: GameContext): Game {
  const dest = game.options.find((d) => d.node === node);
  if (!dest || game.winner !== null) return game;
  const i = game.current;
  const double = !!game.dice && game.dice[0] === game.dice[1];
  let me: PlayerState = { ...game.players[i], at: node };
  let others = game.players.filter((_, k) => k !== i);
  let deck = game.deck;
  const log = [...game.log];
  let newCameFrom: string | null = dest.path.length >= 2 ? dest.path[dest.path.length - 2] : null;

  if (dest.passedStart) {
    me = { ...me, money: me.money + START_BONUS };
    log.push(`${me.id} pasa por la SALIDA y cobra $${START_BONUS}.`);
  }

  if (node === GO_TO_JAIL_NODE) {
    me = { ...me, at: JAIL_NODE, inJail: true };
    newCameFrom = null;
    log.push(`${me.id} cae en "A la Cárcel" y va preso.`);
  } else if (ctx.cardSquares.has(node)) {
    const drawn = drawCard(deck);
    deck = drawn.deck;
    const res = applyCard(drawn.card, me, others, ctx);
    me = res.player;
    others = res.others;
    log.push(`${me.id} saca una tarjeta: «${drawn.card.text}» ${res.summary}`);
    if (me.at !== node) newCameFrom = null;
  }

  // Arriendos por los lotes ajenos que dan a esta intersección (no se cobra estando preso).
  let owed: ReturnType<typeof rentsDue> = [];
  if (!me.inJail && me.at === node) owed = rentsDue(ctx.board, ctx.lots, game.owners, node, i);
  const credits = new Map<number, number>();
  let money = me.money;
  for (const d of owed) {
    const pay = Math.max(0, Math.min(d.amount, money));
    money -= pay;
    credits.set(d.owner, (credits.get(d.owner) ?? 0) + pay);
    log.push(`${me.id} paga $${d.amount} de arriendo a ${game.players[d.owner].id} por ${d.lot.name}.`);
  }
  const shortfall = owed.reduce((s, d) => s + d.amount, 0) - (me.money - money);
  me = { ...me, money };

  const players = game.players.map((p, k) => {
    if (k === i) return me;
    const base = others.find((o) => o.id === p.id) ?? p;
    return { ...base, money: base.money + (credits.get(k) ?? 0) };
  });
  let g: Game = {
    ...game,
    players,
    deck,
    log,
    cameFrom: replace(game.cameFrom, i, newCameFrom),
    dice: null,
    options: [],
    rollAgain: double && !me.inJail,
  };

  // Sin plata para pagar lo que debe (arriendos o tarjetas): quiebra.
  if (shortfall > 0 || me.money < 0) return endTurn(declareBankrupt(g, i));

  // Lotes libres alrededor que puede comprar donde cayó.
  const buyOptions = me.inJail || me.at !== node
    ? []
    : lotsAround(ctx.board, ctx.lots, node)
        .filter((l) => g.owners[l.id] === undefined && l.price <= me.money)
        .map((l) => l.id);
  if (buyOptions.length > 0) return { ...g, buyOptions };
  return finishTurn(g);
}

/** El jugador en turno compra uno de los lotes ofrecidos. */
export function buy(game: Game, lotId: string, lots: Lot[]): Game {
  if (!game.buyOptions.includes(lotId)) return game;
  const lot = lots.find((l) => l.id === lotId);
  const i = game.current;
  const me = game.players[i];
  if (!lot || lot.price > me.money) return game;
  const g: Game = {
    ...game,
    owners: { ...game.owners, [lotId]: i },
    players: replace(game.players, i, { ...me, money: me.money - lot.price, ownedLotIds: [...me.ownedLotIds, lotId] }),
    log: [...game.log, `${me.id} compra ${lot.name} por $${lot.price}.`],
  };
  return finishTurn(g);
}

/** El jugador en turno decide no comprar nada. */
export function skipBuy(game: Game): Game {
  if (game.buyOptions.length === 0) return game;
  return finishTurn(game);
}

// --- Intercambios ------------------------------------------------------------

/** Solo se negocia antes de tirar los dados: sin dados, destinos ni compra pendientes. */
const canTrade = (g: Game) => g.winner === null && !g.trade && !g.dice && g.options.length === 0 && g.buyOptions.length === 0;

/** ¿Es válida la propuesta con el estado actual (dueños y plata)? */
export function tradeIsValid(g: Game, t: Trade): boolean {
  const { from, to } = t;
  if (from === to || g.bankrupt[from] || g.bankrupt[to]) return false;
  if (t.giveMoney < 0 || t.takeMoney < 0 || !Number.isInteger(t.giveMoney) || !Number.isInteger(t.takeMoney)) return false;
  if (t.giveLots.length + t.takeLots.length + t.giveMoney + t.takeMoney === 0) return false;
  if (t.giveMoney > g.players[from].money || t.takeMoney > g.players[to].money) return false;
  return t.giveLots.every((id) => g.owners[id] === from) && t.takeLots.every((id) => g.owners[id] === to);
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
