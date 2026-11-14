import { JAIL_NODE, type CardAction } from './cards';
import { GO_TO_JAIL_NODE, START_NODE } from './movement';

/**
 * Casillas de acción: todas las intersecciones. En ellas no se compra ni se paga arriendo;
 * lo que pasa depende del tipo de casilla.
 *   card        casilla "?": se saca una tarjeta
 *   random      acción aleatoria de la ciudad (ver RANDOM_ACTIONS)
 *   start       SALIDA (Estación): solo se cobra al pasar
 *   free        esquina LIBRE: no pasa nada
 *   jail        CÁRCEL (Corte de Apelaciones): solo de visita
 *   go-to-jail  "A LA CÁRCEL": se va preso
 */
export type NodeAction = 'card' | 'random' | 'start' | 'free' | 'jail' | 'go-to-jail';

/** Esquina "LIBRE": 2 Poniente con 2 Sur. */
export const FREE_NODE = '2-poniente/2-sur';

export function nodeActionOf(nodeId: string, cardSquares: Set<string>): NodeAction {
  if (nodeId === GO_TO_JAIL_NODE) return 'go-to-jail';
  if (nodeId === START_NODE) return 'start';
  if (nodeId === JAIL_NODE) return 'jail';
  if (nodeId === FREE_NODE) return 'free';
  return cardSquares.has(nodeId) ? 'card' : 'random';
}

/** Efecto de una acción aleatoria: los de las tarjetas, más perder el próximo turno o tirar de nuevo. */
export type RandomEffect = CardAction | { type: 'loseTurn' } | { type: 'extraTurn' };

export interface RandomAction {
  id: string;
  text: string;
  effect: RandomEffect;
}

/**
 * Acciones aleatorias de las casillas de acción que no son "?": pequeños eventos de la ciudad.
 * Se elige una con la semilla de la partida, así que es determinista. Para sumar una basta con
 * agregarla aquí.
 */
export const RANDOM_ACTIONS: RandomAction[] = [
  { id: 'feria-alameda', text: 'Feria costumbrista en la Alameda: vendes artesanía.', effect: { type: 'money', amount: 25 } },
  { id: 'concierto-plaza', text: 'Concierto gratuito en la Plaza de Armas: el público te deja propina.', effect: { type: 'money', amount: 15 } },
  { id: 'bache', text: 'Un bache en 5 Oriente revienta un neumático.', effect: { type: 'money', amount: -20 } },
  { id: 'patente', text: 'Te cobran la patente comercial del año.', effect: { type: 'money', amount: -30 } },
  { id: 'helados', text: 'Calor de verano: invitas helados en la Alameda a todos.', effect: { type: 'collectFromEach', amount: 8 } },
  { id: 'corte-luz', text: 'Corte de luz en el barrio: te quedas sin hacer nada.', effect: { type: 'loseTurn' } },
  { id: 'micro', text: 'La micro pasa justo a tiempo: sigues de largo.', effect: { type: 'extraTurn' } },
  { id: 'misa', text: 'Misa de domingo en la Catedral: caminas hasta allí.', effect: { type: 'moveToLandmark', landmarkId: 'catedral' } },
  { id: 'mercado', text: 'Se acabó el pan: caminas hasta el Mercado Central.', effect: { type: 'moveToLandmark', landmarkId: 'mercado-central' } },
  { id: 'reparaciones-vereda', text: 'La municipalidad repara veredas: pagas por cada lote que tengas.', effect: { type: 'payPerLot', amount: 5 } },
];
