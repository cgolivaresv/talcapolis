import type { Segment } from './board';

/** Precio de compra por grupo de color, como en el Monopoly clásico (café a azul oscuro). */
export const GROUP_PRICES = [60, 100, 140, 180, 220, 260, 300, 350] as const;

export function priceOf(segment: Segment): number {
  return GROUP_PRICES[segment.street.group];
}

/** Arriendo base: 10% del precio. */
export function baseRentOf(segment: Segment): number {
  return Math.round(priceOf(segment) / 10);
}
