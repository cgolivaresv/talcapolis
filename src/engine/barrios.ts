/**
 * Barrios de Talcapolis. Cada barrio tiene un color y agrupa lotes (manzanas y edificios
 * emblemáticos). Quien reúna todos los lotes de un barrio "obtiene el barrio" y puede construir.
 *
 * El tablero se divide en 8 zonas: 4 franjas de 3 manzanas de alto (de Poniente a Oriente) por
 * 2 zonas de ancho (la mitad sur y la mitad norte). Los nombres son provisorios.
 */
export interface Barrio {
  id: number;
  name: string;
  /** Precio de compra de una manzana de este barrio. */
  manzanaPrice: number;
  /** Costo de construir una casa (o el local comercial) en este barrio. */
  buildCost: number;
}

export const BARRIOS: Barrio[] = [
  { id: 0, name: 'Barrio Plaza', manzanaPrice: 60, buildCost: 50 },
  { id: 1, name: 'Barrio Alameda Poniente', manzanaPrice: 100, buildCost: 50 },
  { id: 2, name: 'Barrio Mercado', manzanaPrice: 140, buildCost: 100 },
  { id: 3, name: 'Barrio Norte', manzanaPrice: 180, buildCost: 100 },
  { id: 4, name: 'Barrio Serrano', manzanaPrice: 220, buildCost: 150 },
  { id: 5, name: 'Barrio Alameda Oriente', manzanaPrice: 260, buildCost: 150 },
  { id: 6, name: 'Barrio Estación', manzanaPrice: 300, buildCost: 200 },
  { id: 7, name: 'Barrio CREA', manzanaPrice: 350, buildCost: 200 },
];

const ROWS_PER_BAND = 3;
/** Columnas (de Sur a Norte) que pertenecen a la zona sur de cada franja. */
const SOUTH_COLUMNS = 2;

/** Barrio de una manzana, dada su celda (índices entre calles enteras: fila Poniente→Oriente, columna Sur→Norte). */
export function barrioOfCell(row: number, col: number): number {
  const band = Math.min(Math.floor(row / ROWS_PER_BAND), BARRIOS.length / 2 - 1);
  return band * 2 + (col < SOUTH_COLUMNS ? 0 : 1);
}
