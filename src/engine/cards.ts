import type { Board } from './board';
import type { PlacedLandmark } from './landmarks';

/**
 * Casillas "?" y tarjetas. Al caer en una casilla "?" el jugador saca la siguiente tarjeta del
 * mazo y se ejecuta su acción. El mazo es determinista (semilla), así las partidas se pueden
 * reproducir y probar.
 */

// --- Casillas "?" -----------------------------------------------------------

/**
 * Intersecciones que son casillas "?". Se reparten con un patrón regular sobre las intersecciones
 * de calles enteras, sin tocar las esquinas del tablero ni las intersecciones con un edificio.
 */
export function cardSquaresOf(board: Board, landmarks: PlacedLandmark[]): Set<string> {
  const rows = board.verticalStreets.filter((s) => !s.spanM);
  const cols = board.horizontalStreets.filter((s) => !s.spanM);
  const taken = new Set<string>();
  for (const l of landmarks) {
    if (l.anchor.type === 'intersection') taken.add(`${l.anchor.vertical}/${l.anchor.horizontal}`);
  }
  const out = new Set<string>();
  for (const n of board.intersections) {
    const i = rows.indexOf(n.vertical);
    const j = cols.indexOf(n.horizontal);
    if (i < 0 || j < 0) continue; // calles parciales: no llevan "?"
    const isCorner = (i === 0 || i === rows.length - 1) && (j === 0 || j === cols.length - 1);
    if (isCorner || taken.has(n.id)) continue;
    if ((2 * i + j) % 7 === 3) out.add(n.id);
  }
  return out;
}

// --- Jugador y acciones -----------------------------------------------------

export interface PlayerState {
  id: string;
  money: number;
  /** Intersección donde está. */
  at: string;
  inJail: boolean;
  freeJailCards: number;
  ownedLotIds: string[];
}

/** La cárcel es la esquina de la Corte de Apelaciones (2 Poniente con la Alameda). */
export const JAIL_NODE = '2-poniente/4-norte';

export type CardAction =
  | { type: 'money'; amount: number } // positivo cobra, negativo paga
  | { type: 'moveToLandmark'; landmarkId: string }
  | { type: 'goToJail' }
  | { type: 'freeJailCard' }
  | { type: 'payPerLot'; amount: number }
  | { type: 'collectFromEach'; amount: number };

export interface Card {
  id: string;
  text: string;
  action: CardAction;
}

export const CARDS: Card[] = [
  { id: 'vendimia', text: 'Fiesta de la Vendimia en el Maule: vendes tu vino. Cobra $80.', action: { type: 'money', amount: 80 } },
  { id: 'premio-municipal', text: 'Ganas el Premio Municipal al barrio mejor cuidado. Cobra $120.', action: { type: 'money', amount: 120 } },
  { id: 'devolucion', text: 'Te devuelven impuestos. Cobra $45.', action: { type: 'money', amount: 45 } },
  { id: 'feria', text: 'Vendes empanadas en la feria de la Plaza de Armas. Cobra $30.', action: { type: 'money', amount: 30 } },
  { id: 'multa-1sur', text: 'Multa por estacionar en el Paseo 1 Sur. Paga $20.', action: { type: 'money', amount: -20 } },
  { id: 'caneria', text: 'Se rompió una cañería en tu casa. Paga $60.', action: { type: 'money', amount: -60 } },
  { id: 'mercado', text: 'Compras verduras en el Mercado Central. Paga $25.', action: { type: 'money', amount: -25 } },
  { id: 'matricula', text: 'Matrícula en la Universidad de Talca. Paga $40.', action: { type: 'money', amount: -40 } },
  { id: 'funcion', text: 'El Teatro Regional del Maule te invita a una función. Avanza hasta el Teatro.', action: { type: 'moveToLandmark', landmarkId: 'teatro-regional' } },
  { id: 'paro-micros', text: 'Paro de micros: caminas hasta la Estación de Trenes.', action: { type: 'moveToLandmark', landmarkId: 'estacion' } },
  { id: 'paseo-plaza', text: 'Das un paseo por la Plaza de Armas. Avanza hasta la Plaza.', action: { type: 'moveToLandmark', landmarkId: 'plaza-de-armas' } },
  { id: 'corte', text: 'Te citan a la Corte de Apelaciones. Ve directo a la Cárcel.', action: { type: 'goToJail' } },
  { id: 'indulto', text: 'Un abogado conocido te ayuda. Guarda esta tarjeta: sales libre de la Cárcel.', action: { type: 'freeJailCard' } },
  { id: 'reparaciones', text: 'Reparaciones del barrio: paga $10 por cada lote que tengas.', action: { type: 'payPerLot', amount: 10 } },
  { id: 'cumpleanos', text: 'Es tu cumpleaños: cada jugador te da $10.', action: { type: 'collectFromEach', amount: 10 } },
  { id: 'rifa', text: 'Rifa del Club de Rodeo: cada jugador te da $15.', action: { type: 'collectFromEach', amount: 15 } },
];

/** Intersección a la que se llega al "ir" a un edificio. */
export function landmarkNode(board: Board, landmark: PlacedLandmark): string {
  const a = landmark.anchor;
  if (a.type === 'intersection') return `${a.vertical}/${a.horizontal}`;
  if (a.type === 'block') return `${a.vertical[0]}/${a.horizontal[0]}`;
  const seg = board.segments.find((s) => s.id === a.id);
  if (!seg) throw new Error(`Tramo inexistente: ${a.id}`);
  return seg.from;
}

export interface CardContext {
  board: Board;
  landmarks: PlacedLandmark[];
}

export interface CardResult {
  player: PlayerState;
  others: PlayerState[];
  /** Descripción de lo que pasó, para mostrar. */
  summary: string;
}

/** Ejecuta una tarjeta. No modifica los argumentos: devuelve estados nuevos. */
export function applyCard(card: Card, player: PlayerState, others: PlayerState[], ctx: CardContext): CardResult {
  const a = card.action;
  switch (a.type) {
    case 'money':
      return {
        player: { ...player, money: player.money + a.amount },
        others,
        summary: a.amount >= 0 ? `Cobras $${a.amount}.` : `Pagas $${-a.amount}.`,
      };
    case 'moveToLandmark': {
      const lm = ctx.landmarks.find((l) => l.id === a.landmarkId);
      if (!lm) throw new Error(`Edificio inexistente: ${a.landmarkId}`);
      return { player: { ...player, at: landmarkNode(ctx.board, lm) }, others, summary: `Avanzas hasta ${lm.name}.` };
    }
    case 'goToJail':
      if (player.freeJailCards > 0) {
        return {
          player: { ...player, freeJailCards: player.freeJailCards - 1 },
          others,
          summary: 'Usas tu tarjeta de libertad y te salvas de la Cárcel.',
        };
      }
      return { player: { ...player, at: JAIL_NODE, inJail: true }, others, summary: 'Vas directo a la Cárcel.' };
    case 'freeJailCard':
      return { player: { ...player, freeJailCards: player.freeJailCards + 1 }, others, summary: 'Guardas una tarjeta de libertad.' };
    case 'payPerLot': {
      const total = a.amount * player.ownedLotIds.length;
      return { player: { ...player, money: player.money - total }, others, summary: `Pagas $${total} por ${player.ownedLotIds.length} lotes.` };
    }
    case 'collectFromEach': {
      let collected = 0;
      const newOthers = others.map((o) => {
        const pay = Math.max(0, Math.min(a.amount, o.money));
        collected += pay;
        return { ...o, money: o.money - pay };
      });
      return { player: { ...player, money: player.money + collected }, others: newOthers, summary: `Cobras $${collected} entre los demás jugadores.` };
    }
  }
}

// --- Mazo -------------------------------------------------------------------

export interface Deck {
  seed: number;
  /** Orden de las tarjetas (índices de CARDS). */
  order: number[];
  next: number;
}

/** Generador pseudoaleatorio determinista (mulberry32). */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(seed: number): number[] {
  const rand = rng(seed);
  const order = CARDS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function createDeck(seed: number): Deck {
  return { seed, order: shuffled(seed), next: 0 };
}

/** Saca la siguiente tarjeta. Al agotar el mazo se baraja de nuevo con otra semilla derivada. */
export function drawCard(deck: Deck): { card: Card; deck: Deck } {
  const d = deck.next >= deck.order.length ? { seed: deck.seed + 1, order: shuffled(deck.seed + 1), next: 0 } : deck;
  return { card: CARDS[d.order[d.next]], deck: { ...d, next: d.next + 1 } };
}
