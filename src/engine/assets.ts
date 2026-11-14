import type { Game } from './game';
import type { Lot } from './lots';
import { lotsOfManzana } from './lots';
import {
  MAX_LEVEL,
  improvementCost,
  improvementSaleValue,
  mortgageValue,
  unmortgageCost,
} from './properties';
import { serviceById } from './services';

/** Estado que consultan las reglas de mejoras e hipotecas. */
export type AssetState = Pick<Game, 'owners' | 'mortgaged' | 'levels'>;

/** Precio de un lote o de un servicio. */
export function propertyPrice(id: string, lots: Lot[]): number {
  return serviceById(id)?.price ?? lots.find((l) => l.id === id)?.price ?? 0;
}

/** Nombre de un lote o de un servicio. */
export function propertyName(id: string, lots: Lot[]): string {
  return serviceById(id)?.name ?? lots.find((l) => l.id === id)?.name ?? id;
}

const levelOf = (g: AssetState, id: string) => g.levels[id] ?? 0;

/** Casas y locales de una manzana (los edificios emblemáticos no se mejoran). */
const improvable = (lots: Lot[], manzanaId: string) => lotsOfManzana(lots, manzanaId).filter((l) => l.kind !== 'emblematico');

/**
 * ¿Puede `player` construir una mejora en el lote? Devuelve el motivo si no puede, o null.
 * Reglas: solo casas y locales; hay que tener los 4 sitios de la manzana, ninguno hipotecado; máximo
 * MAX_LEVEL mejoras; se construye parejo (solo en el lote que tiene menos mejoras de la manzana).
 */
export function buildCheck(g: AssetState, player: number, money: number, lot: Lot, lots: Lot[]): string | null {
  if (lot.kind === 'emblematico') return 'Los edificios emblemáticos no se mejoran.';
  if (g.owners[lot.id] !== player) return 'El lote no es tuyo.';
  const manzana = lotsOfManzana(lots, lot.manzanaId);
  if (!manzana.every((l) => g.owners[l.id] === player)) return 'Necesitas los 4 sitios de la manzana.';
  if (manzana.some((l) => g.mortgaged[l.id])) return 'Hay un sitio hipotecado en la manzana.';
  const level = levelOf(g, lot.id);
  if (level >= MAX_LEVEL) return 'Ya tiene todas las mejoras.';
  const lowest = Math.min(...improvable(lots, lot.manzanaId).map((l) => levelOf(g, l.id)));
  if (level > lowest) return 'Construye parejo: primero mejora los otros sitios.';
  if (money < improvementCost(lot.price)) return 'No te alcanza la plata.';
  return null;
}

/** ¿Puede `player` vender una mejora del lote? Devuelve el motivo si no puede, o null. */
export function sellCheck(g: AssetState, player: number, lot: Lot, lots: Lot[]): string | null {
  if (g.owners[lot.id] !== player) return 'El lote no es tuyo.';
  const level = levelOf(g, lot.id);
  if (level <= 0) return 'No tiene mejoras.';
  const highest = Math.max(...improvable(lots, lot.manzanaId).map((l) => levelOf(g, l.id)));
  if (level < highest) return 'Vende parejo: primero las de los otros sitios.';
  return null;
}

/** ¿Puede `player` hipotecar la propiedad? Devuelve el motivo si no puede, o null. */
export function mortgageCheck(g: AssetState, player: number, id: string, lots: Lot[]): string | null {
  if (g.owners[id] !== player) return 'La propiedad no es tuya.';
  if (g.mortgaged[id]) return 'Ya está hipotecada.';
  if (levelOf(g, id) > 0) return 'Primero vende sus mejoras.';
  const lot = lots.find((l) => l.id === id);
  if (lot && improvable(lots, lot.manzanaId).some((l) => levelOf(g, l.id) > 0)) return 'Primero vende las mejoras de la manzana.';
  return null;
}

/** ¿Puede `player` levantar la hipoteca? Devuelve el motivo si no puede, o null. */
export function unmortgageCheck(g: AssetState, player: number, money: number, id: string, lots: Lot[]): string | null {
  if (g.owners[id] !== player) return 'La propiedad no es tuya.';
  if (!g.mortgaged[id]) return 'No está hipotecada.';
  if (money < unmortgageCost(propertyPrice(id, lots))) return 'No te alcanza la plata.';
  return null;
}

/** Plata que `player` podría juntar vendiendo todas sus mejoras e hipotecando todo lo que tiene. */
export function raisable(g: AssetState, player: number, lots: Lot[]): number {
  let total = 0;
  for (const [id, owner] of Object.entries(g.owners)) {
    if (owner !== player) continue;
    const price = propertyPrice(id, lots);
    total += levelOf(g, id) * improvementSaleValue(price);
    if (!g.mortgaged[id]) total += mortgageValue(price);
  }
  return total;
}
