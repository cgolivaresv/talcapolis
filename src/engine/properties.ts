/**
 * Qué se compra en Talcapolis (las calles NO se compran): lotes de tres tipos, agrupados por barrio.
 *   - casa y local comercial: los sitios de cada manzana (ver lots.ts); el local cuesta el doble.
 *   - edificio emblemático: precio fijo y arriendo que crece al reunir de la misma clase.
 * Quien reúna todos los lotes de un barrio obtiene el barrio.
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
 * Arriendo de un edificio emblemático, como fracción de su precio. Es alto porque el tablero tiene
 * muchas casillas (215) y cada lote se pisa pocas veces por partida: con estos valores un lote se
 * paga solo en unas 35 rondas (calibrado con src/engine/simulate.ts).
 */
export const LANDMARK_RENT_RATE = 2.4;

/**
 * Arriendo de un edificio: una fracción de su precio, que se duplica por cada otro edificio de la
 * misma clase que tenga el mismo dueño (como los ferrocarriles del Monopoly).
 */
export function landmarkRentOf(id: string, ownedOfSameKind = 1): number {
  const base = Math.round(LANDMARK_INFO[id].price * LANDMARK_RENT_RATE);
  return base * 2 ** Math.max(0, ownedOfSameKind - 1);
}

// --- Arriendo de casas y locales -------------------------------------------

/** Arriendo de una casa o un local, como fracción de su precio (ver la nota de LANDMARK_RENT_RATE). */
export const LOT_RENT_RATE = 3;

/** Arriendo = fracción del precio (mínimo $2). El local comercial paga más porque cuesta el doble. */
export function baseRentOfLot(price: number): number {
  return Math.max(2, Math.round(price * LOT_RENT_RATE));
}

/** Factor si el dueño tiene los 4 sitios de la manzana. */
export const MANZANA_COMPLETE_FACTOR = 1.5;
/** Factor si el dueño tiene todo el barrio (se acumula con el de la manzana). */
export const BARRIO_COMPLETE_FACTOR = 2;

export function lotRent(price: number, opts: { ownsManzana?: boolean; ownsBarrio?: boolean } = {}): number {
  const factor = (opts.ownsManzana ? MANZANA_COMPLETE_FACTOR : 1) * (opts.ownsBarrio ? BARRIO_COMPLETE_FACTOR : 1);
  return Math.round(baseRentOfLot(price) * factor);
}

// --- Mejoras e hipotecas ----------------------------------------------------

/** Máximo de mejoras que puede tener una casa o un local. */
export const MAX_LEVEL = 3;
/** Cuánto cuesta cada mejora, como fracción del precio del lote. */
export const BUILD_COST_RATE = 0.5;
/** Qué fracción de lo gastado se recupera al vender una mejora. */
export const SELL_IMPROVEMENT_RATE = 0.5;
/** Multiplicador del arriendo según las mejoras del lote (0 a MAX_LEVEL). */
export const LEVEL_RENT: readonly number[] = [1, 1.6, 2.4, 3.5];
/** Lo que se recibe al hipotecar, como fracción del precio. */
export const MORTGAGE_RATE = 0.3;
/** Recargo al levantar una hipoteca. */
export const UNMORTGAGE_INTEREST = 0.1;

export const improvementCost = (price: number) => Math.round(price * BUILD_COST_RATE);
export const improvementSaleValue = (price: number) => Math.round(improvementCost(price) * SELL_IMPROVEMENT_RATE);
export const mortgageValue = (price: number) => Math.round(price * MORTGAGE_RATE);
export const unmortgageCost = (price: number) => Math.round(mortgageValue(price) * (1 + UNMORTGAGE_INTEREST));
