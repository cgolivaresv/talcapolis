import { JAIL_NODE } from './cards';
import { GO_TO_JAIL_NODE, START_NODE } from './movement';

/**
 * Casillas de acción: todas las intersecciones. En ellas no se compra ni se paga arriendo;
 * lo que pasa depende del tipo de casilla.
 *   card        casilla "?": se saca una tarjeta
 *   random      acción aleatoria (por definir; ver RANDOM_ACTIONS)
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

/**
 * Acciones aleatorias de las casillas de acción que no son "?". Todavía no hay ninguna definida:
 * mientras la lista esté vacía, esas casillas no tienen efecto. Para agregar una basta con sumar
 * un elemento aquí; se elige con la semilla de la partida, así que es determinista.
 */
export interface RandomAction {
  id: string;
  text: string;
  /** Cambio de dinero del jugador (positivo cobra, negativo paga). */
  money: number;
}

export const RANDOM_ACTIONS: RandomAction[] = [];
