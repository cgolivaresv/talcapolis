import { BARRIOS } from './barrios';

/**
 * Qué se compra en Talcapolis (las calles NO se compran):
 *   1. Manzanas: una casa por manzana, ampliable hasta local comercial.
 *   2. Edificios emblemáticos: precio fijo y arriendo que crece al reunir de la misma clase.
 * Los lotes se agrupan por color en barrios (ver barrios.ts y lots.ts).
 */

// --- Edificios emblemáticos -------------------------------------------------

export type LandmarkKind = 'plaza' | 'iglesia' | 'educacion' | 'cultura' | 'gobierno' | 'comercio' | 'transporte';

export const LANDMARK_KIND_LABEL: Record<LandmarkKind, string> = {
  plaza: 'Plaza',
  iglesia: 'Iglesia',
  educacion: 'Educación',
  cultura: 'Cultura',
  gobierno: 'Gobierno y justicia',
  comercio: 'Comercio',
  transporte: 'Transporte',
};

/** Clase y precio de cada edificio, por id (ver landmarks.ts). */
export const LANDMARK_INFO: Record<string, { kind: LandmarkKind; price: number }> = {
  'plaza-de-armas': { kind: 'plaza', price: 250 },
  catedral: { kind: 'iglesia', price: 250 },
  'u-talca-casa-central': { kind: 'educacion', price: 250 },
  intendencia: { kind: 'gobierno', price: 200 },
  'edificio-ohiggins': { kind: 'comercio', price: 200 },
  'casa-independencia': { kind: 'cultura', price: 200 },
  'escuelas-concentradas': { kind: 'educacion', price: 150 },
  'mercado-central': { kind: 'comercio', price: 200 },
  'santuario-maria-auxiliadora': { kind: 'iglesia', price: 150 },
  'iglesia-corazon-de-maria': { kind: 'iglesia', price: 150 },
  'teatro-regional': { kind: 'cultura', price: 250 },
  'corte-apelaciones': { kind: 'gobierno', price: 200 },
  'liceo-la-salle': { kind: 'educacion', price: 150 },
  'liceo-abate-molina': { kind: 'educacion', price: 150 },
  'liceo-marta-donoso': { kind: 'educacion', price: 150 },
  'extension-utalca': { kind: 'cultura', price: 150 },
  'extension-ucm': { kind: 'cultura', price: 150 },
  'mercado-provisorio': { kind: 'comercio', price: 150 },
  estacion: { kind: 'transporte', price: 250 },
};

export function landmarkPriceOf(id: string): number {
  return LANDMARK_INFO[id].price;
}

/**
 * Arriendo de un edificio: 10% del precio, y se duplica por cada otro edificio de la misma
 * clase que tenga el mismo dueño (como los ferrocarriles del Monopoly).
 */
export function landmarkRentOf(id: string, ownedOfSameKind = 1): number {
  const base = Math.round(LANDMARK_INFO[id].price / 10);
  return base * 2 ** Math.max(0, ownedOfSameKind - 1);
}

// --- Casas y locales comerciales en las manzanas ---------------------------

/** 0 = sin construir; 1 a 4 = casas; 5 = local comercial (reemplaza a las 4 casas). */
export const MAX_BUILDING_LEVEL = 5;
export const BUILDING_LEVEL_NAME = ['Sin construir', '1 casa', '2 casas', '3 casas', '4 casas', 'Local comercial'] as const;

/** Arriendo = arriendo base de la manzana × este factor, según el nivel. */
const RENT_FACTOR = [1, 5, 15, 45, 80, 125] as const;
/** Si el dueño tiene todo el barrio y la manzana no tiene construcción, el arriendo base se duplica. */
export const BARRIO_COMPLETE_FACTOR = 2;

/** Costo de construir un nivel (una casa, o el local comercial) en un barrio. */
export function buildCostOf(barrio: number): number {
  return BARRIOS[barrio].buildCost;
}

/** Arriendo base de una manzana: ~3% de su precio (mínimo $2), como en el Monopoly clásico. */
export function baseRentOfManzana(price: number): number {
  return Math.max(2, Math.round(price / 30));
}

export function manzanaRentAtLevel(price: number, level: number, ownsBarrio = false): number {
  if (!Number.isInteger(level) || level < 0 || level > MAX_BUILDING_LEVEL) {
    throw new Error(`Nivel de construcción inválido: ${level}`);
  }
  const bonus = level === 0 && ownsBarrio ? BARRIO_COMPLETE_FACTOR : 1;
  return baseRentOfManzana(price) * RENT_FACTOR[level] * bonus;
}
