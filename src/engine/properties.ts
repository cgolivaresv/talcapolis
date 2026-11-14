import type { Segment } from './board';
import { baseRentOf } from './pricing';

/**
 * Qué se puede comprar en Talcapolis:
 *   1. Calles (tramos): ver pricing.ts.
 *   2. Edificios emblemáticos (landmarks): precio fijo y arriendo que crece al reunir de la misma clase.
 *   3. Casas y locales comerciales: se construyen sobre calles propias.
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

// --- Casas y locales comerciales sobre calles -------------------------------

/** 0 = sin construir; 1 a 4 = casas; 5 = local comercial (reemplaza a las 4 casas). */
export const MAX_BUILDING_LEVEL = 5;
export const BUILDING_LEVEL_NAME = ['Sin construir', '1 casa', '2 casas', '3 casas', '4 casas', 'Local comercial'] as const;

/** Costo de construir un nivel (una casa, o el local comercial), según el grupo de color. */
const BUILD_COST_BY_GROUP = [50, 50, 100, 100, 150, 150, 200, 200] as const;
/** Arriendo = arriendo base de la calle × este factor, según el nivel. */
const RENT_FACTOR = [1, 5, 15, 45, 80, 125] as const;

export function buildCostOf(segment: Pick<Segment, 'street'>): number {
  return BUILD_COST_BY_GROUP[segment.street.group];
}

export function rentAtLevel(segment: Segment, level: number): number {
  if (!Number.isInteger(level) || level < 0 || level > MAX_BUILDING_LEVEL) {
    throw new Error(`Nivel de construcción inválido: ${level}`);
  }
  return baseRentOf(segment) * RENT_FACTOR[level];
}
