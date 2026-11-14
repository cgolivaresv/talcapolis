import type { Board, Segment } from './board';
import trafficData from '../data/talca-traffic.json';

/**
 * Sentido del tránsito vehicular de cada tramo (datos de OpenStreetMap, ODbL; ver
 * scripts/build-talca-data.mjs).
 *   both     = doble sentido (o doble calzada, o calle peatonal)
 *   forward  = solo de `segment.from` a `segment.to`
 *   backward = solo de `segment.to` a `segment.from`
 */
export type Direction = 'both' | 'forward' | 'backward';

const DIRECTIONS = trafficData.directions as Record<string, Direction>;

/** Sentido de un tramo. Sin dato => doble sentido. */
export function directionOf(segment: Pick<Segment, 'id'>): Direction {
  return DIRECTIONS[segment.id] ?? 'both';
}

/** ¿Se puede entrar al tramo desde la intersección `fromId` respetando el sentido? */
export function canEnter(segment: Segment, fromId: string): boolean {
  const dir = directionOf(segment);
  if (dir === 'both') return fromId === segment.from || fromId === segment.to;
  return fromId === (dir === 'forward' ? segment.from : segment.to);
}

export interface Move {
  segment: Segment;
  /** Intersección a la que se llega. */
  to: string;
}

/**
 * Movimientos legales al salir de una intersección: un tramo por cada calle que sale de ella
 * y permite circular en ese sentido. Base para las decisiones de dado.
 */
export function legalMoves(board: Board, intersectionId: string): Move[] {
  const moves: Move[] = [];
  for (const segment of board.segments) {
    if (!canEnter(segment, intersectionId)) continue;
    moves.push({ segment, to: intersectionId === segment.from ? segment.to : segment.from });
  }
  return moves;
}
