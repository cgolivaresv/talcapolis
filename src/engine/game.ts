import type { Board } from './board';
import { JAIL_NODE, applyCard, createDeck, drawCard, type CardContext, type Deck, type PlayerState } from './cards';
import { GO_TO_JAIL_NODE, START_BONUS, START_NODE, destinations, rollDice, type Destination } from './movement';

/** Fianza para salir de la Cárcel tras 3 turnos sin sacar dobles. */
export const JAIL_FINE = 50;
export const STARTING_MONEY = 1500;

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
    log: ['Comienza la partida. Todos parten en la SALIDA (Estación).'],
  };
}

const replace = <T>(list: T[], i: number, v: T) => list.map((x, k) => (k === i ? v : x));

/** Pasa el turno al siguiente jugador. */
function endTurn(g: Game): Game {
  return { ...g, current: (g.current + 1) % g.players.length, dice: null, options: [] };
}

/** Tira los dados del jugador en turno y calcula a dónde puede llegar. */
export function roll(game: Game, board: Board): Game {
  if (game.options.length > 0 || game.dice) return game;
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
  }

  const options = destinations(board, me.at, dice[0] + dice[1], game.cameFrom[i]);
  if (options.length === 0) return endTurn({ ...g, dice, log: [...g.log, `${me.id} no tiene por dónde avanzar.`] });
  return { ...g, dice, options };
}

/** El jugador en turno avanza hasta `node` (uno de los destinos posibles) y se resuelve la casilla. */
export function moveTo(game: Game, node: string, ctx: CardContext & { cardSquares: Set<string> }): Game {
  const dest = game.options.find((d) => d.node === node);
  if (!dest) return game;
  const i = game.current;
  const double = !!game.dice && game.dice[0] === game.dice[1];
  let me: PlayerState = { ...game.players[i], at: node };
  let others = game.players.filter((_, k) => k !== i);
  let deck = game.deck;
  const log = [...game.log];
  const cameFrom = dest.path.length >= 2 ? dest.path[dest.path.length - 2] : null;
  let newCameFrom: string | null = cameFrom;

  if (dest.passedStart) {
    me = { ...me, money: me.money + START_BONUS };
    log.push(`${me.id} pasa por la SALIDA y cobra $${START_BONUS}.`);
  }

  let jailed = false;
  if (node === GO_TO_JAIL_NODE) {
    me = { ...me, at: JAIL_NODE, inJail: true };
    newCameFrom = null;
    jailed = true;
    log.push(`${me.id} cae en "A la Cárcel" y va preso.`);
  } else if (ctx.cardSquares.has(node)) {
    const drawn = drawCard(deck);
    deck = drawn.deck;
    const res = applyCard(drawn.card, me, others, ctx);
    me = res.player;
    others = res.others;
    log.push(`${me.id} saca una tarjeta: «${drawn.card.text}» ${res.summary}`);
    if (me.at !== node) newCameFrom = null;
    jailed = me.inJail;
  }

  const players = game.players.map((p, k) => (k === i ? me : (others.find((o) => o.id === p.id) ?? p)));
  const next: Game = { ...game, players, deck, log, cameFrom: replace(game.cameFrom, i, newCameFrom), dice: null, options: [] };
  // Con dobles se vuelve a tirar, salvo que se haya ido preso.
  if (double && !jailed) return { ...next, log: [...log, `${me.id} tira de nuevo por los dobles.`] };
  return endTurn(next);
}
